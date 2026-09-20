import React from 'react'
import { createRoot } from 'react-dom/client'
import { LiveCard, Animate } from '@liveog/react'
// Bundled so the render does not depend on the fonts installed on the machine
// doing the capture. A marketing asset has to look the same everywhere.
import '@fontsource-variable/inter'

// The repository's own social preview, rendered with LiveOG.
// GitHub shows a static image on the repo page, so the *last* frame has to read
// as a finished card on its own — every element lands before the timeline ends.
// 1280x640 is GitHub's recommended social preview size, not the 1200x630 we use
// for Open Graph elsewhere.
const WIDTH = 1280
const HEIGHT = 640
const DURATION = 4000

const FORMATS = ['PNG', 'MP4', 'GIF']

function App() {
  return (
    <LiveCard width={WIDTH} height={HEIGHT} duration={DURATION}>
      <main
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: '#08080c',
          color: '#f4f4f7',
          fontFamily: '"Inter Variable", Inter, system-ui, sans-serif',
        }}
      >
        {/* Two soft glows in the brand colours instead of a flat gradient. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(900px 520px at 12% 0%, rgba(124,92,255,.38), transparent 60%),' +
              'radial-gradient(760px 460px at 100% 100%, rgba(255,92,138,.22), transparent 60%)',
          }}
        />

        <section
          style={{
            position: 'relative',
            height: '100%',
            // Without border-box the padding is added on top of height:100% and
            // the card silently overflows, so the last row gets clipped away.
            boxSizing: 'border-box',
            padding: '72px 84px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Animate from="bottom" duration={700}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                fontSize: 26,
                letterSpacing: 6,
                fontWeight: 600,
                color: '#a58bff',
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: '#7c5cff',
                  boxShadow: '0 0 24px 6px rgba(124,92,255,.65)',
                }}
              />
              LIVEOG
            </div>
          </Animate>

          <div>
            <Animate from="bottom" delay={260} duration={800}>
              <h1
                style={{
                  fontSize: 92,
                  lineHeight: 1.04,
                  margin: 0,
                  fontWeight: 700,
                  letterSpacing: -2,
                }}
              >
                Bring Open Graph
                <br />
                to life.
              </h1>
            </Animate>

            <Animate from="bottom" delay={620} duration={700}>
              <p
                style={{
                  fontSize: 34,
                  lineHeight: 1.35,
                  margin: '28px 0 0',
                  maxWidth: 900,
                  color: '#b9b9c9',
                }}
              >
                Animated social preview cards from React components — one card
                definition, three outputs.
              </p>
            </Animate>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 32,
            }}
          >
            {/* Staggered so the formats appear one after another in the video. */}
            <div style={{ display: 'flex', gap: 14 }}>
              {FORMATS.map((format, index) => (
                <Animate
                  key={format}
                  from="bottom"
                  delay={1100 + index * 180}
                  duration={560}
                >
                  <span
                    style={{
                      display: 'block',
                      padding: '14px 26px',
                      borderRadius: 999,
                      fontSize: 26,
                      fontWeight: 600,
                      letterSpacing: 1,
                      color: '#e6e6f0',
                      background: 'rgba(255,255,255,.07)',
                      border: '1px solid rgba(255,255,255,.14)',
                    }}
                  >
                    {format}
                  </span>
                </Animate>
              ))}
            </div>

            <Animate from="bottom" delay={1700} duration={600}>
              <code
                style={{
                  fontSize: 28,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  color: '#9ff0bd',
                  whiteSpace: 'nowrap',
                }}
              >
                npm i @liveog/cli
              </code>
            </Animate>
          </div>
        </section>
      </main>
    </LiveCard>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
