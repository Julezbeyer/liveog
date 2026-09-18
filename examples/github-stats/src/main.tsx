import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LiveCard, Animate, Counter } from '@liveog/react'

type Repo = {
  full_name: string
  description: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  language: string | null
}

const params = new URLSearchParams(location.search)
const repo = params.get('repo') ?? 'Julezbeyer/liveog'

/**
 * The renderer navigates with `waitUntil: 'networkidle'` and only then starts
 * dispatching `liveog:time`. Rendering nothing until the fetch settles is what
 * keeps the captured frames free of a loading state.
 */
function useRepo(name: string) {
  const [state, setState] = useState<{ repo?: Repo; error?: string }>({})

  useEffect(() => {
    let cancelled = false
    fetch(`https://api.github.com/repos/${name}`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then(async response => {
        if (!response.ok) {
          // 403 here is almost always the 60 requests/hour unauthenticated limit.
          throw new Error(`GitHub API returned ${response.status}`)
        }
        return response.json() as Promise<Repo>
      })
      .then(data => !cancelled && setState({ repo: data }))
      .catch(error => !cancelled && setState({ error: String(error.message ?? error) }))
    return () => { cancelled = true }
  }, [name])

  return state
}

const card: React.CSSProperties = {
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
  padding: '0 80px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 28,
  background: 'linear-gradient(135deg,#0d1117,#1f2430)',
  color: '#e6edf3',
  fontFamily: 'Inter,system-ui,-apple-system,sans-serif',
}

function Stat({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <Animate from="bottom" delay={delay} duration={600}>
      <div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1 }}>
          <Counter to={value} delay={delay} duration={1400} easing="easeOutExpo" />
        </div>
        <div style={{ fontSize: 24, opacity: 0.6, marginTop: 8 }}>{label}</div>
      </div>
    </Animate>
  )
}

function App() {
  const { repo: data, error } = useRepo(repo)

  if (error) {
    return (
      <LiveCard>
        <main style={{ ...card, justifyContent: 'center' }}>
          <div style={{ fontSize: 34, opacity: 0.7 }}>Could not load {repo}</div>
          <div style={{ fontSize: 24, opacity: 0.5 }}>{error}</div>
        </main>
      </LiveCard>
    )
  }

  // Render nothing until the data is in, so no frame shows a loading state.
  if (!data) return null

  return (
    <LiveCard>
      <main style={card}>
        <Animate from="bottom" duration={700}>
          <div style={{ fontSize: 28, opacity: 0.6, letterSpacing: 1 }}>GITHUB</div>
          <h1 style={{ fontSize: 68, margin: '10px 0 0', lineHeight: 1.05 }}>{data.full_name}</h1>
        </Animate>

        {data.description && (
          <Animate from="bottom" delay={220} duration={700}>
            <p style={{ fontSize: 30, opacity: 0.75, margin: 0, maxWidth: '85%' }}>
              {data.description}
            </p>
          </Animate>
        )}

        <div style={{ display: 'flex', gap: 96, marginTop: 12 }}>
          <Stat label="Stars" value={data.stargazers_count} delay={480} />
          <Stat label="Forks" value={data.forks_count} delay={640} />
          <Stat label="Open issues" value={data.open_issues_count} delay={800} />
        </div>
      </main>
    </LiveCard>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
