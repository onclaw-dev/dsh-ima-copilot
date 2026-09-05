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
    '## 逐 Tag 状态', '',
    '| Harness tag | commit | HIF | adapter | audited | registry | package | live |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ]
  for (const row of records) {
    const { manifest, verification } = row
    lines.push(`| \`${manifest.tag}\` | \`${manifest.commit}\` | \`${manifest.interfaceFamily}\` | \`${manifest.adapter}\` | ${verification.audited.status} | ${verification.registry.status} | ${verification.packageVerification.status} | ${verification.liveSmoke.status} |`)
  }
  lines.push('', '## 接口差异', '')
  for (const row of records) lines.push(`- \`${row.manifest.tag}\`：${row.interfaceRecord.interfaceDelta.join('；')}`)
  lines.push('', '## 状态语义', '',
    '- `audited` 仅证明不可变源码和 IMA 调用面已审查。',
    '- `registry` 仅证明精确直接包可获得。',
    '- `package` 只有同一正式 tarball 在隔离依赖中通过后才能为 `passed`。',
    '- `live` 需要已有有效凭证与 Web profile；未运行不会阻止源码审计，但不能提升正式支持声明。', '',
    '`dsh-v0.1.2-alpha.1` 因 Node 24 Client Loader 缺陷仅保留源码审计；registry 不完整的版本不列入正式安装支持。', '')
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
