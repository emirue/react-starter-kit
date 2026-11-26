const RESERVED = new Set(["node_modules", "favicon.ico"])
const VALID = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

/** npm package-name rules. Returns an error message, or undefined when valid. */
export function validatePackageName(name: string): string | undefined {
  if (!name) return "Name must not be empty."
  if (name.length > 214) return "Name must be at most 214 characters."
  if (RESERVED.has(name)) return `"${name}" is a reserved name.`
  if (name !== name.toLowerCase()) return "Name must be lowercase."
  if (/^[._]/.test(name)) return "Name must not start with . or _."
  if (!VALID.test(name)) return "Name may only contain lowercase letters, digits, -, ., _ and ~ (optionally @scope/)."
  return undefined
}

/** A name validatePackageName accepts (or ""), for the "Try ..." hint after an invalid name. */
export function toValidPackageName(input: string): string {
  const name = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-~._]+/g, "-")
    .replace(/^[._-]+/, "")
    .slice(0, 214)
    .replace(/[._-]+$/, "")
  return RESERVED.has(name) ? `${name}-app` : name
}

const SAFE_DIR = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/

/**
 * App directories end up in YAML, Dockerfiles and CI files, so only a plain
 * relative path is accepted: letters, digits, ".", "_", "-" and "/" segments.
 */
export function validateRelativeDir(dir: string): string | undefined {
  if (!SAFE_DIR.test(dir) || dir.split("/").some((seg) => seg === "." || seg === "..")) {
    return "must be a relative path made of letters, digits, '.', '_', '-' and '/' (no '..', spaces or drive letters)"
  }
  return undefined
}
