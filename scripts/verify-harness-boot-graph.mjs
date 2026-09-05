import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { validateHarnessCompatibility } from './validate-harness-compatibility.mjs'

const root = resolve(import.meta.dirname, '..')
const checkoutsRoot = resolve(process.argv[2] ?? '/Users/roncao/deepseek-harness')
const snapshot = validateHarnessCompatibility(root)

function collect(directory, manifests) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) collect(path, manifests)
    else if (entry.name === 'package.json') {
      const manifest = JSON.parse(readFileSync(path, 'utf8'))
      if (typeof manifest.name === 'string') manifests.set(manifest.name, manifest)
    }
  }
}

export function providerClosure(checkout, roots) {
  const manifests = new Map()
  collect(checkout, manifests)
  const closure = new Set()
  const visit = name => {
    if (closure.has(name)) return
    const manifest = manifests.get(name)
    assert.ok(manifest, `${name}: provider absent from checkout`)
    closure.add(name)
    for (const dependency of manifest.dsh?.client?.inject ?? []) visit(dependency)
  }
  roots.forEach(visit)
  return closure
}

const results = []
for (const record of snapshot.records) {
  if (!record.dependencies.registryReproducible) continue
  const checkout = join(checkoutsRoot, record.manifest.tag)
  assert.ok(existsSync(checkout), `${record.manifest.tag}: checkout missing`)
  const closure = providerClosure(checkout, snapshot.index.providerInjection)
  for (const required of ['@deepseek-ai/dsh-client-connection', '@deepseek-ai/dsh-client-ui-settings-plugins', '@deepseek-ai/dsh-api-remotes']) {
    assert.ok(closure.has(required), `${record.manifest.tag}: closure misses ${required}`)
  }
  // ui-slots is a Web profile platform service rather than a package-injection node
  // in legacy manifests; the plugin-level `inject` declaration gates on it.
  if (record.manifest.interfaceFamily !== 'IMA-HIF-1') assert.ok(closure.has('@deepseek-ai/dsh-api-gateway'))
  results.push({ tag: record.manifest.tag, providers: closure.size })
}
console.log(JSON.stringify({ injection: snapshot.index.providerInjection, results }, null, 2))
