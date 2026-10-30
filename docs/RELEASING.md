# Releasing

Pushing a `v*` tag runs `.github/workflows/release.yml`, which builds every platform and attaches the bundles to a **draft** GitHub release. You then publish the draft.

## The quick way

```sh
npm run release -- patch    # or minor, major, or an exact version like 0.2.0
```

`scripts/release.sh` runs every step below. It checks that you're on a clean `main` that's in sync with GitHub, bumps all the version files, and shows them so you can confirm. Then it commits, tags, pushes and waits for the build. Once the draft is ready, it lists the draft's files and asks before publishing. If you decline or something fails before the commit, it undoes the version changes.

The manual steps are below for reference, or for finishing a release by hand if the script stops partway.

## Where the version lives

Tauri names the release from the version in `src-tauri/tauri.conf.json`, which is set to `"../package.json"`, so it always matches `package.json`. The remaining files that store the version:

| File | Updated by |
|---|---|
| `package.json` | `npm version` (this is the one that names the release) |
| `package-lock.json` | `npm version` |
| `src-tauri/Cargo.toml` | by hand |
| `src-tauri/Cargo.lock` | `cargo` (refreshes after the `Cargo.toml` edit) |

## Every release

Example for **0.1.1**:

1. **Start from a clean, up-to-date `main`:**

   ```sh
   git checkout main && git pull && git status
   ```

2. **Update `package.json` and `package-lock.json`:**

   ```sh
   npm version 0.1.1 --no-git-tag-version
   ```

   You can use `patch`, `minor` or `major` instead of a number.

3. **Update the Rust side:**

   - In `src-tauri/Cargo.toml`, set `version = "0.1.1"`.
   - Refresh `Cargo.lock`:

     ```sh
     cargo check --manifest-path src-tauri/Cargo.toml
     ```

4. **Check that the versions match:**

   ```sh
   grep -n '"version"' package.json; grep -n '^version' src-tauri/Cargo.toml
   ```

5. **Commit, tag and push:**

   ```sh
   git commit -am "release v0.1.1"
   git tag v0.1.1
   git push && git push origin v0.1.1
   ```

   The tag must match the version exactly, with a `v` in front.

6. **Wait for the workflow** (about 6 minutes):

   ```sh
   gh run watch
   ```

7. **Check the draft:** `gh release list` should show **FlopGPT v0.1.1** as a *Draft*, with 10 files named like `FlopGPT_0.1.1_macOS-Apple-Silicon.dmg`. Its notes start with a "Which file do I download?" table, followed by notes GitHub generates from the commits (both set in the workflow). If the files say an older version, or there's no draft, a version was missed in step 2 or 3. Stop and fix it before publishing.

8. **Publish:**

   ```sh
   gh release edit v0.1.1 --draft=false --latest
   ```

   You can also do this on GitHub: go to Releases, click the pencil icon on the draft, then click **Publish release**.

## If something goes wrong before publishing

Fix the problem, commit, then move the tag to the fix and push it again:

```sh
git tag -f v0.1.1 && git push -f origin v0.1.1
```

This reruns the build and replaces the draft's files. If the draft has leftover files you don't want, delete it first with `gh release delete v0.1.1`.
