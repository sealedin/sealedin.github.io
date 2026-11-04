---
purpose: Overview of the SealedIn static site and how it is deployed on GitHub Pages
---

# SealedIn site

Plain static site in `site/`, no build step. Each page has a Markdown twin next to it, and `agents.html` and `agents.md` carry the same text.

Preview: `python3 -m http.server 4173 --directory site`. Page addresses without `.html` work only on GitHub Pages.

Deploy: `.github/workflows/pages.yml` publishes `site/` on push to `main`.

## License

Code: MIT (`LICENSE`). Fonts: SIL OFL 1.1 (`site/assets/fonts/LICENSE.txt`).

Vendored: `site/assets/qrcode.js` is `dist/qrcode.js` of qrcode-generator 2.0.4 from npm, unmodified (https://github.com/kazuhikoarase/qrcode-generator, MIT, `site/assets/qrcode.LICENSE.txt`), SHA-256 `79ec86f82856005b1c887905cfccfcfbec3821ca61c7fd5a952faa5f778f791c`.
