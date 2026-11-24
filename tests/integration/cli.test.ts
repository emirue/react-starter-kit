import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative, resolve } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import pkg from "../../package.json" with { type: "json" }

const entry = resolve(import.meta.dirname, "../../src/index.ts")
let cwd: string

function cli(...args: string[]) {
  const r = spawnSync(process.execPath, [entry, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, npm_config_user_agent: "pnpm/11.13.0 node/v26 darwin arm64", CI: "1" },
  })
  return { code: r.status, out: `${r.stdout}${r.stderr}` }
}

async function tree(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const e of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (!e.isFile()) continue
    const rel = relative(dir, join(e.parentPath, e.name))
    out[rel] = createHash("sha256")
      .update(await readFile(join(dir, rel)))
      .digest("hex")
  }
  return out
}

beforeEach(async () => {
  cwd = await realpath(await mkdtemp(join(tmpdir(), "produx-cli-")))
})
afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

describe("create-produx-app CLI", () => {
  it("prints help and version", () => {
    const help = cli("--help")
    expect(help.code).toBe(0)
    expect(help.out).toContain("--preset <preset>")
    expect(help.out).toContain("--no-install")
    const version = cli("--version")
    expect(version.code).toBe(0)
    expect(version.out.trim()).toBe(pkg.version)
  })

  it("dry-run writes nothing", async () => {
    const r = cli("app", "--yes", "--dry-run")
    expect(r.code).toBe(0)
    expect(r.out).toContain("Dry run")
    expect(r.out).toContain("src/main.tsx")
    expect(await readdir(cwd)).toEqual([])
  })

  it("generates without installing and reports that it is not verified", async () => {
    const r = cli("app", "--yes", "--no-install", "--no-git")
    expect(r.code).toBe(0)
    expect(r.out).toContain("not fully verified")
    expect(existsSync(join(cwd, "app", "package.json"))).toBe(true)
    expect(existsSync(join(cwd, "app", ".git"))).toBe(false)
  })

  it("refuses a non-empty target directory and leaves it untouched", async () => {
    await mkdir(join(cwd, "app"))
    await writeFile(join(cwd, "app", "keep.txt"), "mine")
    const r = cli("app", "--yes", "--no-install")
    expect(r.code).toBe(1)
    expect(r.out).toContain("is not empty")
    expect(await readdir(join(cwd, "app"))).toEqual(["keep.txt"])
  })

  it.each([["My App"], ["UPPER"], ["_private"]])("rejects the invalid project name %j", async (name) => {
    const r = cli(name, "--yes", "--no-install")
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Invalid project name|must not start/)
  })

  it("requires a directory in non-interactive mode", () => {
    const r = cli("--yes")
    expect(r.code).toBe(1)
    expect(r.out).toContain("Missing project directory")
  })

  it("rejects unknown options and conflicting options", () => {
    expect(cli("app", "--bogus").code).toBe(1)
    const r = cli("app", "--mode", "standalone", "--turbo")
    expect(r.code).toBe(1)
    expect(r.out).toContain("--turbo")
  })

  it("rejects an invalid config file without writing", async () => {
    await writeFile(join(cwd, "bad.json"), JSON.stringify({ schemaVersion: 1, preset: "standard", token: "secret" }))
    const r = cli("app", "--yes", "--no-install", "--config", "bad.json")
    expect(r.code).toBe(1)
    expect(r.out).toContain("token")
    expect(existsSync(join(cwd, "app"))).toBe(false)
  })

  it("rejects feature and package-manager combinations that are not validated", () => {
    const r = cli("app", "--yes", "--no-install", "--package-manager", "bun", "--features", "+docker")
    expect(r.code).toBe(1)
    expect(r.out).toContain('"docker" is not supported with bun')
  })

  it("saves a config that reproduces the same project", async () => {
    const first = cli(
      "repro-alpha",
      "--yes",
      "--no-install",
      "--no-git",
      "--router",
      "tanstack-router",
      "--ui",
      "radix",
      "--save-config",
      "team.json"
    )
    expect(first.code).toBe(0)
    const saved = JSON.parse(await readFile(join(cwd, "team.json"), "utf8"))
    expect(saved).toMatchObject({ schemaVersion: 1, mode: "standalone", ui: { base: "radix", style: "nova" } })
    expect(JSON.stringify(saved)).not.toContain(cwd)

    const second = cli("repro-bravo", "--yes", "--no-install", "--no-git", "--config", "team.json")
    expect(second.code).toBe(0)
    const normalize = async (name: string) =>
      Object.fromEntries(
        Object.entries(await tree(join(cwd, name))).map(([k]) => [
          k,
          (async () => (await readFile(join(cwd, name, k), "utf8")).replaceAll(name, "<name>"))(),
        ])
      )
    const a = await normalize("repro-alpha")
    const b = await normalize("repro-bravo")
    expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort())
    for (const k of Object.keys(a)) expect(await b[k], k).toBe(await a[k])
  })

  it("does not overwrite an existing --save-config file", async () => {
    await writeFile(join(cwd, "team.json"), "{}")
    const r = cli("app", "--yes", "--no-install", "--save-config", "team.json")
    expect(r.code).toBe(1)
    expect(await readFile(join(cwd, "team.json"), "utf8")).toBe("{}")
  })

  it("refuses a --save-config path inside the new project", async () => {
    const r = cli("app", "--yes", "--no-install", "--save-config", "app/package.json")
    expect(r.code).toBe(1)
    expect(r.out).toContain("inside the new project")
    expect(existsSync(join(cwd, "app"))).toBe(false)
  })

  describe("existing workspace", () => {
    beforeEach(async () => {
      await writeFile(join(cwd, "package.json"), JSON.stringify({ name: "ws", private: true, packageManager: "pnpm@11.13.0" }))
      await writeFile(join(cwd, "pnpm-workspace.yaml"), "packages:\n- apps/*\n")
    })

    it("requires approval before installing, because install runs workspace code", async () => {
      const r = cli("web", "--mode", "existing-workspace", "--preset", "minimal", "--yes")
      expect(r.code).toBe(1)
      expect(r.out).toContain("--allow-workspace-changes")
      expect((await readdir(cwd)).sort()).toEqual(["package.json", "pnpm-workspace.yaml"])
    })

    it("adds the app without touching root files when nothing needs approval", async () => {
      const before = await readFile(join(cwd, "pnpm-workspace.yaml"), "utf8")
      const r = cli("web", "--mode", "existing-workspace", "--preset", "minimal", "--yes", "--no-install")
      expect(r.code).toBe(0)
      expect(existsSync(join(cwd, "apps", "web", "package.json"))).toBe(true)
      expect(await readFile(join(cwd, "pnpm-workspace.yaml"), "utf8")).toBe(before)
    })
  })
})
