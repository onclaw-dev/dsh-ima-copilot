import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import vm from 'node:vm'
import { validateHarnessCompatibility } from './validate-harness-compatibility.mjs'
import { assertImmutableMatrixResults } from './harness-matrix-contract.mjs'

const root = resolve(import.meta.dirname, '..')
const install = process.argv.includes('--install')
const checkoutsRoot = resolve(process.argv.find(value => value.startsWith('--checkouts='))?.slice('--checkouts='.length) ?? '/Users/roncao/deepseek-harness')
const temporaryRoot = mkdtempSync(join(tmpdir(), 'dsh-ima-matrix-'))
const packRoot = join(temporaryRoot, 'pack')
const cache = join(temporaryRoot, 'npm-cache')
mkdirSync(packRoot); mkdirSync(cache)

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, npm_config_cache: cache } })
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
  return result.stdout
}

function assertResolvedRelease(tree, version, tag) {
  const visit = dependencies => {
    for (const [name, node] of Object.entries(dependencies ?? {})) {
      if (name.startsWith('@deepseek-ai/dsh-') && typeof node.version === 'string') {
        assert.equal(node.version, version, `${tag}: mixed transitive ${name}@${node.version}`)
      }
      visit(node.dependencies)
    }
  }
  visit(tree.dependencies)
}

function installedTree(fixture) {
  const result = spawnSync('npm', ['ls', '--all', '--json'], { cwd: fixture, encoding: 'utf8' })
  assert.ok(result.stdout.trim().length > 0, `npm ls produced no dependency tree: ${result.stderr}`)
  return JSON.parse(result.stdout)
}

function releaseOverrides(checkout, version) {
  const overrides = {}
  const visit = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      const path = join(directory, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (entry.name === 'package.json') {
        const manifest = JSON.parse(readFileSync(path, 'utf8'))
        if (typeof manifest.name === 'string' && manifest.name.startsWith('@deepseek-ai/dsh-') && !manifest.private) {
          overrides[manifest.name] = version
        }
      }
    }
  }
  visit(checkout)
  return overrides
}

function smokePackedClient(fixture, interfaceFamily) {
  const bundle = readFileSync(join(fixture, 'node_modules/dsh-ima-copilot/lib/client.js'), 'utf8')
  let contribution
  const react = {
    useCallback: value => value, useEffect() {}, useState: value => [value, () => {}],
  }
  const jsx = { jsx: () => null, jsxs: () => null }
  const window = { __ModuleLoader__: { load(value) { contribution = value.factory(id => id === 'react' ? react : jsx) } } }
  vm.runInNewContext(bundle, { window }, { filename: 'dsh-ima-copilot/lib/client.js' })
  assert.equal(typeof contribution.apply, 'function')
  let registration
  const slots = {
    inject(_name, install) { return install() },
    register(options) { registration = options; return () => {} },
  }
  const legacy = { describe() {}, set() {} }
  const gateway = { describe() {}, set() {} }
  const gatewayFamily = interfaceFamily !== 'IMA-HIF-1'
  const ctx = {
    slots, ...(gatewayFamily ? { remote: { credentials: gateway } } : {}),
    get(name) {
      if (name === 'slots') return slots
      if (name === 'connection') return { api: { credentials: legacy } }
      if (gatewayFamily && name === 'remote') return this.remote
      if (gatewayFamily && name === 'remote.credentials') return gateway
      return undefined
    },
  }
  contribution.apply(ctx)
  assert.equal(registration.key, 'ima-copilot')
  assert.equal(registration.inject().credentials.adapter, gatewayFamily ? 'IMA-CLIENT-GATEWAY' : 'IMA-CLIENT-LEGACY')
}

try {
  run('npm', ['run', 'build'])
  const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', packRoot, '--ignore-scripts']))
  const tarball = join(packRoot, packed[0].filename)
  const digest = createHash('sha256').update(readFileSync(tarball)).digest('hex')
  const snapshot = validateHarnessCompatibility(root)
  const results = []
  for (const record of snapshot.records) {
    if (!record.dependencies.registryReproducible) {
      results.push({ tag: record.manifest.tag, status: 'unavailable', reason: record.dependencies.missingPackages.join(', ') })
      continue
    }
    const fixture = join(temporaryRoot, record.manifest.tag); mkdirSync(fixture)
    const checkout = join(checkoutsRoot, record.manifest.tag)
    assert.equal(run('git', ['-C', checkout, 'rev-parse', 'HEAD']).trim(), record.manifest.commit, `${record.manifest.tag}: checkout commit`)
    writeFileSync(join(fixture, 'package.json'), JSON.stringify({
      name: `ima-matrix-${record.manifest.version.replaceAll('.', '-')}`, private: true, version: '0.0.0',
      dependencies: { ...record.dependencies.packages, 'dsh-ima-copilot': `file:${tarball}` },
      overrides: releaseOverrides(checkout, record.manifest.version),
    }, null, 2))
    if (install) {
      run('npm', ['install', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund'], fixture)
      const installed = JSON.parse(readFileSync(join(fixture, 'node_modules/dsh-ima-copilot/package.json'), 'utf8'))
      assert.deepEqual(installed.dsh.client.inject, snapshot.index.providerInjection)
      for (const [name, version] of Object.entries(record.dependencies.packages)) {
        const resolved = JSON.parse(readFileSync(join(fixture, 'node_modules', name, 'package.json'), 'utf8'))
        assert.equal(resolved.version, version, `${record.manifest.tag}: mixed ${name}`)
      }
      assertResolvedRelease(installedTree(fixture), record.manifest.version, record.manifest.tag)
      smokePackedClient(fixture, record.manifest.interfaceFamily)
    }
    results.push({ tag: record.manifest.tag, status: install ? 'passed' : 'prepared', tarballSha256: digest })
  }
  assertImmutableMatrixResults(results)
  console.log(JSON.stringify({ tarballSha256: digest, installed: install, results }, null, 2))
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true })
}
