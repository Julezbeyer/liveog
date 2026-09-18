import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LiveCard, LiveOGTimeProvider, Animate, Counter } from '@liveog/react'

function App() {
  const [time, setTime] = useState(0)
  useEffect(() => {
    const handler = (event: Event) => setTime((event as CustomEvent<number>).detail)
    window.addEventListener('liveog:time', handler)
    return () => window.removeEventListener('liveog:time', handler)
  }, [])

  return (
    <LiveOGTimeProvider value={time}>
      <LiveCard>
        <main style={{width:'100%',height:'100%',display:'grid',placeItems:'center',background:'linear-gradient(135deg,#080808,#202020)',color:'white',fontFamily:'Inter,system-ui,sans-serif'}}>
          <section style={{textAlign:'center'}}>
            <Animate from="bottom"><div style={{fontSize:34,opacity:.7}}>LIVEOG</div><h1 style={{fontSize:76,margin:'12px 0'}}>Bring Open Graph to life.</h1></Animate>
            <div style={{fontSize:42,fontWeight:700}}><Counter to={12842} suffix=" ★" /></div>
          </section>
        </main>
      </LiveCard>
    </LiveOGTimeProvider>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
