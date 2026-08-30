/** Credential reference containing the complete X-Ima-Cookie header. */
export const IMA_X_IMA_COOKIE_REF = 'IMA_X_IMA_COOKIE'

/** Credential reference containing the X-Ima-Bkn header. */
export const IMA_X_IMA_BKN_REF = 'IMA_X_IMA_BKN'

/** Runtime reference containing newline- or comma-separated IMA knowledge-base IDs. */
export const IMA_KNOWLEDGE_BASE_IDS_REF = 'IMA_KNOWLEDGE_BASE_IDS'

/** Secret authentication references. */
export const IMA_CREDENTIAL_REFS = [IMA_X_IMA_COOKIE_REF, IMA_X_IMA_BKN_REF] as const

/** All dynamic values managed by both the Host tool and Web settings card. */
export const IMA_RUNTIME_REFS = [...IMA_CREDENTIAL_REFS, IMA_KNOWLEDGE_BASE_IDS_REF] as const
