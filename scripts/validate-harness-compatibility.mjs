import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const statusValues = new Set(['passed', 'unavailable', 'not-run', 'operator-passed', 'failed'])
const familyIds = ['IMA-HIF-1', 'IMA-HIF-2', 'IMA-HIF-3']

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function centralCatalogPath(root) {
  return resolve(process.env.DSH_HARNESS_CATALOG ?? resolve(root, '..', '..', 'catalog/harness-releases.json'))
}

export function readCompatibilityCatalog(root = defaultRoot) {
  const index = readJson(resolve(root, 'patch/index.json'))
  const matrix = readJson(resolve(root, 'patch/verification/matrix.json'))
  const catalogPath = centralCatalogPath(root)
  const catalog = existsSync(catalogPath) ? readJson(catalogPath) : null
  return { index, matrix, catalog }
}

export function validateCompatibilityCatalog(snapshot, root = defaultRoot) {
  const { index, matrix, catalog } = snapshot
  assert.equal(index.schemaVersion, 2)
  assert.equal(index.baseContract, 'IMA-BASE-2')
  assert.deepEqual(index.families.map(family => family.id), familyIds)
  assert.equal(index.families.filter(family => family.native === true).length, 1)
  assert.equal(index.families.find(family => family.native)?.id, 'IMA-HIF-3')
  assert.equal(new Set(index.providerInjection).size, index.providerInjection.length)
  assert.equal(new Set(index.dependencyPackages).size, index.dependencyPackages.length)

  const familyByTag = new Map()
  for (const family of index.families) {
    assert.ok(['legacy-envelope', 'gateway-positional'].includes(family.credentials))
    assert.ok(['static', 'volatile'].includes(family.config))
    for (const reference of [family.credentialsAdapter, family.configAdapter]) {
      const [path, symbol] = reference.split('#')
      assert.ok(path && symbol && existsSync(resolve(root, path)), `${family.id}: missing adapter ${reference}`)
      assert.match(readFileSync(resolve(root, path), 'utf8'), new RegExp(`export function ${symbol}\\b`, 'u'), `${family.id}: adapter symbol ${symbol}`)
    }
    for (const tag of family.releases) {
      assert.ok(!familyByTag.has(tag), `${tag}: mapped more than once`)
      familyByTag.set(tag, family.id)
    }
  }

  assert.equal(matrix.schemaVersion, 1)
  assert.match(matrix.tarballSha256, /^[0-9a-f]{64}$/u)
  assert.equal(matrix.results.length, familyByTag.size)
  assert.equal(new Set(matrix.results.map(row => row.tag)).size, matrix.results.length)
  const matrixByTag = new Map(matrix.results.map(row => [row.tag, row]))
  for (const row of matrix.results) {
    assert.match(row.commit, /^[0-9a-f]{40}$/u, `${row.tag}: immutable commit`)
    assert.equal(row.family, familyByTag.get(row.tag), `${row.tag}: family mapping`)
    for (const level of ['sourceAudit', 'registry', 'packageSmoke', 'bundleSmoke', 'runtimeSmoke', 'liveIma']) {
      assert.ok(statusValues.has(row[level]), `${row.tag}: invalid ${level}`)
    }
    const unavailable = index.registryUnavailable.includes(row.tag)
    assert.equal(row.registry === 'unavailable', unavailable, `${row.tag}: registry exception`)
    assert.equal(row.packageSmoke === 'unavailable', unavailable, `${row.tag}: package exception`)
  }

  if (catalog) {
    const included = catalog.releases.filter(release => release.status === 'included')
    const excluded = catalog.releases.filter(release => release.status === 'excluded')
    assert.deepEqual([...familyByTag.keys()], included.map(release => release.tag), 'family mapping must follow the central included-tag order')
    for (const release of included) {
      assert.equal(matrixByTag.get(release.tag)?.commit, release.commit, `${release.tag}: central commit`)
    }
    for (const release of excluded) assert.ok(!familyByTag.has(release.tag), `${release.tag}: excluded tag mapped`)
  }

  const base = matrixByTag.get(index.baseTag)
  assert.ok(base, 'base tag must be mapped and verified')
  const manifest = readJson(resolve(root, 'package.json'))
  assert.equal(manifest.deepseekHarness.release, index.baseTag)
  assert.equal(manifest.deepseekHarness.version, index.baseTag.slice('dsh-v'.length))
  assert.equal(manifest.deepseekHarness.commit, base.commit)

  const obsoleteTagDirectories = readdirSync(resolve(root, 'patch'), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith('dsh-v'))
  assert.deepEqual(obsoleteTagDirectories, [], 'per-tag patch directories are forbidden')
  assert.ok(!existsSync(resolve(root, 'patch/adapters')), 'descriptive pseudo-adapter directory is forbidden')
  assert.ok(!existsSync(resolve(root, 'patch/schemas')), 'stale plugin-local schemas are forbidden')

  const records = matrix.results.map(row => {
    const version = row.tag.slice('dsh-v'.length)
    const registryReproducible = row.registry === 'passed'
    return {
      family: index.families.find(candidate => candidate.id === row.family),
      result: row,
      manifest: {
        tag: row.tag, version, commit: row.commit, base: row.tag === index.baseTag,
        contract: index.baseContract, interfaceFamily: row.family,
      },
      dependencies: {
        registryReproducible,
        packages: registryReproducible
          ? Object.fromEntries(index.dependencyPackages.map(name => [name, version]))
          : {},
        missingPackages: registryReproducible
          ? []
          : index.dependencyPackages.map(name => `${name}@${version}`),
      },
    }
  })
  return { ...snapshot, records }
}

export function validateHarnessCompatibility(root = defaultRoot) {
  return validateCompatibilityCatalog(readCompatibilityCatalog(root), root)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { records } = validateHarnessCompatibility()
  console.log(`Harness compatibility model valid: ${records.length} tags, 3 families, IMA-BASE-2.`)
}
