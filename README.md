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
- `images`
- `details`
- `links` with `label`, `url`, and optional `primary`

The project link buttons are generated directly from `links`.

## Local testing

Because the page loads JSON through `fetch()`, open it through a local HTTP server instead of `file://`.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.
