# WhatsApp link-preview experiment

Public test index: https://liveog-whatsapp-lab.vercel.app/

This is a feasibility experiment, not a claim that WhatsApp supports animated link previews. It has five independently addressable pages: a static PNG control, GIF, animated WebP, APNG served as image/png, and MP4 referenced by og:video with a static PNG poster. Each animated asset alternates a blue 1 and orange 2 once per second.

The pages contain their metadata directly in HTML. Every image is 600 × 316 pixels and under 60 KB. The H.264 MP4 is two seconds long at 30 fps. No analytics or message sending is included.

## Build

Requirements: Python 3, Pillow, FFmpeg with libx264, and either DejaVu Sans Bold or FreeSans Bold in the standard Linux font directory.

```sh
python3 experiments/whatsapp-preview/build.py \
  --base-url https://liveog-whatsapp-lab.vercel.app \
  --out /tmp/liveog-whatsapp-lab
```

`--base-url` must match the public deployment because the metadata uses absolute asset URLs. Deploy the generated directory as a static website. An isolated Vercel project named `liveog-whatsapp-lab` hosts this experiment separately from the editor.

## Test on real WhatsApp clients

1. Copy the PNG control URL into a chat; wait for a preview, then send it.
2. Observe the received message without opening the link. The control should remain static.
3. Repeat individually for GIF, WebP, APNG and MP4, watching for at least ten seconds.
4. Record the sender and recipient device, OS, WhatsApp version and date. Test both Android and iOS if available.
5. Record no image, static image, or animation without tapping. Playback after opening the webpage, or after tapping a video, does not meet the goal.

If the PNG control has no preview, troubleshoot ordinary preview generation before interpreting animation results. When changing an experiment, use a new page and asset URL to avoid reusing a cached preview. This deployment is a fixed test fixture; do not replace its assets during a test series.

Browser animation, valid metadata and successful HTTP responses verify the fixture only. They do not verify WhatsApp behavior. No real-client results have been recorded yet.
