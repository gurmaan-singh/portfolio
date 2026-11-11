# Portfolio

A one-page static site that presents five projects: [vakt](https://github.com/gurmaan-singh/vakt), [hover](https://github.com/gurmaan-singh/hover), [rudp](https://github.com/gurmaan-singh/rudp), [labyrint](https://github.com/gurmaan-singh/labyrint) and [lägesbild](https://github.com/gurmaan-singh/lagesbild). No framework, no build step, no tracking: `index.html`, `style.css`, `main.js` and images.

`labyrint/` is the built pathfinding visualiser copied from that repository, so the page has a live demo that works without a server.

## Run it

Open `index.html`, or serve the folder with anything (`python -m http.server`).

## Publish it

Create a repository named `<username>.github.io`, push this folder to `main`, and turn on Pages with "GitHub Actions" as the source (Settings, Pages). The workflow in `.github/workflows/pages.yml` deploys the folder as it is.

## Before publishing

- The links point at `github.com/gurmaan-singh/<repo>`. They work once those repositories are pushed.
- The contact section only links to GitHub. Add an email address or LinkedIn link if you want one there.
- The numbers on the cards come from the READMEs of the projects. If a project changes, change the card.
- To refresh the live demo: `npm run build` in labyrint, then copy `docs/index.html` and `docs/app.js` into `labyrint/`.
