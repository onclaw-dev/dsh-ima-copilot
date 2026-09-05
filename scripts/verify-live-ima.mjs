import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const checkout = process.argv[2] ?? process.env.DSH_HARNESS_CHECKOUT ?? '/Users/roncao/deepseek-harness/dsh-v0.1.1-rc.2'
const appBoot = await import(pathToFileURL(join(checkout, 'packages/boot/app-boot/lib/index.js')).href)
const { loadLayeredEnv } = appBoot
const cliLib = join(checkout, 'apps/cli/lib')
const candidates = (await readdir(cliLib)).filter(name => name.startsWith('profile-boot-') && name.endsWith('.js'))
let runProfile
for (const candidate of candidates) {
  const path = join(cliLib, candidate)
  if (!(await readFile(path, 'utf8')).includes('export { runProfile };')) continue
  ;({ runProfile } = await import(pathToFileURL(path).href))
  break
}
if (runProfile === undefined) throw new Error('built Harness runProfile entry was not found')

const { ctx } = await runProfile({
  environment: loadLayeredEnv('dsh'),
  profile: 'web',
  patchFiles: [],
  args: ['--host', '127.0.0.1', '--port', '3198'],
})

try {
  const definition = ctx.tools.get('ima_ask')
  if (definition === undefined) throw new Error('real profile did not register ima_ask')

  const stored = await ctx.credentials.resolve('IMA_KNOWLEDGE_BASE_IDS')
  const knowledgeBaseId = stored?.value.split(/[\r\n,]+/u).map(value => value.trim()).find(Boolean)
  const result = await definition.execute({
    question: '这是一次插件连通性测试。请只简短回答：连接测试成功。',
    ...(knowledgeBaseId === undefined ? {} : { knowledgeBaseId }),
  }, { signal: AbortSignal.timeout(300_000) })

  process.stdout.write(`${JSON.stringify({
    ok: true,
    answerLength: typeof result?.answer === 'string' ? result.answer.length : 0,
    referenceCount: Array.isArray(result?.references) ? result.references.length : 0,
  }, null, 2)}\n`)
} catch (cause) {
  const message = cause instanceof Error ? cause.message : String(cause)
  process.stderr.write(`${JSON.stringify({ ok: false, error: message }, null, 2)}\n`)
  process.exitCode = 1
} finally {
  await ctx.fiber.dispose()
}
