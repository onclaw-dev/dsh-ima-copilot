import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const typesRoot = resolve(root, 'lib/types')
const forbiddenNative = /@deepseek-ai\/dsh-(?:api-remotes|client-connection|client-ui-renderer|client-ui-settings-plugins|client-ui-slots|credentials|settings|tools)/u
const forbiddenWire = /\b(?:ConnectionHandle|IApiClient|RpcResponse|RemoteResult)\b/u

function declarations(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? declarations(path) : path.endsWith('.d.ts') ? [path] : []
  })
}

for (const path of declarations(typesRoot)) {
  const source = readFileSync(path, 'utf8')
  assert.doesNotMatch(source, forbiddenNative, `${relative(typesRoot, path)}: target-specific Harness declaration`)
  assert.doesNotMatch(source, forbiddenWire, `${relative(typesRoot, path)}: native wire type escaped`)
}
console.log('Version-neutral public declarations verified; no rc.7 renderer fixture is required.')
