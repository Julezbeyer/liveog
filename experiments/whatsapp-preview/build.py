#!/usr/bin/env python3
"""Build five controlled link-preview probes. Requires Pillow and ffmpeg."""
import argparse
import html
import json
from pathlib import Path
import subprocess
import tempfile
from urllib.parse import urlparse
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
base = args.base_url.rstrip('/')
assert urlparse(base).scheme == 'https', 'Use a public HTTPS origin'
out = args.out
assets = out / 'assets'
assets.mkdir(parents=True, exist_ok=True)
font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
if not Path(font_path).exists():
    font_path = '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'

def frame(number, label):
    image = Image.new('RGB', (600, 316), '#163bce' if number == 1 else '#cc4b00')
    draw = ImageDraw.Draw(image)
    draw.text((24, 18), f'LIVEOG TEST · {label}', fill='white', font=ImageFont.truetype(font_path, 22))
    draw.text((300, 155), str(number), anchor='mm', fill='white', font=ImageFont.truetype(font_path, 174))
    draw.text((300, 278), '1 ↔ 2 · jede Sekunde', anchor='mm', fill='white', font=ImageFont.truetype(font_path, 22))
    return image

control = frame(1, 'PNG · KONTROLLE')
control.save(assets / 'control.png', optimize=True)
for kind, ext in [('gif', 'gif'), ('webp', 'webp'), ('apng', 'png')]:
    frames = [frame(n, kind.upper()) for n in (1, 2)]
    options = dict(save_all=True, append_images=frames[1:], duration=[1000, 1000], loop=0)
    if kind == 'webp': options.update(lossless=True)
    frames[0].save(assets / f'counter-{kind}.{ext}', **options)

poster = frame(1, 'MP4 · POSTER')
poster.save(assets / 'video-poster.png', optimize=True)
with tempfile.TemporaryDirectory(prefix='liveog-counter-') as tmp:
    for i, n in enumerate((1, 2)):
        frame(n, 'MP4').save(Path(tmp) / f'frame-{i}.png')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1', '-i', f'{tmp}/frame-%d.png', '-vf', 'fps=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(assets / 'counter.mp4')], check=True)

css = '''body{font:17px/1.55 system-ui,sans-serif;background:#10121c;color:#f5f6ff;margin:0}main{max-width:780px;margin:auto;padding:32px 20px}a{color:#a7c8ff}h1{line-height:1.15}small,.muted{color:#b8bfd2}.notice{padding:16px;border:1px solid #64749c;border-radius:12px;background:#1b2336}.tests{display:grid;gap:12px;margin:24px 0}.card{border:1px solid #394058;border-radius:12px;padding:18px;background:#181c2b}.card h2{font-size:20px;margin:0 0 6px}.url{overflow-wrap:anywhere;display:block;margin:10px 0}button,.button{display:inline-block;font:inherit;color:#fff;background:#294bc1;border:0;border-radius:8px;padding:9px 13px;cursor:pointer;text-decoration:none;margin:4px 6px 4px 0}button:focus-visible,a:focus-visible{outline:3px solid #ffb85e}img,video{width:100%;max-width:600px;border-radius:12px;margin:20px 0}li{margin:9px 0}textarea{width:100%;box-sizing:border-box;min-height:150px;background:#191d2b;color:#fff;border:1px solid #64749c;padding:12px;border-radius:8px;font:inherit}summary{cursor:pointer}code{font-size:14px;overflow-wrap:anywhere}'''
script = '''document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(button.dataset.copy);button.textContent='Link kopiert';}catch{button.textContent='Bitte den sichtbaren Link kopieren';}}));'''

def page(title, body, metadata=''):
    return '<!doctype html><html lang="de"><head><meta charset="utf-8">' + metadata + f'<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>{html.escape(title)}</title><style>{css}</style></head><body><main>{body}</main><script>{script}</script></body></html>'

cases = [
    ('png', 'PNG – Kontrolle', 'control.png', 'image/png'),
    ('gif', 'GIF – Animation', 'counter-gif.gif', 'image/gif'),
    ('webp', 'WebP – Animation', 'counter-webp.webp', 'image/webp'),
    ('apng', 'APNG – Animation', 'counter-apng.png', 'image/png'),
    ('mp4', 'MP4 – Video-Metadaten', 'video-poster.png', 'image/png'),
]
links = []
manifest = []
for key, label, asset, mime in cases:
    url = f'{base}/{key}/'
    image_url = f'{base}/assets/{asset}'
    title = f'LiveOG WhatsApp-Test: {label}'
    desc = 'Bewegt sich der Zähler direkt in der empfangenen Linkvorschau, ohne Antippen?'
    metadata = f'<meta property="og:title" content="{html.escape(title)}"><meta property="og:description" content="{desc}"><meta property="og:url" content="{url}"><meta property="og:type" content="website"><meta property="og:image" content="{image_url}"><meta property="og:image:type" content="{mime}"><meta property="og:image:width" content="600"><meta property="og:image:height" content="316">'
    media = f'<img src="{image_url}" alt="Testzähler {label}" width="600" height="316">'
    if key == 'mp4':
        video_url = f'{base}/assets/counter.mp4'
        metadata += f'<meta property="og:video" content="{video_url}"><meta property="og:video:secure_url" content="{video_url}"><meta property="og:video:type" content="video/mp4"><meta property="og:video:width" content="600"><meta property="og:video:height" content="316">'
        media = f'<video src="{video_url}" poster="{image_url}" autoplay muted loop playsinline controls></video>'
    body = f'<a href="{base}/">← Alle fünf Tests</a><h1>{html.escape(label)}</h1><p class="notice">Bewegung auf dieser Webseite zählt nicht als Erfolg. Entscheidend ist die Vorschau der empfangenen WhatsApp-Nachricht, bevor du den Link öffnest.</p><button data-copy="{url}">Testlink kopieren</button><a class="url" href="{url}">{url}</a>{media}<p>{"Diese Kontrolle soll stillstehen." if key == "png" else "Hier auf der Webseite muss die Zahl jede Sekunde wechseln. Das bestätigt nur die Quelldatei."}</p><details><summary>Technische Testbedingungen</summary><p>600 × 316 Pixel. Metadaten stehen direkt im HTML. Eigene URL pro Format; keine Weiterleitung und kein JavaScript zur Erzeugung der Vorschau.</p><code>{html.escape(metadata)}</code></details>'
    folder = out / key
    folder.mkdir(exist_ok=True)
    (folder / 'index.html').write_text(page(title, body, metadata))
    links.append(f'<article class="card"><h2>{html.escape(label)}</h2><a class="url" href="{url}">{url}</a><button data-copy="{url}">Link kopieren</button><a href="{url}">Quelldatei ansehen</a></article>')
    manifest.append(dict(format=key, url=url, image=image_url, imageType=mime, imageBytes=(assets / asset).stat().st_size))

body = '<h1>Bewegt sich die WhatsApp-Linkvorschau?</h1><p>Fünf kontrollierte Testlinks. Ein statisches PNG als Kontrolle und vier Varianten für einen Zähler, der jede Sekunde zwischen einer blauen 1 und einer orangefarbenen 2 wechselt.</p><p class="notice"><strong>Experiment, keine zugesagte Funktion.</strong> Die Tests prüfen, ob deine WhatsApp-Version die Animation direkt in der Linkvorschau abspielt.</p><ol><li>PNG-Kontrolle kopieren und in einen WhatsApp-Chat einfügen.</li><li>Warten, bis die Vorschau erscheint. Erst dann absenden.</li><li>Beim Empfänger zehn Sekunden beobachten, ohne den Link anzutippen.</li><li>Mit GIF, WebP, APNG und MP4 wiederholen. Jeden Link einzeln senden.</li><li>Ergebnis auf Android und iPhone getrennt notieren. Bewegung nach dem Öffnen des Links zählt nicht.</li></ol><p>Fehlt schon bei PNG das Bild, ist der Test noch nicht aussagekräftig. Prüfe zuerst, ob WhatsApp überhaupt Linkvorschauen erzeugt.</p><div class="tests">' + ''.join(links) + '''</div><h2>Ergebnis zum Zurückschicken</h2><p>Bitte beim Empfänger prüfen: kein Bild / Standbild / Bewegung ohne Antippen.</p><textarea aria-label="Ergebnisvorlage">Handy / Betriebssystem:
WhatsApp-Version:
Datum:
PNG:
GIF:
WebP:
APNG:
MP4:
</textarea><p class="muted">Diese Seite sendet keine WhatsApp-Nachrichten und speichert keine Testergebnisse. Kein Tracking.</p>'''
(out / 'index.html').write_text(page('LiveOG · WhatsApp-Linkvorschau testen', body))
(out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
(out / 'robots.txt').write_text('User-agent: *\nAllow: /\n')
(out / 'vercel.json').write_text(json.dumps({
    '$schema': 'https://openapi.vercel.sh/vercel.json',
    'framework': None, 'buildCommand': None, 'installCommand': None,
    'trailingSlash': True,
    'headers': [
        {'source': '/assets/(.*)', 'headers': [{'key': 'Cache-Control', 'value': 'public, max-age=3600'}]},
        {'source': '/assets/counter-apng.png', 'headers': [{'key': 'Content-Type', 'value': 'image/png'}]},
        {'source': '/(.*)', 'headers': [{'key': 'X-Robots-Tag', 'value': 'noindex, nofollow'}]},
    ],
}, indent=2) + '\n')
for path in sorted(assets.iterdir()): print(path.name, path.stat().st_size, 'bytes')
