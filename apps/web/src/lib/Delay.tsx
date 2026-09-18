import type { PropsWithChildren } from 'react'
import { LiveOGTimeProvider } from '@liveog/react'

/**
 * Shifts the LiveOG timeline for its children so their animation starts `ms`
 * later. Built on the public time provider, so it needs no library changes.
 */
export function Delay({ ms, time, children }: PropsWithChildren<{ ms: number; time: number }>) {
  return <LiveOGTimeProvider value={Math.max(0, time - ms)}>{children}</LiveOGTimeProvider>
}
