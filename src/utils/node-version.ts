type Triple = [number, number, number]

const parse = (v: string): Triple => {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v.trim())
  if (!m) throw new Error(`Unsupported version: ${v}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

const cmp = (a: Triple, b: Triple) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]

/** Supports the subset used here: "^x.y.z", ">=x.y.z", joined with "||". Prereleases count as their release. */
export function satisfies(version: string, range: string): boolean {
  const v = parse(version)
  return range.split("||").some((part) => {
    const m = /^\s*(\^|>=)\s*(\d+\.\d+\.\d+)\s*$/.exec(part)
    if (!m) throw new Error(`Unsupported version range: ${part.trim()}`)
    const min = parse(m[2]!)
    return m[1] === ">=" ? cmp(v, min) >= 0 : v[0] === min[0] && cmp(v, min) >= 0
  })
}
