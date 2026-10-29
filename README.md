# ASTA CONSTUCTION · GOGA Dryliner QI

Public, mobile-first demonstration using sample data only. No account is needed. Photos, uploads and changes are kept only in the current browser session. No real email is sent. No company records, credentials or private project history are included.

## Publishing

Settings → Pages → Deploy from a branch → main → /(root) → Save.

The root index.html, assets and public files are ready to serve. Source code is under source/. The private company application is a separate project.

## Rebuild

Node 22.16+ is required.

```sh
npm install
PAGES_BASE_PATH=/asta-qi/ npm run build
```

Build output is site-build/. Copy its contents into the repository root when updating the static demo, keeping .nojekyll and source/. The PDF viewer worker is reproduced during installation.

## Install on mobile

Android: Chrome menu → Install app / Add to Home screen.
iPhone: Safari → Share → Add to Home Screen.

Reloading resets the demo. Do not use this public demonstration for real QA evidence.
