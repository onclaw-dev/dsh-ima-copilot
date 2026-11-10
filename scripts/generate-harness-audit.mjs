import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateHarnessCompatibility } from './validate-harness-compatibility.mjs'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'docs/harness-interface-contract-audit.md')

export function renderHarnessAudit(snapshot = validateHarnessCompatibility(root)) {
  const { index, records } = snapshot
  const base = records.find(row => row.manifest.base).manifest
  const lines = [
    '# DeepSeek Harness 兼容档案（机器记录派生）', '',
    '> 本文件由 `scripts/generate-harness-audit.mjs` 从 `patch/` 生成，请勿直接编辑。', '',
    `- 唯一内部契约：\`${index.baseContract}\``,
    `- 开发基线：\`${base.tag}\` / \`${base.version}\` / \`${base.commit}\``,
    `- Client provider 注入：${index.providerInjection.map(value => `\`${value}\``).join('、')}`, '',
    '## 接口族与兼容策略', '',
    '| HIF | 版本范围 | Client 凭证 | Config | adapter composition |',
    '| --- | --- | --- | --- | --- |',
  ]
  for (const family of index.families) {
    const first = family.releases[0]
    const last = family.releases.at(-1)
    lines.push(`| \`${family.id}\` | \`${first}\` ～ \`${last}\` | ${family.credentials} | ${family.config} | \`${family.credentialsAdapter}\` + \`${family.configAdapter}\` |`)
  }
  lines.push('',
    '三族中的 Host `credentials.resolve`、`tools.register(ToolDefinition)`、工具输出渲染与 `AbortSignal` 调用面保持结构兼容；无需按 tag 分叉业务实现。', '',
    '## 逐 Tag 状态', '',
    '| Harness tag | commit | HIF | source | registry | package | bundle | runtime | live IMA |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const row of records) {
    const { manifest, result } = row
    lines.push(`| \`${manifest.tag}\` | \`${manifest.commit}\` | \`${manifest.interfaceFamily}\` | ${result.sourceAudit} | ${result.registry} | ${result.packageSmoke} | ${result.bundleSmoke} | ${result.runtimeSmoke} | ${result.liveIma} |`)
  }
  lines.push('', '## 状态语义', '',
    '- `source` 仅证明不可变源码和 IMA 调用面已审查。',
    '- `registry` 仅证明精确直接包可获得。',
    '- `package` 只有同一正式 tarball 在隔离依赖中通过后才能为 `passed`。',
    '- `bundle` 是合成 Context smoke，不等于真实 Harness 加载。',
    '- `runtime` 只有实际 Harness Client/Host 加载后才能提升。',
    '- `live IMA` 需要有效凭证；用户确认的现行基线记为 `operator-passed`。', '',
    '`dsh-v0.1.2-alpha.1` 是环境契约明确排除项，不在本表中。`dsh-v0.1.3-alpha.1` 的不可变源码与 gateway bundle smoke 已通过，但其精确历史 npm 包未发布，因此不能声称完成 registry 安装验证。', '')
  return lines.join('\n')
}

const rendered = renderHarnessAudit()
if (process.argv.includes('--check')) {
  assert.equal(readFileSync(output, 'utf8'), rendered, 'generated audit is stale; run npm run docs:harness')
  console.log('Generated Harness audit is current.')
} else {
  writeFileSync(output, rendered)
  console.log(`Generated ${output}`)
}
