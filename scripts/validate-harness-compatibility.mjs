import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const exactVersion = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u
const statuses = new Set(['passed', 'failed', 'unavailable', 'not-run'])
const expectedTags = [
  'dsh-v0.1.0-rc.7', 'dsh-v0.1.0-rc.8', 'dsh-v0.1.1-rc.1', 'dsh-v0.1.1-rc.2',
  'dsh-v0.1.2-alpha.1', 'dsh-v0.1.2-alpha.2', 'dsh-v0.1.2-alpha.3',
  'dsh-v0.1.2-alpha.4', 'dsh-v0.1.2-alpha.5', 'dsh-v0.1.2-rc.1', 'dsh-v0.1.3-alpha.1',
]

export function readCompatibilityCatalog(root = defaultRoot) {
  const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
  const index = read('patch/index.json')
  const records = index.tags.map(mapping => ({
    mapping,
    manifest: read(`patch/${mapping.tag}/manifest.json`),
    dependencies: read(`patch/${mapping.tag}/dependencies.json`),
    interfaceRecord: read(`patch/${mapping.tag}/interface.json`),
    verification: read(`patch/${mapping.tag}/verification.json`),
  }))
  return { index, records }
}

export function validateCompatibilityCatalog(snapshot, root = defaultRoot) {
  const { index, records } = snapshot
  assert.equal(index.schemaVersion, 1)
  assert.equal(index.baseContract, 'IMA-BASE-1')
  assert.deepEqual(index.tags.map(row => row.tag), expectedTags, 'catalog must cover every official tag in audit order')
  assert.equal(new Set(index.providerInjection).size, index.providerInjection.length, 'provider injection must be unique')
  assert.deepEqual(index.providerInjection, [
    '@deepseek-ai/dsh-client-connection', '@deepseek-ai/dsh-client-ui-settings-plugins',
  ])
  let bases = 0
  for (const [position, record] of records.entries()) {
    const { mapping, manifest, dependencies, interfaceRecord, verification } = record
    assert.equal(manifest.tag, mapping.tag, `${mapping.tag}: manifest mapping`)
    assert.equal(manifest.tag, `dsh-v${manifest.version}`, `${mapping.tag}: version`)
    assert.match(manifest.commit, /^[0-9a-f]{40}$/u, `${mapping.tag}: full commit`)
    for (const key of ['contract', 'interfaceFamily', 'adapter']) assert.equal(manifest[key], mapping[key], `${mapping.tag}: ${key}`)
    assert.equal(interfaceRecord.interfaceFamily, mapping.interfaceFamily)
    assert.equal(interfaceRecord.adapter, mapping.adapter)
    assert.equal(interfaceRecord.previousTag, position === 0 ? null : records[position - 1].manifest.tag)
    assert.ok(interfaceRecord.interfaceDelta.length > 0 && interfaceRecord.evidence.length > 0, `${mapping.tag}: source evidence`)
    if (manifest.base) bases += 1
    assert.equal(manifest.base, manifest.tag === index.baseTag, `${mapping.tag}: base marker`)
    for (const [name, version] of Object.entries(dependencies.packages)) {
      assert.match(name, /^@deepseek-ai\/dsh-/u)
      assert.match(version, exactVersion, `${mapping.tag}: exact ${name}`)
      assert.equal(version, manifest.version, `${mapping.tag}: mixed release ${name}`)
    }
    assert.equal(dependencies.registryReproducible, dependencies.missingPackages.length === 0, `${mapping.tag}: registry evidence`)
    for (const stage of ['audited', 'registry', 'packageVerification', 'liveSmoke']) {
      assert.ok(statuses.has(verification[stage]?.status), `${mapping.tag}: ${stage} status`)
      assert.ok(verification[stage]?.reason?.length > 0, `${mapping.tag}: ${stage} reason`)
    }
    if (!dependencies.registryReproducible) {
      assert.notEqual(verification.registry.status, 'passed')
      assert.notEqual(verification.packageVerification.status, 'passed')
    }
    if (verification.packageVerification.status === 'passed') assert.equal(verification.registry.status, 'passed')
    if (verification.packageVerification.status === 'passed') assert.match(verification.packageVerification.evidence, /^sha256:[0-9a-f]{64}$/u)
    for (const file of ['client.js', 'host.js']) assert.ok(existsSync(resolve(root, `patch/adapters/${mapping.adapter}/${file}`)))
    for (const file of ['client.json', 'host.json']) assert.ok(existsSync(resolve(root, `patch/contracts/${mapping.contract}/${file}`)))
  }
  assert.equal(bases, 1, 'exactly one development baseline is required')
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const base = records.find(row => row.manifest.base)?.manifest
  assert.equal(manifest.deepseekHarness.release, base.tag)
  assert.equal(manifest.deepseekHarness.version, base.version)
  assert.equal(manifest.deepseekHarness.commit, base.commit)
  return snapshot
}

export function validateHarnessCompatibility(root = defaultRoot) {
  return validateCompatibilityCatalog(readCompatibilityCatalog(root), root)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { records } = validateHarnessCompatibility()
  console.log(`Harness compatibility catalog valid: ${records.length} tags, IMA-BASE-1.`)
}
