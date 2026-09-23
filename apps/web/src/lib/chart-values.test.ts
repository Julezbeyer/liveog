import { describe, expect, it } from 'vitest'
import { parseChartValues } from './chart-values'

describe('chart values pasted into the editor', () => {
  it('accepts spreadsheet columns, commas, decimals and negative values', () => {
    expect(parseChartValues('12, -4.5; 8\n19\t.5')).toEqual([12, -4.5, 8, 19, 0.5])
  })
  it('does not silently turn bad or missing input into a zero', () => {
    for (const input of ['', '1', '1, nope', '1, Infinity', '1, 1e999', '1, 0xFF']) expect(parseChartValues(input)).toBeNull()
  })
  it('bounds the size of a pasted data series', () => {
    expect(parseChartValues(Array(100).fill('1').join(','))).toHaveLength(100)
    expect(parseChartValues(Array(101).fill('1').join(','))).toBeNull()
  })
})
