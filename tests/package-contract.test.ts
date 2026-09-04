import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as {
  dsh?: { client?: { inject?: string[] } }
}

describe('package loader boundary', () => {
  it('composes Client UI exclusively through loader stable subpaths', () => {
    expect(manifest.dsh?.client?.inject).toEqual([
      '@dsh-plugin/dsh-loader',
      '@dsh-plugin/dsh-loader/ui-settings',
      '@dsh-plugin/dsh-loader/ui-slots',
    ])
  })
})
