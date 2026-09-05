import { execFile } from 'node:child_process'
import { lstat, mkdir, readFile, realpath, rm, symlink } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { promisify } from 'node:util'

const root = process.argv[2]
if (root === undefined) throw new Error('usage: npm run link:harness -- <deepseek-harness-repository>')

const execFileAsync = promisify(execFile)
const pluginPackage = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const expectedHarness = pluginPackage.deepseekHarness
if (expectedHarness?.commit === undefined || expectedHarness?.version === undefined) {
  throw new Error('package.json must declare deepseekHarness.commit and deepseekHarness.version')
}

const harnessRoot = resolve(root)
const [{ stdout: actualCommit }, harnessPackageText] = await Promise.all([
  execFileAsync('git', ['-C', harnessRoot, 'rev-parse', 'HEAD']),
  readFile(join(harnessRoot, 'package.json'), 'utf8'),
])
const harnessPackage = JSON.parse(harnessPackageText)
if (actualCommit.trim() !== expectedHarness.commit) {
  throw new Error(
    `Harness commit mismatch: expected ${expectedHarness.commit}, received ${actualCommit.trim()}`,
  )
}
if (harnessPackage.version !== expectedHarness.version) {
  throw new Error(
    `Harness version mismatch: expected ${expectedHarness.version}, received ${harnessPackage.version}`,
  )
}

const links = {
  cordis: 'vendor/cordis',
  schemastery: 'vendor/schemastery',
  'dsh-tools': 'packages/core/tools',
  'dsh-credentials': 'packages/credentials/credentials',
  'dsh-settings': 'packages/settings/settings',
  'dsh-api-remotes': 'packages/api/remotes',
  'dsh-client-connection': 'packages/client/connection',
  'dsh-client-ui-renderer': 'packages/client/ui-renderer',
  'dsh-client-ui-slots': 'packages/client/ui-slots',
  'dsh-client-ui-settings-plugins': 'packages/client/ui-settings-plugins',
}

const scope = resolve('node_modules/@deepseek-ai')
await mkdir(scope, { recursive: true })
for (const [name, relativePath] of Object.entries(links)) {
  const source = resolve(harnessRoot, relativePath)
  const target = join(scope, name)
  await lstat(source)
  try {
    const [actual, expected] = await Promise.all([realpath(target), realpath(source)])
    if (actual === expected) continue
    const targetRelative = relative(scope, target)
    if (targetRelative.startsWith('..') || resolve(scope, targetRelative) !== target) {
      throw new Error(`refusing to replace dependency outside ${scope}: ${target}`)
    }
    await rm(target, { recursive: true, force: true })
    await symlink(source, target, process.platform === 'win32' ? 'junction' : 'dir')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      await mkdir(dirname(target), { recursive: true })
      await symlink(source, target, process.platform === 'win32' ? 'junction' : 'dir')
      continue
    }
    throw error
  }
}

process.stdout.write(
  `Linked Harness ${expectedHarness.version} (${expectedHarness.commit.slice(0, 12)}) from ${harnessRoot}\n`,
)
