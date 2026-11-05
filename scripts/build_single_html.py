#!/usr/bin/env python3
"""Build a genuine one-file CrazyGames package without changing the game source.

All local CSS, JS, favicon, 12 cover images, and 12 music tracks are embedded.
Music is transcoded for the portal's <=50MB initial HTML download requirement.
"""
from __future__ import annotations
import base64
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "single-file" / "index.html"
MAX_BYTES = 49_000_000
AUDIO_BITRATE = "64k"
def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def data_uri(path, mime):
    return "data:" + mime + ";base64," + base64.b64encode((ROOT / path).read_bytes()).decode("ascii")

html = read("index.html")
# Do not rely on file-system or optional external font style sheets.
def css_link(m):
    file = m.group(1).split("?")[0]
    css = read(file)
    css = re.sub(r'@import\s+url\(["\x27]?https://fonts\.googleapis\.com/[^;]+;\s*', '', css)
    if re.search(r"</style", css, re.IGNORECASE):
        raise RuntimeError("Unexpected closing style tag in " + file)
    return '<style data-original-file="' + file + '">\n' + css + '\n</style>'
css_pattern = r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>'
html, css_count = re.subn(css_pattern, css_link, html)
assert css_count == 8, "Expected eight original CSS files: " + str(css_count)
html = re.sub(r'<link\s+rel="icon"\s+type="image/svg\+xml"\s+href="favicon\.svg"\s*/?>',
              '<link rel="icon" type="image/svg+xml" href="' + data_uri("favicon.svg", "image/svg+xml") + '">', html)

# The game receives an identical set of tracks and covers, but browser only needs
# the one HTML file. Embed MP3 data in non-executable raw-text script elements.
sound_tags = []
for i in range(1, 13):
    name = f"track-{i:02d}"
    src = ROOT / "assets" / "music" / (name + ".mp3")
    encoded = subprocess.run(
        ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
         "-i", str(src), "-vn", "-ac", "2", "-b:a", AUDIO_BITRATE,
         "-ar", "44100", "-map_metadata", "-1", "-f", "mp3", "pipe:1"],
        check=True, stdout=subprocess.PIPE).stdout
    if len(encoded) < 1000:
        raise RuntimeError("Failed to encode " + name)
    sound_tags.append('<script id="infiniti-music-' + f"{i:02d}" +
        '" type="application/x-infiniti-audio">' + base64.b64encode(encoded).decode("ascii") + '</script>')
    print(f"{name}: {len(src.read_bytes()):,} -> {len(encoded):,} bytes", flush=True)

inline_scripts = []
def js_script(m):
    file = m.group(1).split("?")[0]
    js = read(file)
    if file == "music-tracks.js":
        # Keep the exact original catalog, IDs, prices, and artwork.
        for i in range(1,13):
            key = f"track-{i:02d}"
            source = f"assets/music/{key}.jpg"
            if source not in js: raise RuntimeError("Missing cover " + source)
            js = js.replace(source, data_uri("assets/music/" + key + ".jpg", "image/jpeg"))
        js += """
;window.SpaceMusicTracks.forEach(function(track) {
 const node=document.getElementById('infiniti-music-'+String(track.id).padStart(2,'0'));
 if (!node) throw Error('Missing embedded track '+track.id);
 track.src='data:audio/mpeg;base64,'+node.textContent;
 node.remove();
});
"""
        js = "\n".join(sound_tags) + '\n<script data-original-file="music-tracks.js">\n' + js + '\n</script>'
        inline_scripts.append(file)
        return js
    if file == "game.js":
        # No external game.js script element exists in the standalone build.
        js = js.replace("return match?'v'+match[1]:'dev';", "return match?'v'+match[1]:'v3.59.3';")
    if re.search(r"</script", js, flags=re.IGNORECASE):
        raise RuntimeError("Unexpected raw closing script tag in " + file)
    inline_scripts.append(file)
    return '<script data-original-file="' + file + '">\n' + js + '\n</script>'

script_pattern = r'<script\s+src="([^"]+)"\s+defer></script>'
html, script_count = re.subn(script_pattern, js_script, html)
expected = ["i18n.js", "platform.js", "space-meta.js", "ui-v15-behaviors.js",
            "ui-v15-templates.js", "music-tracks.js", "mobile-controls.js", "game.js"]
assert inline_scripts == expected, "Unexpected game JS order: " + str(inline_scripts)
assert script_count == 8, "Expected eight original JS files"
# Self-contained package. Only CrazyGames platform SDK is intentionally requested
# from the official SDK endpoint; no local asset path should remain.
for pattern in [r'(?:src|href)\s*=\s*["\x27](?:assets/|(?:game|music-tracks|styles|ui-v15)\.)',
                r'(?:src|href)\s*=\s*["\x27](?:i18n|platform|mobile-controls|space-meta)\.js',
                r'<link[^>]+stylesheet']:
    assert not re.search(pattern, html), "Local asset reference remained: " + pattern
size = len(html.encode("utf-8"))
print(f"Single HTML size: {size:,} bytes; limit {MAX_BYTES:,}", flush=True)
if size > MAX_BYTES:
    raise RuntimeError("Single-file download exceeds CrazyGames initial-size cap; decrease AUDIO_BITRATE")
OUTPUT.parent.mkdir(exist_ok=True, parents=True)
OUTPUT.write_text(html, encoding="utf-8")
print("CREATED:", OUTPUT, flush=True)
