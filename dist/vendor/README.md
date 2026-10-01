# Browser PDF dependencies

- pdfjs-dist 5.4.296: `legacy/build/pdf.mjs` and matching `pdf.worker.mjs`, copied from the locked project dependency. Apache-2.0 license in `pdfjs/LICENSE`.
- pdf-lib 1.17.1: official bundled ESM distribution, copied from the Codex workspace runtime. MIT license in `pdf-lib/LICENSE.md`.

Loaded locally and only by the original-PDF itinerary editor. Update PDF.js browser, worker and parser together: text operation IDs are version-dependent. Models carry a SHA-256 of the original PDF; never silently switch a saved model to another file or parser version.
