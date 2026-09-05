import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadLayeredEnv } from 'file:///C:/Users/rone/Documents/deepseek-harness/packages/boot/app-boot/lib/index.js'
import { normalizeTool } from 'file:///D:/WorkSpace/harness_temp/cc-wf-studio/dsh-workflow-designer/src/host/adapter.js'

const cliLib = 'C:/Users/rone/Documents/deepseek-harness/apps/cli/lib'
const candidates = (await readdir(cliLib)).filter(name => name.startsWith('profile-boot-') && name.endsWith('.js'))
let runProfile
for (const candidate of candidates) {
  const path = join(cliLib, candidate)
  if (!(await readFile(path, 'utf8')).includes('export { runProfile };')) continue
  ;({ runProfile } = await import(pathToFileURL(path).href))
  break
}
if (runProfile === undefined) throw new Error('built Harness runProfile entry was not found')

const overlay = new URL('../tests/fixtures/verification.patch.yml', import.meta.url).pathname.slice(1)
const { ctx } = await runProfile({
  environment: loadLayeredEnv('dsh'),
  profile: 'web',
  patchFiles: [overlay],
  args: ['--host', '127.0.0.1', '--port', '3199'],
})

try {
  const schemas = await ctx.tools.schemas()
  const definition = schemas.find(schema => schema.name === 'ima_ask')
  if (definition === undefined) throw new Error('real profile did not register ima_ask')
  const designer = normalizeTool(definition)
  const client = ctx.clientModules.graph().entries.find(entry => entry.id === 'dsh-ima-copilot')
  if (client === undefined) throw new Error('real profile did not compose dsh-ima-copilot/client')
  process.stdout.write(`${JSON.stringify({
    tool: { name: definition.name, designerKind: designer.kind, locator: designer.locator },
    client: { id: client.id, url: client.url, inject: client.inject },
  }, null, 2)}\n`)
} finally {
  await ctx.fiber.dispose()
}
