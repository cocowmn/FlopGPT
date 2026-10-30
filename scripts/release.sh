#!/usr/bin/env bash
# Cut a release: bump the version everywhere, tag, push, wait for the build,
# check the draft, then publish it. See docs/RELEASING.md.
#
#   npm run release -- patch|minor|major|X.Y.Z
set -euo pipefail

cd "$(dirname "$0")/.."

die() { echo "error: $*" >&2; exit 1; }
confirm() {
  local reply
  read -r -p "$1 [y/N] " reply
  [[ $reply =~ ^[Yy]$ ]]
}

bump=${1:-}
[[ -n $bump ]] || die "usage: npm run release -- patch|minor|major|X.Y.Z"

# --- Preflight ---------------------------------------------------------------
for cmd in git npm node cargo gh perl; do
  command -v "$cmd" >/dev/null || die "$cmd is not installed"
done
gh auth status >/dev/null 2>&1 || die "gh is not logged in (run: gh auth login)"

[[ $(git branch --show-current) == main ]] || die "not on main"
[[ -z $(git status --porcelain) ]] || die "working tree is not clean"
git fetch --quiet --tags origin
[[ $(git rev-parse HEAD) == $(git rev-parse origin/main) ]] \
  || die "main is not in sync with origin/main"

# --- Bump --------------------------------------------------------------------
# Until the commit lands, undo the bump if anything fails or is declined.
revert() {
  git checkout -- package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock
  echo "Reverted version changes."
}
trap revert ERR

npm version "$bump" --no-git-tag-version >/dev/null
version=$(node -p "require('./package.json').version")
tag="v$version"

if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  revert; die "tag $tag already exists"
fi

# Only the first `version = ` line, which is the one under [package].
perl -0pi -e "s/^version = \"[^\"]*\"/version = \"$version\"/m" src-tauri/Cargo.toml
cargo update --manifest-path src-tauri/Cargo.toml --workspace --offline --quiet

# --- Verify ------------------------------------------------------------------
cargo_version=$(perl -ne 'if (/^version = "([^"]*)"/) { print $1; exit }' src-tauri/Cargo.toml)
lock_version=$(perl -ne '$f = 1 if /^name = "flopgpt"$/; if ($f && /^version = "([^"]*)"/) { print $1; exit }' src-tauri/Cargo.lock)
tauri_version=$(node -p "require('./src-tauri/tauri.conf.json').version")

echo
echo "  package.json      $version"
echo "  Cargo.toml        $cargo_version"
echo "  Cargo.lock        $lock_version"
echo "  tauri.conf.json   $tauri_version"
echo

[[ $cargo_version == "$version" && $lock_version == "$version" ]] \
  || { revert; die "versions don't match"; }
[[ $tauri_version == ../package.json ]] \
  || { revert; die "tauri.conf.json version should be \"../package.json\""; }

git --no-pager diff --stat
echo
if ! confirm "Commit, tag and push $tag?"; then
  revert; exit 1
fi

# --- Commit, tag, push -------------------------------------------------------
git commit --quiet -am "release $tag"
trap - ERR
git tag "$tag"
git push --quiet origin main
git push --quiet origin "$tag"
commit=$(git rev-parse HEAD)

# --- Wait for the build ------------------------------------------------------
echo "Waiting for the release workflow to start..."
run_id=
for _ in $(seq 30); do
  run_id=$(gh run list --workflow release.yml --commit "$commit" --limit 1 \
    --json databaseId --jq '.[0].databaseId // empty')
  [[ -n $run_id ]] && break
  sleep 2
done
[[ -n $run_id ]] || die "no workflow run found for $commit; check the Actions tab"

gh run watch "$run_id" --exit-status || die "the release workflow failed: gh run view $run_id --log-failed"

# --- Check the draft ---------------------------------------------------------
is_draft=$(gh release view "$tag" --json isDraft --jq .isDraft 2>/dev/null) \
  || die "no release for $tag; the build may have attached to another release (gh release list)"
[[ $is_draft == true ]] || die "release $tag exists but is not a draft"

echo
echo "Draft $tag files:"
gh release view "$tag" --json assets --jq '.assets[].name' | sed 's/^/  /'
echo

if confirm "Publish $tag?"; then
  gh release edit "$tag" --draft=false --latest >/dev/null
  echo "Published: $(gh release view "$tag" --json url --jq .url)"
else
  echo "Left as a draft. To publish later:"
  echo "  gh release edit $tag --draft=false --latest"
fi
