/** Accept pasted columns or comma-separated values without converting empty fields to zero. */
export function parseChartValues(text: string): number[] | null {
  const tokens = text.trim().split(/[\s,;]+/).filter(Boolean)
  if (tokens.length < 2 || tokens.length > 100) return null
  if (tokens.some(token => !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(token))) return null
  const values = tokens.map(Number)
  return values.every(Number.isFinite) ? values : null
}
