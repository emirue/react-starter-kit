/**
 * Browser-safe helpers shared by the applications in this workspace.
 * Do not import Node.js modules, database clients or server secrets here.
 */
export function formatList(items: readonly string[], locale = "en"): string {
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items)
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`)
}
