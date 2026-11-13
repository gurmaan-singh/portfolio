# Portfolio

A one-page static site that presents my software projects. Each project gets a stage with three tabs: a demo
(a live run, a replay of a recorded run, or a figure), the figures from its README, and the exact commands to
run it. No framework, no tracking. The page is `index.html`, `style.css`, `main.js` and the files under `assets/`.

## What the demo tags mean

- **Live**: real code running in the browser. For labyrint that is the library itself, built from its repository
  and copied into `labyrint/`. For cansim it is a small JavaScript version of the arbitration rule written for this
  page, and the tag says so.
- **Replay**: data recorded from a real run of the project (exported from its own scripts, stored in
  `assets/runs/*.json`) drawn on a canvas with a scrubber. Nothing in a replay is animated to look right; it is the
  run.
- **Screenshot** / **Figure**: for projects that need their own server or work on images.

## Editing

The page is generated. Edit `projects.json` (text, numbers, figures, demo and run commands per project), then:

```
python tools/build.py
```

Replay data is inlined into `index.html` by the build so the page also works from a `file://` URL.
To refresh the live labyrint demo: `npm run build` in that repository, then copy `docs/index.html` and
`docs/app.js` into `labyrint/`.

## Run it

Open `index.html`, or serve the folder with anything (`python -m http.server`).

## Publish it

Create a repository named `<username>.github.io`, push this folder to `main`, and turn on Pages with
"GitHub Actions" as the source (Settings, Pages). The workflow in `.github/workflows/pages.yml` deploys the folder as it is.

## Before publishing

- The links point at `github.com/gurmaan-singh/<repo>`. They work once those repositories are pushed.
- The contact section only links to GitHub. Add an email address or LinkedIn link if you want one there.
- The numbers come from the READMEs of the projects. If a project changes, change `projects.json` and rebuild.
