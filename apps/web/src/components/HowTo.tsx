import { useState } from 'react'
import { Icon } from './Icons'

const META = `<meta property="og:image" content="https://your-site.com/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:video" content="https://your-site.com/og.mp4" />
<meta property="og:video:type" content="video/mp4" />
<meta property="og:video:width" content="1200" />
<meta property="og:video:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://your-site.com/og.png" />`

const CLI = `npm install @liveog/react
npx @liveog/cli render http://localhost:5173 ./dist`

export function HowTo() {
  return (
    <section className="howto">
      <div className="panel">
        <h3>Set your link preview</h3>
        <p>In your website builder, open the social sharing or SEO settings and upload your downloaded PNG. For a social post, attach the GIF or video directly.</p>
        <h3>Adding HTML yourself?</h3>
        <p>Rename your downloaded PNG to <code>og.png</code> and your MP4 to <code>og.mp4</code>. Upload them to your site, replace the example URLs below, and add these tags to its <code>&lt;head&gt;</code>. The PNG is the fallback every platform understands. The video only plays where a platform supports it.</p>
        <Snippet code={META} lang="html" />
      </div>
      <div className="panel">
        <h3>For developers: automate it</h3>
        <p>The editor uses the same React library you can use in your own app. Write your card as a React component, render it in CI with the CLI, commit the output. Repeatable assets on every release.</p>
        <Snippet code={CLI} lang="shell" />
        <p className="links">
          <a href="https://github.com/Julezbeyer/liveog" target="_blank" rel="noreferrer">Source on GitHub</a>
          <a href="https://github.com/Julezbeyer/liveog/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22" target="_blank" rel="noreferrer">Good first issues</a>
          <a href="https://github.com/Julezbeyer/liveog/issues/13" target="_blank" rel="noreferrer">Which platforms play motion?</a>
        </p>
      </div>
    </section>
  )
}

function Snippet({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="snippet">
      <div className="snippet-head">
        <span>{lang}</span>
        <button
        type="button"
        className="button small"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch { /* clipboard unavailable, the text is selectable anyway */ }
        }}
      >
        {copied ? <><Icon.check /> Copied</> : <><Icon.copy /> Copy</>}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  )
}
