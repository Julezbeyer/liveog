import React, { createContext, useContext } from 'react'
import { defaults, lerp } from '@liveog/core'

const TimeContext = createContext(0)
export const LiveOGTimeProvider = TimeContext.Provider

export function LiveCard({ width=defaults.width, height=defaults.height, duration=defaults.duration, children }: React.PropsWithChildren<{width?:number;height?:number;duration?:number}>) {
  return <div data-liveog-duration={duration} style={{width,height,overflow:'hidden',position:'relative'}}>{children}</div>
}

export function Animate({ from='bottom', children }: React.PropsWithChildren<{from?:'bottom'|'top'|'left'|'right'}>) {
  const t = useContext(TimeContext)
  const p = Math.min(1, t / 700)
  const axis = from === 'left' || from === 'right' ? 'X' : 'Y'
  const sign = from === 'top' || from === 'left' ? -1 : 1
  return <div style={{opacity:p, transform:`translate${axis}(${lerp(36*sign,0,p)}px)`}}>{children}</div>
}

export function Counter({ from=0, to, suffix='' }: {from?:number;to:number;suffix?:string}) {
  const t = useContext(TimeContext)
  const p = Math.min(1, t / 1800)
  return <span>{Math.round(lerp(from,to,p)).toLocaleString()}{suffix}</span>
}
