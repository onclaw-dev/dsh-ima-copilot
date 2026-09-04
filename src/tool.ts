import type { ResolvedConfig } from './config.js'
import type { CredentialsService, ImaHostContext } from './dsh-contract.js'
import { ImaClient } from './ima-client.js'
import type { ImaAnswer, ImaCredentials } from './types.js'
import {
  IMA_KNOWLEDGE_BASE_IDS_REF, IMA_RUNTIME_REFS, IMA_X_IMA_BKN_REF, IMA_X_IMA_COOKIE_REF,
} from './credential-refs.js'

/** Stable model-visible tool name used by Harness and Designer discovery. */
export const IMA_TOOL_NAME = 'ima_ask'

/**
 * Build the native IMA tool around the supplied runtime client.
 * @param ctx - Harness context owning credential resolution.
 * @param config - resolved static plugin configuration.
 * @param client - IMA transport client.
 * @returns registry-ready native tool definition.
 */
export function createImaTool(ctx: ImaHostContext, config: ResolvedConfig, client: ImaClient) {
  return ctx.dshLoader.dsh.tools.defineTool({
    name: IMA_TOOL_NAME,
    description: 'Ask Tencent IMA Copilot a question using one configured knowledge base.',
    parameters: {
      question: {
        type: 'string',
        required: true,
        description: 'The non-empty question to answer from IMA.',
      },
      knowledgeBaseId: {
        type: 'string',
        description: 'Configured knowledge-base ID. Required when more than one is available.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          answer: { type: 'string', required: true },
          references: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', required: true },
                title: { type: 'string', required: true },
                subtitle: { type: 'string' },
                introduction: { type: 'string' },
                timestamp: { type: 'number' },
                knowledgeBase: { type: 'string' },
              },
            },
          },
        },
      },
      render: (_args: unknown, value: ImaAnswer) => [{
        type: 'text',
        text: renderAnswer(value.answer, value.references),
      }],
    },
    timeoutMs: config.requestTimeoutMs,
    async execute(args: { question: string; knowledgeBaseId?: string }, exec: { signal: AbortSignal }) {
      const question = args.question.trim()
      if (question.length === 0) throw new Error('ima_ask: question must be non-empty')
      const runtime = await resolveRuntimeState(ctx)
      const knowledgeBaseId = selectKnowledgeBase(runtime.knowledgeBaseIds, args.knowledgeBaseId)
      return client.ask(question, knowledgeBaseId, runtime.credentials, exec.signal)
    },
  })
}

/** Dynamic IMA state checked immediately before one tool operation. */
export interface ImaRuntimeState {
  credentials: ImaCredentials
  knowledgeBaseIds: string[]
}

/**
 * Resolve and validate all dynamic IMA state without retaining it in plugin state.
 * @param ctx - Harness credential provider context.
 * @returns operation-local authentication and knowledge-base allowlist.
 */
export async function resolveRuntimeState(ctx: ImaHostContext): Promise<ImaRuntimeState> {
  const credentials = ctx.dshLoader.services.get<CredentialsService>('credentials')
  if (credentials === undefined) throw new Error('ima_ask: credential service is unavailable')
  const credentialRef = ctx.dshLoader.dsh.credentials.credentialRef
  const [cookie, bkn, knowledgeBaseIdsValue] = await Promise.all([
    credentials.resolve(credentialRef(IMA_X_IMA_COOKIE_REF)),
    credentials.resolve(credentialRef(IMA_X_IMA_BKN_REF)),
    credentials.resolve(credentialRef(IMA_KNOWLEDGE_BASE_IDS_REF)),
  ])
  const resolved = [cookie, bkn, knowledgeBaseIdsValue]
  const missing = IMA_RUNTIME_REFS.filter((_, index) => resolved[index]?.value.trim().length === 0 || resolved[index] === undefined)
  if (missing.length > 0) {
    throw new Error(
      `ima_ask: configuration check failed; configure ${missing.join(', ')} in Settings > Plugins > Configurable > IMA Copilot`,
    )
  }
  const knowledgeBaseIds = parseKnowledgeBaseIds(knowledgeBaseIdsValue!.value)
  if (knowledgeBaseIds.length === 0) {
    throw new Error(
      `ima_ask: configuration check failed; ${IMA_KNOWLEDGE_BASE_IDS_REF} must contain at least one knowledge-base ID`,
    )
  }
  return {
    credentials: { xImaCookie: cookie!.value, xImaBkn: bkn!.value },
    knowledgeBaseIds,
  }
}

/** Parse the write-only settings value into a stable unique allowlist. */
export function parseKnowledgeBaseIds(value: string): string[] {
  return [...new Set(value.split(/[\r\n,]+/u).map(id => id.trim()).filter(Boolean))]
}

/**
 * Select an allowed knowledge base from tool input and deployment state.
 * @param configured - allowlisted IDs.
 * @param requested - optional tool selector.
 * @returns selected ID.
 */
export function selectKnowledgeBase(configured: readonly string[], requested?: string): string {
  const selected = requested?.trim()
  if (selected !== undefined && selected.length > 0) {
    if (!configured.includes(selected)) throw new Error('ima_ask: knowledgeBaseId is not configured')
    return selected
  }
  if (configured.length === 1) return configured[0]!
  throw new Error('ima_ask: knowledgeBaseId is required when multiple knowledge bases are configured')
}

function renderAnswer(
  answer: string,
  references: ReadonlyArray<{
    id: string
    title: string
    subtitle?: string
    introduction?: string
    timestamp?: number
    knowledgeBase?: string
  }>,
): string {
  if (references.length === 0) return answer
  const lines = references.map((reference, index) => {
    const source = reference.knowledgeBase === undefined ? '' : ` — ${reference.knowledgeBase}`
    return `${index + 1}. ${reference.title}${source} (${reference.id})`
  })
  return `${answer}\n\nReferences:\n${lines.join('\n')}`
}
