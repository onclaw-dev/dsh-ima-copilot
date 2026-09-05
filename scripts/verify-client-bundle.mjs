import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const bundle = readFileSync(resolve(root, 'lib/client.js'), 'utf8')
assert.equal([...bundle.matchAll(/window\.__ModuleLoader__\.load/gu)].length, 1, 'exactly one Client loader registration')
assert.match(bundle, /id:\s*["']dsh-ima-copilot["']/u)
assert.match(bundle, /IMA-CLIENT-LEGACY/u)
assert.match(bundle, /IMA-CLIENT-GATEWAY/u)
assert.doesNotMatch(bundle, /DSH_CLIENT_CONTRACT|dsh-v0\.|process\.env.*(?:DSH|HARNESS)/u)
const required = [...bundle.matchAll(/require\(["']([^"']+)["']\)/gu)].map(match => match[1])
const allowed = new Set(['react', 'react/jsx-runtime'])
assert.deepEqual([...new Set(required.filter(id => !allowed.has(id)))], [], 'Client bundle imports only host-owned React')
console.log('Single IMA-BASE-1 multi-adapter Client bundle verified.')
