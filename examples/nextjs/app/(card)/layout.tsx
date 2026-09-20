import type { Metadata } from 'next'
import '@fontsource-variable/inter'

/**
 * Root layout for the card route group.
 *
 * Next allows more than one root layout as long as each top-level route group
 * brings its own and there is no `app/layout.tsx` above them. That is the point
 * of this file: the renderer must capture the card and nothing else, so this
 * layout deliberately has no header, no footer and no page padding.
 *
 * `overflow: hidden` keeps a scrollbar from appearing and shaving a few pixels
 * off the right edge of the capture.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function CardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, overflow: 'hidden', background: '#0b0b12' }}>
        {children}
      </body>
    </html>
  )
}
