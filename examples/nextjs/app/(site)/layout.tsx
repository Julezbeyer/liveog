import '@fontsource-variable/inter'

/**
 * Root layout for the site itself. Separate from the card's root layout in
 * `app/(card)/layout.tsx` so that site chrome can never leak into a capture.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#0b0b12',
          color: '#f4f4f7',
          fontFamily: '"Inter Variable", Inter, system-ui, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  )
}
