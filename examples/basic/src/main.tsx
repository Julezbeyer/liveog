import React from 'react'
import { createRoot } from 'react-dom/client'
import { LiveCard, Animate, Counter } from '@liveog/react'

// No time plumbing: the components subscribe to `liveog:time` themselves.
// Pass a `LiveOGTimeProvider` instead when you want to drive the timeline yourself.
function App() {
  return (
    <LiveCard>
      <main style={{width:'100%',height:'100%',display:'grid',placeItems:'center',background:'linear-gradient(135deg,#080808,#202020)',color:'white',fontFamily:'Inter,system-ui,sans-serif'}}>
        <section style={{textAlign:'center'}}>
          <Animate from="bottom" duration={700}>
            <div style={{fontSize:34,opacity:.7}}>LIVEOG</div>
            <h1 style={{fontSize:76,margin:'12px 0'}}>Bring Open Graph to life.</h1>
          </Animate>
          <Animate from="bottom" delay={500} duration={700}>
            <div style={{fontSize:42,fontWeight:700}}>
              <Counter to={12842} suffix=" ★" delay={700} duration={1800} easing="easeOutExpo" />
            </div>
          </Animate>
        </section>
      </main>
    </LiveCard>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
