import { lstat, mkdir, realpath, symlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const root = process.argv[2]
if (root === undefined) throw new Error('usage: npm run link:harness -- <deepseek-harness-repository>')

const links = {
  cordis: 'vendor/cordis',
  schemastery: 'vendor/schemastery',
  'dsh-tools': 'packages/core/tools',
  'dsh-credentials': 'packages/credentials/credentials',
  'dsh-client-connection': 'packages/client/connection',
  'dsh-client-runtime': 'packages/client/runtime',
  'dsh-client-ui-slots': 'packages/client/ui-slots',
  'dsh-client-ui-settings-plugins': 'packages/client/ui-settings-plugins',
}

const scope = resolve('node_modules/@deepseek-ai')
await mkdir(scope, { recursive: true })
for (const [name, relative] of Object.entries(links)) {
  const source = resolve(root, relative)
  const target = join(scope, name)
  await lstat(source)
  try {
    const [actual, expected] = await Promise.all([realpath(target), realpath(source)])
    if (actual !== expected) throw new Error(`${target} already resolves to ${actual}`)
    continue
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      await mkdir(dirname(target), { recursive: true })
      await symlink(source, target, process.platform === 'win32' ? 'junction' : 'dir')
      continue
    }
    throw error
  }
}

process.stdout.write(`Linked Harness packages from ${resolve(root)}\n`)
