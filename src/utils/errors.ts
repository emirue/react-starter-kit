/** A user-facing error: printed without a stack trace, exits with code 1. */
export class ProduxError extends Error {
  readonly issues: string[]
  readonly hint: string | undefined

  constructor(issues: string | string[], hint?: string) {
    const list = Array.isArray(issues) ? issues : [issues]
    super(list.join("\n"))
    this.name = "ProduxError"
    this.issues = list
    this.hint = hint
  }
}
