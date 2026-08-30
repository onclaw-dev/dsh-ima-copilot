/** One source returned by IMA for an answer. */
export interface ImaReference {
  id: string
  title: string
  subtitle?: string
  introduction?: string
  timestamp?: number
  knowledgeBase?: string
}

/** Canonical lossless value returned by the native tool. */
export interface ImaAnswer {
  answer: string
  references: ImaReference[]
}

/** Secrets resolved at the start of one Harness operation. */
export interface ImaCredentials {
  xImaCookie: string
  xImaBkn: string
}
