'use client'

import { LiveCard, Animate, Counter } from '@liveog/react'

/**
 * The card the renderer captures.
 *
 * No LiveOG time plumbing is needed: `Animate` and `Counter` subscribe to the
 * `liveog:time` window event themselves when there is no `LiveOGTimeProvider`
 * above them, which is exactly the situation here. `liveog render
 * http://localhost:3000/og/card <out>` drives that event frame by frame.
 *
 * This page lives in the `(card)` route group, which has its own root layout
 * with no site chrome - see `app/(card)/layout.tsx` for why that matters.
 */
export default function CardPage() {
  return (
    <LiveCard width={1200} height={630} duration={4000}>
      <main
        style={{
          width: '100%',
          height: '100%',
          // border-box, because height:100% plus padding would otherwise make
          // this taller than the card and LiveCard clips what sticks out.
          boxSizing: 'border-box',
          padding: '64px 72px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg,#0b0b12,#1a1a2e)',
          color: '#f4f4f7',
          fontFamily: '"Inter Variable", Inter, system-ui, sans-serif',
        }}
      >
        <Animate from="bottom" duration={700}>
          <div style={{ fontSize: 26, letterSpacing: 6, color: '#a58bff' }}>
            LIVEOG × NEXT.JS
          </div>
        </Animate>

        <Animate from="bottom" delay={300} duration={800}>
          <h1 style={{ fontSize: 76, lineHeight: 1.08, margin: 0, letterSpacing: -1.5 }}>
            Rendered from an
            <br />
            App Router route.
          </h1>
        </Animate>

        <Animate from="bottom" delay={800} duration={700}>
          <div style={{ fontSize: 34, color: '#b9b9c9' }}>
            <Counter to={3} delay={900} duration={1200} /> formats, one card
            definition
          </div>
        </Animate>
      </main>
    </LiveCard>
  )
}
