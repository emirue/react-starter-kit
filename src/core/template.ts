export interface TemplateContext {
  flags: ReadonlySet<string>
  vars: Readonly<Record<string, string>>
}

// One directive per line, in any comment style the target file allows:
//   // @if a && !b      {/* @if a */}      /* @if a */      # @if a      <!-- @if a -->
const DIRECTIVE = /^\s*(?:\/\/|#|\{\/\*|\/\*|<!--)\s*@(if|else|endif)\b\s*(.*?)\s*(?:\*\/\}|\*\/|-->)?\s*$/
const FLAG = /^!?[a-z0-9][a-z0-9:-]*$/

function evaluate(expr: string, flags: ReadonlySet<string>): boolean {
  const groups = expr.split("||").map((g) => g.split("&&").map((t) => t.trim()))
  if (groups.flat().some((t) => !FLAG.test(t))) throw new Error(`Invalid template expression: "${expr}"`)
  return groups.some((g) => g.every((t) => (t.startsWith("!") ? !flags.has(t.slice(1)) : flags.has(t))))
}

export function renderTemplate(source: string, ctx: TemplateContext): string {
  const out: string[] = []
  // Each frame: is this branch active, and has any branch of this block matched.
  const stack: { active: boolean; matched: boolean }[] = []
  const active = () => stack.every((f) => f.active)

  for (const line of source.split("\n")) {
    const m = DIRECTIVE.exec(line)
    if (!m) {
      if (active()) out.push(line)
      continue
    }
    const [, kind, expr = ""] = m
    if (kind === "if") {
      const ok = evaluate(expr, ctx.flags)
      stack.push({ active: ok, matched: ok })
    } else if (kind === "else") {
      const top = stack.at(-1)
      if (!top) throw new Error("@else without @if")
      top.active = !top.matched
      top.matched = true
    } else {
      if (!stack.pop()) throw new Error("@endif without @if")
    }
  }
  if (stack.length) throw new Error("Missing @endif")

  return out
    .join("\n")
    .replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, name: string) => {
      const value = ctx.vars[name]
      if (value === undefined) throw new Error(`Unknown template variable: ${name}`)
      return value
    })
    .replace(/\n{3,}/g, "\n\n")
}
