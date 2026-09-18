import type { LiveOGFileConfig } from '@liveog/cli/config'

// Rename to liveog.config.ts (or .mjs) and run `liveog render` with no arguments.
// Every field is optional; command line flags win over the config file.
const config: LiveOGFileConfig = {
  url: 'http://localhost:5173',
  outDir: './dist',
  width: 1200,
  height: 630,
  duration: 3000,
  fps: 30,
  formats: ['png', 'mp4', 'gif'],
  // Public prefix, so the manifest contains absolute URLs for the meta tags.
  baseUrl: 'https://example.com/og',
}

export default config
