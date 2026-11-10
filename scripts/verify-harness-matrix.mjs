import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import vm from 'node:vm'
import { validateHarnessCompatibility } from './validate-harness-compatibility.mjs'
import { assertImmutableMatrixResults } from './harness-matrix-contract.mjs'

const root = resolve(import.meta.dirname, '..')
const install = process.argv.includes('--install')
const record = process.argv.includes('--record')
assert.ok(!record || install, '--record requires --install')
const tarballInput = process.argv.find(value => value.startsWith('--tarball='))?.slice('--tarball='.length)
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

function smokePackedClientBundle(bundle, interfaceFamily) {
  let contribution
  const react = {
    useCallback: value => value, useEffect() {}, useState: value => [value, () => {}],
  }
  const jsx = { jsx: () => null, jsxs: () => null }
  const window = { __ModuleLoader__: { load(value) { contribution = value.factory(id => id === 'react' ? react : jsx) } } }
  vm.runInNewContext(bundle, { window }, { filename: 'dsh-ima-copilot/lib/client.js' })
  assert.equal(typeof contribution.apply, 'function')
  let registration
  let installSlot
  const slots = {
    inject(name, install) {
      assert.equal(name, 'settings.section')
      installSlot = install
      return () => {}
    },
    register(options) { registration = options; return () => {} },
  }
  const gateway = { describe() {}, set() {} }
  const legacy = { describe() {}, set() {} }
  const gatewayFamily = interfaceFamily !== 'IMA-HIF-1'
  const ctx = {
    slots,
    get(name) {
      if (name === 'slots') return slots
      if (name === 'connection') return { api: { credentials: legacy } }
      if (gatewayFamily && name === 'remote.credentials') return gateway
      return undefined
    },
  }
  contribution.apply(ctx)
  assert.equal(typeof installSlot, 'function', `${interfaceFamily}: section lifecycle callback`)
  installSlot()
  assert.equal(registration.id, 'ima-copilot')
  assert.equal(registration.name, 'settings.section')
  assert.equal(registration.inject().credentials.adapter,
    gatewayFamily ? 'IMA-CLIENT-GATEWAY' : 'IMA-CLIENT-LEGACY')
}

function smokeSourceInterfaces(checkout, interfaceFamily) {
  const read = relative => readFileSync(join(checkout, relative), 'utf8')
  const settings = read('packages/client/ui-settings/src/client/contract/slots.ts')
  const tools = read('packages/core/tools/src/index.ts')
  const credentials = read('packages/credentials/credentials/src/index.ts')
  assert.match(settings, /settings\.section/u, `${interfaceFamily}: settings.section source contract`)
  assert.match(tools, /register\(definition: ToolDefinition/u, `${interfaceFamily}: tools.register source contract`)
  assert.match(credentials, /resolve\(ref: CredentialRef\)/u, `${interfaceFamily}: credentials.resolve source contract`)
}

try {
  let tarball
  if (tarballInput) {
    tarball = resolve(tarballInput)
    assert.ok(existsSync(tarball), `tarball does not exist: ${tarball}`)
  } else {
    run('npm', ['run', 'build'])
    const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', packRoot, '--ignore-scripts']))
    tarball = join(packRoot, packed[0].filename)
  }
  const digest = createHash('sha256').update(readFileSync(tarball)).digest('hex')
  const packedClientBundle = run('tar', ['-xOf', tarball, 'package/lib/client.js'])
  const snapshot = validateHarnessCompatibility(root)
  const results = []
  for (const record of snapshot.records) {
    const checkout = join(checkoutsRoot, record.manifest.tag)
    assert.equal(run('git', ['-C', checkout, 'rev-parse', 'HEAD']).trim(), record.manifest.commit, `${record.manifest.tag}: checkout commit`)
    smokeSourceInterfaces(checkout, record.manifest.interfaceFamily)
    if (!record.dependencies.registryReproducible) {
      smokePackedClientBundle(packedClientBundle, record.manifest.interfaceFamily)
      results.push({
        tag: record.manifest.tag,
        status: 'source-passed',
        reason: `registry unavailable: ${record.dependencies.missingPackages.join(', ')}`,
      })
      continue
    }
    const fixture = join(temporaryRoot, record.manifest.tag); mkdirSync(fixture)
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
      smokePackedClientBundle(
        readFileSync(join(fixture, 'node_modules/dsh-ima-copilot/lib/client.js'), 'utf8'),
        record.manifest.interfaceFamily,
      )
    }
    results.push({ tag: record.manifest.tag, status: install ? 'passed' : 'prepared', tarballSha256: digest })
  }
  assertImmutableMatrixResults(results, snapshot)
  if (record) {
    const statusByTag = new Map(results.map(row => [row.tag, row.status]))
    const recorded = {
      ...snapshot.matrix,
      verifiedAt: new Date().toISOString().slice(0, 10),
      tarballSha256: digest,
      results: snapshot.matrix.results.map(row => ({
        ...row,
        sourceAudit: 'passed',
        registry: statusByTag.get(row.tag) === 'source-passed' ? 'unavailable' : 'passed',
        packageSmoke: statusByTag.get(row.tag) === 'source-passed' ? 'unavailable' : 'passed',
        bundleSmoke: 'passed',
      })),
    }
    writeFileSync(resolve(root, 'patch/verification/matrix.json'), `${JSON.stringify(recorded, null, 2)}\n`)
  }
  console.log(JSON.stringify({ tarballSha256: digest, installed: install, results }, null, 2))
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true })
}
