import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/*
 * Vercel compiles each file of this function on its own and runs the result as
 * native Node ESM. Two things that work everywhere else in this repo - tsx,
 * Vitest and the local dev server all forgive them - crash it in production:
 *
 * - an extensionless relative import ('./net-guard') is ERR_MODULE_NOT_FOUND;
 * - a default-exported handler is called with Node's (req, res), not a Request.
 *
 * Both shipped once and returned 500 on every request. Nothing short of a real
 * deployment exercises this, so these checks look at the source instead.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function runtimeFiles(): string[] {
  const files: string[] = []
  for (const dir of ['api', 'src']) {
    for (const name of readdirSync(join(root, dir))) {
      if (name.endsWith('.ts') && !name.endsWith('.test.ts')) files.push(join(dir, name))
    }
  }
  return files
}

describe('Vercel runtime constraints', () => {
  it('uses explicit .js extensions for every relative import', () => {
    const offenders: string[] = []
    for (const file of runtimeFiles()) {
      const source = readFileSync(join(root, file), 'utf8')
      for (const match of source.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
        if (!match[1]!.endsWith('.js')) offenders.push(`${file}: ${match[1]}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('exports the handler as named HTTP methods, not as default', () => {
    const source = readFileSync(join(root, 'api/import.ts'), 'utf8')
    expect(source).not.toMatch(/^\s*export\s+default\b/m)
    expect(source).toMatch(/export\s+(async\s+)?function\s+GET\b/)
    expect(source).toMatch(/export\s+function\s+OPTIONS\b/)
  })
})
