import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const forbidden = ['@deepseek', 'ai'].join('-')
const ignored = new Set(['.git', '.npm-cache', 'node_modules'])
const matches = []

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      await scan(path)
      continue
    }
    if (!entry.isFile()) continue
    const data = await readFile(path)
    if (data.includes(0)) continue
    const text = data.toString('utf8')
    for (const [index, line] of text.split(/\r?\n/u).entries()) {
      if (line.includes(forbidden)) matches.push(`${relative(root, path)}:${index + 1}`)
    }
  }
}

await scan(root)
if (matches.length > 0) {
  throw new Error(`real Harness package scope is forbidden:\n${matches.join('\n')}`)
}
process.stdout.write('Loader boundary check passed\n')
