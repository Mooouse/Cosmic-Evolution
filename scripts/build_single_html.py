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

# Compact, HTML-safe Base85 packing. Avoid special HTML characters.
EXCLUDED = set(chr(n) for n in [34, 39, 92, 60, 62, 38, 96, 47, 37])
ALPHABET = "".join(chr(n) for n in range(33, 127) if chr(n) not in EXCLUDED)
assert len(ALPHABET) == 85

def pack85(data):
    result = []
    for pos in range(0, len(data), 4):
        chunk=data[pos:pos + 4]
        word = int.from_bytes(chunk + bytes(4 - len(chunk)), "big")
        five = [""] * 5
        for j in range(4, -1, -1):
            word, digit = divmod(word, 85)
            five[j] = ALPHABET[digit]
        result.extend(five)
    return "".join(result)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "single-file" / "index.html"
MAX_BYTES = 19_950_000
AUDIO_BITRATE = "46k"
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

# The same 12 soundtracks and cover images, with modern stereo Opus instead of
# 40 kbps MP3. The audio is embedded and lazily unpacked on first use.
sound_tags = []
for i in range(1, 13):
    name = f"track-{i:02d}"
    src = ROOT / "assets" / "music" / (name + ".mp3")
    encoded = subprocess.run(
        ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
         "-i", str(src), "-vn", "-map_metadata", "-1",
         "-ac", "2", "-ar", "48000", "-c:a", "libopus",
         "-application", "audio", "-compression_level", "10",
         "-b:a", AUDIO_BITRATE, "-vbr", "on", "-f", "ogg", "pipe:1"],
        check=True, stdout=subprocess.PIPE).stdout
    if len(encoded) < 1000 or not encoded.startswith(b"OggS"):
        raise RuntimeError("Failed to encode Ogg Opus for " + name)
    sound_tags.append('<script id="infiniti-music-' + f"{i:02d}" +
        '" type="application/x-infiniti-audio" data-bytes="' +
        str(len(encoded)) + '">' + pack85(encoded) + '</script>')
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
// Decode HTML-safe Base85 only when a music track is first requested.
;(function(){
 const alphabet = 'AUDIO_ALPHABET';
 const lookup = new Int16Array(128).fill(-1);
 for(let i=0;i<alphabet.length;i++)lookup[alphabet.charCodeAt(i)]=i;
 function unpack85(source,byteLength){
  if(source.length%5)throw Error('Invalid embedded audio length');
  const result=new Uint8Array((source.length/5)*4);
  let offset=0;
  for(let p=0;p<source.length;p+=5){
   let word=0;
   for(let j=0;j<5;j++){
    const digit=lookup[source.charCodeAt(p+j)];
    if(digit<0||digit===undefined)throw Error('Invalid embedded audio symbol');
    word=word*85+digit;
   }
   if(word>4294967295)throw Error('Invalid encoded audio word');
   result[offset++]=(word>>>24)&255;
   result[offset++]=(word>>>16)&255;
   result[offset++]=(word>>>8)&255;
   result[offset++]=word&255;
  }
  return result.subarray(0,byteLength);
 }
 window.SpaceMusicTracks.forEach(function(track){
  const node=document.getElementById('infiniti-music-'+String(track.id).padStart(2,'0'));
  if(!node)throw Error('Missing embedded track '+track.id);
  let cachedUrl=null;
  Object.defineProperty(track,'src',{enumerable:true,configurable:true,get(){
   if(!cachedUrl){
    const raw=unpack85(node.textContent,Number(node.dataset.bytes));
    cachedUrl=URL.createObjectURL(new Blob([raw],{type:'audio/ogg; codecs=opus'}));
    node.remove();
   }
   return cachedUrl;
  }});
 });
})();
""".replace('AUDIO_ALPHABET', ALPHABET)
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
