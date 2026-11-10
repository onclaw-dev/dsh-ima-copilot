import assert from 'node:assert/strict'

export function assertImmutableMatrixResults(results, snapshot) {
  const expectedTags = snapshot.records.map(record => record.manifest.tag)
  const unavailable = snapshot.index.registryUnavailable
  const verified = results.filter(row => row.status === 'passed' || row.status === 'prepared')
  assert.deepEqual(results.map(row => row.tag), expectedTags, 'matrix must cover every mapped tag in order')
  assert.equal(verified.length, expectedTags.length - unavailable.length,
    'every registry-reproducible tag must use the exact shared tarball')
  assert.deepEqual(results.filter(row => row.status === 'source-passed').map(row => row.tag),
    unavailable, 'registry-unavailable tags still require source and bundle smoke')
  assert.equal(new Set(verified.map(row => row.tarballSha256)).size, 1, 'all targets must use one tarball')
  assert.ok(verified.every(row => /^[0-9a-f]{64}$/u.test(row.tarballSha256)))
  return results
}
