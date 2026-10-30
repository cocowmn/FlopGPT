//! HTTPS for the phone server, opt-in: a local certificate authority (like mkcert's, but made by
//! the app) that phones trust once, and a server certificate for this machine's LAN addresses.
//! The CA is limited by name constraints to private addresses and `.local` names, so its key
//! can't be used to impersonate real sites even if it leaks.

use std::net::{IpAddr, Ipv4Addr};
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

use rcgen::{
    BasicConstraints, CertificateParams, CidrSubnet, DistinguishedName, DnType, ExtendedKeyUsagePurpose,
    GeneralSubtree, IsCa, Issuer, KeyPair, KeyUsagePurpose, NameConstraints, SanType,
};
use rustls::pki_types::pem::PemObject;
use rustls::pki_types::{CertificateDer, PrivateKeyDer, PrivatePkcs8KeyDer};
use rustls::server::{ClientHello, ResolvesServerCert};
use rustls::sign::CertifiedKey;
use time::{Duration, OffsetDateTime};

const CA_DAYS: i64 = 3650;
const LEAF_DAYS: i64 = 825; // the most iOS accepts for a server certificate

/// The app's CA, kept as `ca.pem` and `ca-key.pem` in `dir`.
pub struct Ca {
    der: CertificateDer<'static>,
    pem: String,
    issuer: Issuer<'static, KeyPair>,
}

impl Ca {
    /// Loads the CA saved in `dir`, or makes and saves a new one.
    pub fn load_or_create(dir: &Path) -> Result<Self, String> {
        let (cert, key) = paths(dir);
        if let (Ok(cert_pem), Ok(key_pem)) = (std::fs::read_to_string(&cert), std::fs::read_to_string(&key)) {
            let pair = KeyPair::from_pem(&key_pem).map_err(|e| format!("Couldn't read the CA key: {e}"))?;
            let der = CertificateDer::from_pem_slice(cert_pem.as_bytes())
                .map_err(|e| format!("Couldn't read the CA certificate: {e}"))?;
            let issuer = Issuer::from_ca_cert_der(&der, pair).map_err(|e| e.to_string())?;
            return Ok(Self {
                der,
                pem: cert_pem,
                issuer,
            });
        }
        let ca = Self::generate()?;
        ca.save(dir)?;
        Ok(ca)
    }

    /// Deletes the saved CA, so the next `load_or_create` makes a new one.
    pub fn remove(dir: &Path) -> Result<(), String> {
        for p in <[PathBuf; 2]>::from(paths(dir)) {
            match std::fs::remove_file(p) {
                Err(e) if e.kind() != std::io::ErrorKind::NotFound => return Err(e.to_string()),
                _ => {}
            }
        }
        Ok(())
    }

    fn generate() -> Result<Self, String> {
        let pair = KeyPair::generate().map_err(|e| e.to_string())?;
        let mut params = CertificateParams::default();
        let mut name = DistinguishedName::new();
        name.push(DnType::OrganizationName, "FlopGPT");
        name.push(
            DnType::CommonName,
            format!("FlopGPT Local CA ({})", host_label().unwrap_or("this computer".into())),
        );
        params.distinguished_name = name;
        params.is_ca = IsCa::Ca(BasicConstraints::Constrained(0));
        params.key_usages = vec![KeyUsagePurpose::KeyCertSign, KeyUsagePurpose::CrlSign];
        params.name_constraints = Some(NameConstraints {
            permitted_subtrees: vec![
                GeneralSubtree::IpAddress(CidrSubnet::from_v4_prefix([10, 0, 0, 0], 8)),
                GeneralSubtree::IpAddress(CidrSubnet::from_v4_prefix([172, 16, 0, 0], 12)),
                GeneralSubtree::IpAddress(CidrSubnet::from_v4_prefix([192, 168, 0, 0], 16)),
                GeneralSubtree::IpAddress(CidrSubnet::from_v4_prefix([127, 0, 0, 0], 8)),
                GeneralSubtree::DnsName("localhost".into()),
                GeneralSubtree::DnsName("local".into()),
            ],
            excluded_subtrees: vec![],
        });
        let now = OffsetDateTime::now_utc();
        params.not_before = now - Duration::days(1);
        params.not_after = now + Duration::days(CA_DAYS);
        let cert = params.self_signed(&pair).map_err(|e| e.to_string())?;
        Ok(Self {
            der: cert.der().clone(),
            pem: cert.pem(),
            issuer: Issuer::new(params, pair),
        })
    }

    fn save(&self, dir: &Path) -> Result<(), String> {
        let (cert, key) = paths(dir);
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        std::fs::write(&cert, &self.pem).map_err(|e| e.to_string())?;
        write_private(&key, &self.issuer.key().serialize_pem()).map_err(|e| e.to_string())
    }

    /// The CA certificate, for phones to download and trust.
    pub fn der(&self) -> &[u8] {
        &self.der
    }

    /// A server certificate for `ips` (plus localhost and this computer's `.local` name).
    pub fn issue(&self, ips: &[IpAddr]) -> Result<Arc<CertifiedKey>, String> {
        let pair = KeyPair::generate().map_err(|e| e.to_string())?;
        let mut params = CertificateParams::default();
        let mut name = DistinguishedName::new();
        name.push(DnType::CommonName, "FlopGPT phone server");
        params.distinguished_name = name;
        let mut sans: Vec<SanType> = ips.iter().map(|ip| SanType::IpAddress(*ip)).collect();
        sans.push(SanType::IpAddress(IpAddr::V4(Ipv4Addr::LOCALHOST)));
        sans.push(SanType::DnsName("localhost".try_into().unwrap()));
        if let Some(host) = host_label().and_then(|h| format!("{h}.local").try_into().ok()) {
            sans.push(SanType::DnsName(host));
        }
        params.subject_alt_names = sans;
        params.key_usages = vec![KeyUsagePurpose::DigitalSignature];
        params.extended_key_usages = vec![ExtendedKeyUsagePurpose::ServerAuth];
        params.use_authority_key_identifier_extension = true;
        let now = OffsetDateTime::now_utc();
        params.not_before = now - Duration::days(1);
        params.not_after = params.not_before + Duration::days(LEAF_DAYS); // iOS counts from not_before
        let cert = params.signed_by(&pair, &self.issuer).map_err(|e| e.to_string())?;
        let key = PrivateKeyDer::Pkcs8(PrivatePkcs8KeyDer::from(pair.serialize_der()));
        let signer = rustls::crypto::ring::sign::any_supported_type(&key).map_err(|e| e.to_string())?;
        Ok(Arc::new(CertifiedKey::new(vec![cert.der().clone()], signer)))
    }
}

/// Hands rustls the current server certificate, which can be swapped while the server runs.
#[derive(Debug)]
pub struct Resolver(RwLock<Arc<CertifiedKey>>);

impl Resolver {
    pub fn new(key: Arc<CertifiedKey>) -> Self {
        Self(RwLock::new(key))
    }

    pub fn set(&self, key: Arc<CertifiedKey>) {
        *self.0.write().unwrap() = key;
    }
}

impl ResolvesServerCert for Resolver {
    fn resolve(&self, _: ClientHello<'_>) -> Option<Arc<CertifiedKey>> {
        Some(self.0.read().unwrap().clone())
    }
}

pub fn server_config(resolver: Arc<Resolver>) -> Arc<rustls::ServerConfig> {
    let mut config = rustls::ServerConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
        .with_safe_default_protocol_versions()
        .expect("ring supports the default TLS versions")
        .with_no_client_auth()
        .with_cert_resolver(resolver);
    config.alpn_protocols = vec![b"h2".to_vec(), b"http/1.1".to_vec()];
    Arc::new(config)
}

fn paths(dir: &Path) -> (PathBuf, PathBuf) {
    (dir.join("ca.pem"), dir.join("ca-key.pem"))
}

/// This computer's name as a DNS label (e.g. "coals-macbook-pro"), if it has a usable one.
fn host_label() -> Option<String> {
    let name = gethostname::gethostname().to_string_lossy().to_lowercase();
    let label = name.trim_end_matches(".local").split('.').next()?.to_string();
    let ok = !label.is_empty()
        && label.len() <= 63
        && label.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
        && !label.starts_with('-')
        && !label.ends_with('-');
    ok.then_some(label)
}

#[cfg(unix)]
fn write_private(path: &Path, data: &str) -> std::io::Result<()> {
    use std::io::Write;
    use std::os::unix::fs::OpenOptionsExt;
    let mut f = std::fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .mode(0o600)
        .open(path)?;
    f.write_all(data.as_bytes())
}

#[cfg(not(unix))]
fn write_private(path: &Path, data: &str) -> std::io::Result<()> {
    std::fs::write(path, data)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rustls::client::danger::ServerCertVerifier;
    use rustls::client::WebPkiServerVerifier;
    use rustls::pki_types::{ServerName, UnixTime};

    fn verify(ca: &Ca, leaf: &CertifiedKey, name: &str) -> Result<(), rustls::Error> {
        let mut roots = rustls::RootCertStore::empty();
        roots.add(ca.der.clone()).unwrap();
        let provider = Arc::new(rustls::crypto::ring::default_provider());
        let verifier = WebPkiServerVerifier::builder_with_provider(Arc::new(roots), provider)
            .build()
            .unwrap();
        let name = ServerName::try_from(name.to_string()).unwrap();
        verifier
            .verify_server_cert(&leaf.cert[0], &[], &name, &[], UnixTime::now())
            .map(|_| ())
    }

    #[test]
    fn leaf_chains_to_ca_for_lan_names() {
        let ca = Ca::generate().unwrap();
        let leaf = ca.issue(&["192.168.1.20".parse().unwrap()]).unwrap();
        verify(&ca, &leaf, "192.168.1.20").unwrap();
        verify(&ca, &leaf, "127.0.0.1").unwrap();
        verify(&ca, &leaf, "localhost").unwrap();
        assert!(verify(&ca, &leaf, "192.168.1.21").is_err());
    }

    #[test]
    fn name_constraints_reject_public_names() {
        let ca = Ca::generate().unwrap();
        let leaf = ca.issue(&["8.8.8.8".parse().unwrap()]).unwrap();
        assert!(verify(&ca, &leaf, "8.8.8.8").is_err());
    }

    #[test]
    fn saved_ca_loads_back() {
        let dir = std::env::temp_dir().join(format!("flopgpt-tls-test-{}", std::process::id()));
        let made = Ca::load_or_create(&dir).unwrap();
        let loaded = Ca::load_or_create(&dir).unwrap();
        assert_eq!(made.der(), loaded.der());
        let leaf = loaded.issue(&["10.0.0.5".parse().unwrap()]).unwrap();
        verify(&made, &leaf, "10.0.0.5").unwrap();
        Ca::remove(&dir).unwrap();
        assert!(!dir.join("ca.pem").exists());
        let _ = std::fs::remove_dir(&dir);
    }
}
