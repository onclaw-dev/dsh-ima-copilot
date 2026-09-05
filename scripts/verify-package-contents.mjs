import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts', '--cache', resolve(root, '.npm-cache')], {
  cwd: root, encoding: 'utf8',
})
assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
const files = JSON.parse(result.stdout)[0].files.map(row => row.path)
assert.ok(files.includes('lib/client.js') && files.includes('lib/index.js'))
assert.ok(files.includes('lib/types/compat/client.d.ts') && files.includes('lib/types/compat/host.d.ts'))
const forbidden = /(?:^|\/)(?:patch|openspec|tests?|fixtures?|node_modules|\.npm-cache|deepseek-harness)(?:\/|$)|(?:credential|cookie|token).*(?:\.json|\.env)$/iu
assert.deepEqual(files.filter(path => forbidden.test(path)), [], 'package contains local compatibility, fixture, cache, or secret material')
console.log(`Package boundary verified: ${files.length} allowlisted publish files.`)
