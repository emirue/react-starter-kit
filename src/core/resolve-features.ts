import { ProduxError } from "../utils/errors.ts"
import type { PackageManager } from "../adapters/package-manager.ts"
import { FEATURES, type FeatureDef, type ProjectMode } from "./features.ts"

export interface FeatureInput {
  include: string[]
  /** Features the user explicitly removed. */
  exclude?: string[]
  mode: ProjectMode
  packageManager?: PackageManager
  /** Development only: allow features that are not validated yet. */
  allowUnverified?: boolean
}

export interface ResolvedFeatures {
  features: string[]
  added: { id: string; requiredBy: string }[]
}

export function resolveFeatures(input: FeatureInput, registry: FeatureDef[] = FEATURES): ResolvedFeatures {
  const byId = new Map(registry.map((f) => [f.id, f]))
  const exclude = new Set(input.exclude ?? [])
  const issues: string[] = []

  for (const id of [...input.include, ...exclude]) {
    if (!byId.has(id)) issues.push(`Unknown feature "${id}".`)
  }
  if (issues.length) throw new ProduxError(issues, `Known features: ${registry.map((f) => f.id).join(", ")}`)

  const selected = new Set(input.include.filter((id) => !exclude.has(id)))
  const added: ResolvedFeatures["added"] = []

  // Depth-first so transitive requirements and cycles are both found.
  const visit = (id: string, path: string[]) => {
    if (path.includes(id)) {
      issues.push(`Circular requirement: ${[...path.slice(path.indexOf(id)), id].join(" -> ")}`)
      return
    }
    const feature = byId.get(id)!
    const needs = [...(feature.requires ?? [])]
    for (const options of feature.requiresOneOf ?? []) {
      const present = options.find((o) => selected.has(o))
      needs.push(present ?? options.find((o) => !exclude.has(o)) ?? options[0]!)
    }
    for (const dep of needs) {
      if (exclude.has(dep)) {
        issues.push(`"${id}" requires "${dep}". Either keep "${dep}" or remove "${id}".`)
        continue
      }
      if (!selected.has(dep)) {
        selected.add(dep)
        added.push({ id: dep, requiredBy: id })
      }
      visit(dep, [...path, id])
    }
  }
  for (const id of [...selected]) visit(id, [])

  for (const id of selected) {
    const feature = byId.get(id)!
    for (const other of feature.conflicts ?? []) {
      // Report each conflicting pair once.
      if (selected.has(other) && id < other) issues.push(`"${id}" conflicts with "${other}". Choose one.`)
    }
    if (feature.modes && !feature.modes.includes(input.mode)) {
      issues.push(`"${id}" is not available in ${input.mode} mode.`)
    }
    if (feature.unverified && !input.allowUnverified) {
      issues.push(`"${id}" is not available in this release (not validated yet).`)
    }
    if (input.packageManager && feature.packageManagers && !feature.packageManagers.includes(input.packageManager)) {
      issues.push(`"${id}" is not supported with ${input.packageManager} yet (verified: ${feature.packageManagers.join(", ")}).`)
    }
  }
  if (issues.length) throw new ProduxError([...new Set(issues)])

  return {
    features: registry.map((f) => f.id).filter((id) => selected.has(id)),
    added,
  }
}
