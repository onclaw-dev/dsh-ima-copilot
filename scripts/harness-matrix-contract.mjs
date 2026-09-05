import assert from 'node:assert/strict'

export function assertImmutableMatrixResults(results) {
  const verified = results.filter(row => row.status === 'passed' || row.status === 'prepared')
  assert.ok(verified.length > 1, 'matrix must cover multiple reproducible tags')
  assert.equal(new Set(verified.map(row => row.tarballSha256)).size, 1, 'all targets must use one tarball')
  assert.ok(verified.every(row => /^[0-9a-f]{64}$/u.test(row.tarballSha256)))
  assert.ok(results.filter(row => row.status === 'unavailable').every(row => row.reason?.length > 0))
  return results
}
