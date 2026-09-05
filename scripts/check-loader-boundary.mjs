import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sourceRoot = resolve(root, 'src')
const allowedNativeBoundary = new Set(['compat/host.ts'])
const nativeImports = /from ['"]@deepseek-ai\/(?:cordis|dsh-credentials|dsh-settings|dsh-tools|dsh-api-remotes|dsh-client-connection)/u
const forbiddenBusinessTerms = /IMA-HIF-|IMA-ADAPTER-|ConnectionHandle|IApiClient|RpcResponse|RemoteResult/u

function files(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  }).filter(path => /\.(?:ts|tsx)$/u.test(path))
}

for (const path of files(sourceRoot)) {
  const name = relative(sourceRoot, path)
  const source = readFileSync(path, 'utf8')
  if (!allowedNativeBoundary.has(name)) assert.doesNotMatch(source, nativeImports, `${name}: native Harness import escaped compatibility boundary`)
  if (!name.startsWith('compat/')) assert.doesNotMatch(source, forbiddenBusinessTerms, `${name}: interface-family detail escaped compatibility boundary`)
}
console.log('IMA-BASE-1 loader and business boundaries verified.')
