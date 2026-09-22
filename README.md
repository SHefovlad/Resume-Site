# Portfolio site

Static portfolio without frameworks.

## Structure

```text
portfolio-site/
├── index.html
├── config.json
├── config.en.json
├── css/
│   └── style.css
├── js/
│   └── app.js
├── projects/
│   ├── ru/
│   │   ├── project-1.json
│   │   ├── project-2.json
│   │   └── project-3.json
│   └── en/
│       ├── project-1.json
│       ├── project-2.json
│       └── project-3.json
└── assets/
    ├── avatar.jpg
    ├── resume.pdf
    └── projects/
```

The image and PDF files are optional. When an image is missing, the site shows a simple placeholder.

## Configuration

`config.json` is the Russian configuration.
`config.en.json` is the English configuration.

The browser language is detected automatically:

- `ru-*` → Russian
- every other language → English

The language switch stores a manual choice in localStorage.

Project paths in the main config are relative to the site root. Image paths inside a project JSON are relative to that project JSON file.

Each project JSON contains:

- `title`
- `description`
- `short`
- `tags`
- `images` — either a path string, or an object `{ "src": "path", "fit": "cover" | "contain" }`. `cover` (default) fills the frame and crops; `contain` fits the whole image inside the frame (for vertical screenshots).
- `details`
- `links` with `label`, `url`, and optional `primary`

The project link buttons are generated directly from `links`.

## Links section

The contacts section at the end of the page is generated from the top-level `links` array, so tiles are added or edited in the config only. The grid adapts to the number of entries.

Each entry contains:

- `icon` — one of `github`, `telegram`, `email`, `flru`, or `link` (generic fallback)
- `label` — small caption above the value
- `value` — bold text shown inside the tile
- `url` — the link target
- `copy` — optional; adds a copy button with this text (omit the field to hide the button)

## PDF resume

The resume PDFs (`assets/resume.pdf` and `assets/resume.en.pdf`) are generated from the same configs as the site:

- `config.json` / `config.en.json`
- `projects/<lang>/*.json` (title, description, tags, links)
- `assets/avatar.*` (photo)

```bash
node tools/resume-pdf/build.mjs                 # ru + en -> dist/
node tools/resume-pdf/build.mjs --compact       # tighter spacing, fits 2 pages
node tools/resume-pdf/build.mjs --lang ru       # only Russian
node tools/resume-pdf/build.mjs --assets        # write straight into assets/
```

Layout lives in `tools/resume-pdf/resume.css` (A4, 2 cm margins, 12 pt body, photo floated right).
Spacing is driven by the `--gap-*` custom properties; `--compact` overrides them.
Printing is done by headless Edge/Chrome, so no npm dependencies are needed.
Set `BROWSER_PATH` if the browser is installed somewhere non-standard.

### Auto-rebuild before commit

```bash
node tools/resume-pdf/build.mjs --install-hook
```

The installed `.git/hooks/pre-commit` script rebuilds `assets/resume*.pdf` and stages them into the same commit whenever `config.json`, `config.en.json`, `projects/`, `assets/avatar.*` or the generator itself changed. Unrelated commits are untouched. The hook builds in the default (non-`--compact`) mode — add `--compact` to `tools/resume-pdf/pre-commit` to ship the 2-page variant. Skip it with `git commit --no-verify`.

## Local testing

Because the page loads JSON through `fetch()`, open it through a local HTTP server instead of `file://`.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.
