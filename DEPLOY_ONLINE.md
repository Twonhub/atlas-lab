# Publish Atlas Lab as a real website (no Python on your laptop)

This is a **static website** for Chrome/Edge/Firefox. Users need internet access, a capable graphics device, and WebGL. The anatomy dissection viewer is in *our app* rather than an embedded external iframe.

## Deploy via GitHub Pages

1. Create a **new GitHub repository** named `atlas-lab` (public, for GitHub Pages on standard free GitHub accounts).
2. Upload **the files and folders inside this ZIP** to the root of the repository. Preserve the `.github/workflows/deploy.yml` path. For a smooth upload of hidden folders, use GitHub Desktop or `git`, or add the YAML manually at `.github/workflows/deploy.yml`.
3. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
4. In **Actions**, let the workflow named `Deploy Atlas Lab Website` run; if necessary select **Run workflow**.
5. After the workflow succeeds, open `https://YOUR-GITHUB-USERNAME.github.io/atlas-lab/`. The link is an example and does **not** exist until your deployment succeeds.

The Actions workflow (which runs on GitHub infrastructure) downloads seven source GLBs and the upstream license/attribution files at deployment time. It writes a local model manifest and publishes the site. You do not need to install Python on your own laptop.

If your branch is named something other than `main`, modify the branch filter in the workflow or run it manually.

## Alternative static hosts

Drag and drop these files to a static hosting provider. The default manifest pulls models from the original project's CDN, provided that CDN remains available. GitHub Pages deployment is preferred because its build step puts all models on **your** site. The rendering engine is loaded from the official Three.js npm files delivered via jsDelivr in either case.

## What is verified / not verified

- Verified: website package integrity, manifest consistency with the seven systems, referenced source project and licensing terms, JSON cards and lessons, static page/browser UI, and JavaScript parse checks.
- Not end-to-end verified here: remote 3D mesh downloads / actual GLB rendering / external hosting. This runtime cannot reach the mesh binaries, and publishing requires access to your hosting account.
- The curriculum is not certified by a medical school, anatomist, or clinician. Detailed anatomical structures may contain variant geometry or labels.

## Intellectual-property cautions

This is for personal, educational, noncommercial use. See MODEL_LICENSE_AND_ATTRIBUTION.md; the source dataset has noncommercial and share-alike components and notices. Retain all upstream model notices after deployment. Avoid presenting this as a clinically validated atlas.