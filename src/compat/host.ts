/** IMA-BASE-2 Host contract version. Diagnostic metadata only. */
export const IMA_HOST_CONTRACT = 'IMA-BASE-2' as const

export interface ResolvedCredentialValue {
  value: string
  source?: string
}

export interface ImaToolRunContext {
  signal: AbortSignal
}

export interface ImaToolDefinition {
  readonly name: string
  readonly description: string
  readonly parameters: Record<string, unknown>
  readonly output: {
    readonly schema: Record<string, unknown>
    render(args: unknown, value: unknown): Array<{ type: string; text?: string }>
  }
  readonly timeoutMs?: number
  execute(args: unknown, exec: ImaToolRunContext): Promise<unknown>
}

export interface ImaToolSpec<Args, Value> {
  readonly name: string
  readonly description: string
  readonly parameters: Record<string, unknown>
  readonly output: {
    readonly schema: Record<string, unknown>
    render(args: Args, value: Value): Array<{ type: 'text'; text: string }>
  }
  readonly timeoutMs?: number
  execute(args: Args, exec: ImaToolRunContext): Promise<Value>
}

interface NativeHostContext {
  readonly credentials: {
    resolve(ref: string): Promise<ResolvedCredentialValue | undefined>
  }
  readonly tools: {
    register(tool: ImaToolDefinition): () => void
  }
  effect(callback: () => void | (() => void), label?: string): unknown
}

/** Host operations consumed by IMA business code. Raw Harness contexts never cross this boundary. */
export interface ImaHostContract {
  readonly contract: typeof IMA_HOST_CONTRACT
  resolveCredential(ref: string): Promise<ResolvedCredentialValue | undefined>
  registerTool(tool: ImaToolDefinition): () => void
  effect(callback: () => void | (() => void), label: string): void
}

const CREDENTIAL_REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/u

export function validateCredentialReference(value: string): string {
  if (!CREDENTIAL_REF_PATTERN.test(value)) {
    throw new TypeError(`credential ref "${value}" must match ${String(CREDENTIAL_REF_PATTERN)}`)
  }
  return value
}

/** Compile the plugin-owned tool spec at the sole native tools boundary. */
export function defineCompatibleTool<Args, Value>(spec: ImaToolSpec<Args, Value>): ImaToolDefinition {
  if (spec.timeoutMs !== undefined && (!Number.isFinite(spec.timeoutMs) || spec.timeoutMs <= 0)) {
    throw new Error(`defineCompatibleTool(${spec.name}): timeoutMs must be a positive finite number`)
  }
  const parameters = compileParameterSchema(spec.parameters)
  const outputSchema = compileValueSchema(spec.output.schema)
  return {
    name: spec.name,
    description: spec.description,
    parameters,
    output: {
      schema: outputSchema,
      render: (args, value) => spec.output.render(args as Args, value as Value),
    },
    ...(spec.timeoutMs === undefined ? {} : { timeoutMs: spec.timeoutMs }),
    async execute(args, exec) {
      const violations = validateParameters(parameters, args)
      if (violations.length > 0) throw new Error(`invalid arguments: ${violations.join('; ')}`)
      return spec.execute(args as Args, exec)
    },
  }
}

function compileParameterSchema(properties: Record<string, unknown>): Record<string, unknown> {
  const compiled: Record<string, unknown> = {}
  const required: string[] = []
  for (const [name, value] of Object.entries(properties)) {
    const property = value as Record<string, unknown>
    if (property.required === true) required.push(name)
    compiled[name] = compileValueSchema(property)
  }
  return { type: 'object', properties: compiled, ...(required.length === 0 ? {} : { required }) }
}

function compileValueSchema(value: Record<string, unknown>): Record<string, unknown> {
  const compiled: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'required') continue
    if (key === 'properties' && typeof entry === 'object' && entry !== null) {
      const properties: Record<string, unknown> = {}
      const required: string[] = []
      for (const [name, childValue] of Object.entries(entry)) {
        const child = childValue as Record<string, unknown>
        if (child.required === true) required.push(name)
        properties[name] = compileValueSchema(child)
      }
      compiled.properties = properties
      if (required.length > 0) compiled.required = required
    } else if (key === 'items' && typeof entry === 'object' && entry !== null) {
      compiled.items = compileValueSchema(entry as Record<string, unknown>)
    } else {
      compiled[key] = entry
    }
  }
  return compiled
}

function validateParameters(schema: Record<string, unknown>, value: unknown): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return ['arguments must be an object']
  const candidate = value as Record<string, unknown>
  const properties = schema.properties as Record<string, Record<string, unknown>>
  const violations: string[] = []
  for (const name of schema.required as string[] | undefined ?? []) {
    if (!(name in candidate)) violations.push(`${name}: required`)
  }
  for (const [name, entry] of Object.entries(candidate)) {
    const property = properties[name]
    if (property?.type === 'string' && typeof entry !== 'string') violations.push(`${name}: expected string`)
  }
  return violations
}

/** Build the shared structural Host adapter accepted by every audited interface family. */
export function createHostContract(context: unknown): ImaHostContract {
  const ctx = context as NativeHostContext
  const contract: ImaHostContract = {
    contract: IMA_HOST_CONTRACT,
    resolveCredential: ref => ctx.credentials.resolve(validateCredentialReference(ref)),
    registerTool: tool => ctx.tools.register(tool),
    effect(callback, label) { void ctx.effect(callback, label) },
  }
  return contract
}
