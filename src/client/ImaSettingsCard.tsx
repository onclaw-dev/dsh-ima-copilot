import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import {
  IMA_RUNTIME_REFS, describeImaSettings, saveImaSettings, type CredentialState,
} from './credentials.js'
import { IMA_CREDENTIAL_REFS, IMA_KNOWLEDGE_BASE_IDS_REF } from '../credential-refs.js'

/** Harness settings card for dynamic IMA authentication and knowledge-base state. */
export function ImaSettingsCard() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [state, setState] = useState<Record<string, CredentialState>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  const refresh = useCallback(async () => {
    setState(await describeImaSettings())
  }, [])

  useEffect(() => {
    void refresh().catch(cause => setError(cause instanceof Error ? cause.message : String(cause)))
  }, [refresh])

  const save = async (): Promise<void> => {
    setSaving(true)
    setError(undefined)
    try {
      await saveImaSettings(values)
      setValues({})
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setSaving(false)
    }
  }

  const stored = IMA_RUNTIME_REFS.every(ref => state[ref]?.configured === true)
  const dirty = IMA_RUNTIME_REFS.some(ref => (values[ref]?.trim().length ?? 0) > 0)

  return (
    <div style={styles.card} data-testid="ima-settings-card">
      <div style={styles.header}>
        <span style={styles.heading}>
          <span style={styles.titleRow}>
            <strong style={styles.title}>IMA Copilot</strong>
            {dirty ? <span style={styles.pending}>有未保存修改</span> : null}
          </span>
          <span style={styles.summary}>配置 IMA 认证与知识库。</span>
        </span>
      </div>

      <div style={styles.body}>
        <p style={styles.description}>
          更新从 ima.qq.com 获取的认证信息和知识库 ID。ima_ask 会在每次调用前读取最新配置，
          无需重启。
        </p>
        <p style={stored ? styles.ready : styles.warning}>
          {stored
            ? '配置已保存，将在下次调用时验证认证有效性'
            : '配置不完整，请填写全部三个字段'}
        </p>
        {IMA_CREDENTIAL_REFS.map(ref => (
          <label key={ref} style={styles.field}>
            <span style={styles.label}>{ref === 'IMA_X_IMA_COOKIE' ? 'X-Ima-Cookie' : 'X-Ima-Bkn'}</span>
            <input
              type="password"
              autoComplete="off"
              value={values[ref] ?? ''}
              placeholder={state[ref]?.configured ? '已配置，输入新值可替换' : '尚未配置'}
              disabled={state[ref]?.writable === false || saving}
              onChange={event => setValues(current => ({ ...current, [ref]: event.target.value }))}
              style={styles.input}
            />
            <FieldState state={state[ref]} />
          </label>
        ))}
        <label style={styles.field}>
          <span style={styles.label}>知识库 ID</span>
          <textarea
            rows={4}
            value={values[IMA_KNOWLEDGE_BASE_IDS_REF] ?? ''}
            placeholder={state[IMA_KNOWLEDGE_BASE_IDS_REF]?.configured
              ? '已配置，输入完整列表可替换'
              : '每行一个 ID，或使用逗号分隔'}
            disabled={state[IMA_KNOWLEDGE_BASE_IDS_REF]?.writable === false || saving}
            onChange={event => setValues(current => ({
              ...current, [IMA_KNOWLEDGE_BASE_IDS_REF]: event.target.value,
            }))}
            style={{ ...styles.input, ...styles.textarea }}
          />
          <small style={styles.hint}>保存时会替换完整知识库列表，已保存内容不会回显。</small>
          <FieldState state={state[IMA_KNOWLEDGE_BASE_IDS_REF]} />
        </label>
        {error === undefined ? null : <p role="alert" style={styles.error}>{error}</p>}
        <div style={styles.footer}>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => { void save() }}
            style={styles.saveButton}
          >
            {saving ? '保存中…' : '保存更新'}
          </button>
        </div>
        <small style={styles.hint}>
          如果 IMA 返回 code 41，请从同一个当前浏览器请求中重新获取 X-Ima-Cookie 和
          X-Ima-Bkn，并同时替换。
        </small>
      </div>
    </div>
  )
}

function FieldState({ state }: { state: CredentialState | undefined }) {
  const sourceNames: Record<string, string> = {
    file: '本地凭证文件',
    env: '启动环境',
    'project-env': '项目 .env',
    'user-env': '用户 .env',
  }
  const source = state?.source === undefined ? undefined : (sourceNames[state.source] ?? state.source)

  return (
    <small style={styles.hint}>
      {state?.configured ? `已配置${source ? `，来源：${source}` : ''}` : '尚未配置'}
      {state?.writable === false ? ' · 只读' : ''}
    </small>
  )
}

const styles: Record<string, CSSProperties> = {
  card: {
    border: '1px solid var(--dsh-border-color, #d7d7d7)', borderRadius: 12,
    overflow: 'hidden', background: 'var(--dsh-card-background, transparent)',
  },
  header: {
    width: '100%', border: 0, padding: 16, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 16, background: 'transparent', color: 'inherit',
    textAlign: 'left', font: 'inherit',
  },
  heading: { minWidth: 0, display: 'grid', gap: 7 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  title: { fontSize: 16, lineHeight: 1.35 },
  summary: { opacity: 0.65, lineHeight: 1.4 },
  pending: {
    borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 500,
    color: '#9a5b00', background: 'rgba(196, 122, 0, 0.12)',
  },
  body: {
    borderTop: '1px solid var(--dsh-border-color, #e2e2e2)', padding: '16px',
    display: 'grid', gap: 16,
  },
  description: { margin: 0, opacity: 0.75, lineHeight: 1.6 },
  ready: { margin: 0, color: '#287a3d' },
  warning: { margin: 0, color: '#a05a00' },
  field: { display: 'grid', gap: 7 },
  label: { fontWeight: 600 },
  input: {
    width: '100%', boxSizing: 'border-box', border: '1px solid var(--dsh-border-color, #c8c8c8)',
    borderRadius: 8, padding: '9px 11px', background: 'transparent', color: 'inherit',
    font: 'inherit',
  },
  textarea: { resize: 'vertical', minHeight: 88 },
  hint: { opacity: 0.68, lineHeight: 1.45 },
  error: { margin: 0, color: '#c33' },
  footer: {
    borderTop: '1px solid var(--dsh-border-color, #e2e2e2)', paddingTop: 12,
    display: 'flex', justifyContent: 'flex-end',
  },
  saveButton: { borderRadius: 8, padding: '8px 14px', cursor: 'pointer' },
}
