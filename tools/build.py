"""Render index.html from projects.json.

    python tools/build.py

Replay data under assets/runs/ is inlined into the page so it works from a file:// URL too.
"""
import html, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
P = json.load(open(ROOT / "projects.json", encoding="utf-8"))
e = html.escape
WORDS = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split()
def words(n): return WORDS[n] if n < len(WORDS) else str(n)

TAG = {"iframe": "Live", "live": "Live", "replay": "Replay", "shot": "Screenshot", "fig": "Figure"}

def figure(f):
    return (f'<figure><img src="{e(f["src"])}" width="{f["w"]}" height="{f["h"]}" loading="lazy" alt="{e(f["caption"])}">'
            f'<figcaption>{e(f["caption"])}</figcaption></figure>')

def demo_pane(p):
    d = p["demo"]; k = d["kind"]
    if k == "replay":
        view = (f'<div class="view"><canvas class="cv" aria-label="{e(p["name"])} replay"></canvas></div>'
                '<div class="ctl"><button class="play" type="button" aria-label="Play or pause">&#9654;</button>'
                '<input class="scrub" type="range" min="0" max="1000" value="0" aria-label="Position in the run">'
                '<span class="tnow mono"></span></div>')
    elif k == "iframe":
        view = (f'<div class="view poster" data-src="{e(d["src"])}" data-title="{e(p["name"])} visualiser">'
                f'<img src="{e(d["poster"])}" alt="" loading="lazy">'
                '<button class="start" type="button">Start the visualiser</button></div>'
                f'<div class="ctl"><a class="mono" href="{e(d["src"])}" target="_blank" rel="noopener">Open it in its own tab &#8599;</a></div>')
    elif k == "live":
        view = ('<div class="view live"><div class="arb" id="arb" aria-label="Live CAN arbitration"><header><span class="mono">three nodes, one wire</span>'
                '<span class="mono">11-bit id, MSB first</span></header><div class="grid"></div><footer class="mono"></footer></div></div>')
    else:  # shot, fig
        view = f'<div class="view"><img src="{e(d["src"])}" alt="" loading="lazy"></div>'
    return f'{view}<p class="cap">{e(d["label"])}</p>'

def stage(p):
    d = p["demo"]
    attrs = f'data-demo="{d["kind"]}"' + (f' data-player="{d["player"]}" data-data="{d["data"]}"' if d["kind"] == "replay" else "")
    opts = f"<script type=\"application/json\" class=\"opts\">{json.dumps(d.get('opts', {}))}</script>" if d["kind"] == "replay" else ""
    figs = "".join(figure(f) for f in p["figs"]) or "<p class=\"cap\">No figures for this one.</p>"
    run = p["run"]
    return (f'<div class="stage" {attrs}>{opts}'
            '<div class="tabs" role="tablist"><button type="button" class="on" data-tab="demo">Demo</button>'
            '<button type="button" data-tab="figs">Figures</button><button type="button" data-tab="run">Run it</button>'
            f'<span class="tag mono">{TAG[d["kind"]]}</span></div>'
            f'<div class="pane on" data-pane="demo">{demo_pane(p)}</div>'
            f'<div class="pane figs" data-pane="figs">{figs}</div>'
            f'<div class="pane run" data-pane="run"><p class="needs">{e(run["needs"])}</p>'
            f'<pre><code>{e(chr(10).join(run["cmds"]))}</code></pre><button type="button" class="copy-btn">Copy</button></div>'
            '</div>')

def copy(p):
    nums = "".join(f'<div><dt>{e(a)}</dt><dd>{e(b)}</dd></div>' for a, b in p["nums"])
    note = f'<aside class="note"><h3>{e(p["note"]["title"])}</h3><p>{e(p["note"]["text"])}</p></aside>' if p.get("note") else ""
    return (f'<div class="copy"><p class="lead">{e(p["lead"])}</p><p>{e(p["desc"])}</p>'
            f'<dl class="nums">{nums}</dl>{note}'
            f'<p class="links"><a href="{e(p["repo"])}">Repository &#8599;</a></p></div>')

def entry(i, p):
    side = "s-l" if i % 2 == 0 else "s-r"
    return (f'<article class="entry {side}" id="{p["id"]}">\n'
            f'  <header class="eh"><p class="kind mono">{e(p["area"])}<i>/</i>{e(p["lang"])}<i>/</i>{p["tests"]} tests</p><h2>{e(p["name"])}</h2></header>\n'
            f'  {stage(p)}\n  {copy(p)}\n</article>')

n = len(P); tests = sum(p["tests"] for p in P)
rail = "".join(f'<li><a href="#{p["id"]}" aria-label="{e(p["name"])}"><span>{e(p["name"])}</span></a></li>' for p in P)
rows = "".join(f'<a class="row-link" href="#{p["id"]}"><span class="n">{e(p["name"])}</span><span class="d">{e(p["lead"])}</span>'
               f'<span class="t mono">{TAG[p["demo"]["kind"]]}</span><span class="m mono">{e(p["lang"])} / {p["tests"]} tests</span></a>' for p in P)
entries = "\n".join(entry(i, p) for i, p in enumerate(P))
runs = "".join(f'<script type="application/json" id="run-{name}">{(ROOT / "assets" / "runs" / f"{name}.json").read_text(encoding="utf-8")}</script>\n'
               for name in sorted({p["demo"]["data"] for p in P if p["demo"]["kind"] == "replay"}))

page = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gurmaan Singh</title>
<meta name="description" content="Mechatronics student. {words(n).capitalize()} software projects about sensing, deciding and moving, each with a demo, its figures and the commands to run it.">
<meta name="theme-color" content="#0a0b0c">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;700&display=swap">
<link rel="stylesheet" href="style.css">
</head>
<body>
<a class="skip" href="#list">Skip to the projects</a>
<nav class="rail" aria-label="Projects">
  <a class="who" href="#top">GURMAAN SINGH</a>
  <ol>{rail}</ol>
  <span class="end">{n}</span>
</nav>

<header class="hero" id="top">
  <canvas id="field" aria-hidden="true"></canvas>
  <div class="top mono"><span>Gurmaan Singh / mechatronics, Fontys</span><span class="status">Looking for a summer 2027 job</span></div>
  <h1>Software that<br>makes machines<br>behave<em>.</em></h1>
  <div class="row">
    <p class="intro">{words(n).capitalize()} projects about sensing, deciding and moving: trackers, controllers, protocols, and the tools to see what they are doing. Each one below has a demo you can watch or run, its figures, and the exact commands to run it yourself.</p>
    <p class="live mono" id="live"></p>
  </div>
</header>

<main>
<section class="block" id="list">
  <div class="sec-head"><h2>The {words(n)}</h2><span class="mono">hover for a look, click to jump</span></div>
  <div class="list">{rows}</div>
</section>

{entries}

<section class="block">
  <div class="how">
    <h2>How I work</h2>
    <ul>
      <li><b>Numbers come from a run</b><span>Every figure in a README was measured with a fixed seed. Where I could not measure it, I took the claim out. The replays on this page are recorded runs, not animations drawn to look right.</span></li>
      <li><b>The bugs are written down</b><span>Most repositories have a design note that says how the thing works and what went wrong on the way. The notes above are short versions.</span></li>
      <li><b>Limits sit next to results</b><span>What a project does not do, and what I have not tested, is listed in its README under Limits.</span></li>
      <li><b>Small enough to read</b><span>The largest is about 2,500 lines of source, the smallest under 500. Each has its own tests: {tests} across the {words(n)}.</span></li>
    </ul>
  </div>
</section>
</main>

<footer class="end">
  <h2>Summer 2027<em>.</em></h2>
  <p>I am looking for a summer job or internship in Sweden, Norway, Finland, Denmark or the Netherlands, in sensing, control or embedded software.</p>
  <p><a href="https://github.com/gurmaan-singh">github.com/gurmaan-singh</a></p>
  <div class="fine mono"><span>Type: Big Shoulders Display, IBM Plex Mono, Instrument Sans</span><a href="#top">Back to the top</a></div>
</footer>

<img id="peek" alt="">
{runs}<script src="main.js"></script>
</body>
</html>
'''
(ROOT / "index.html").write_text(page, encoding="utf-8", newline="\n")
print(f"index.html: {n} projects, {tests} tests, {len(page) // 1024} KB")
