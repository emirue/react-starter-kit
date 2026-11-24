import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { addWorkspaceGlob, detectWorkspace, ensureAllowBuild, globMatches, parsePnpmPackages } from "../../src/core/workspace.ts"
import { ProduxError } from "../../src/utils/errors.ts"

let root: string
const write = async (rel: string, content: string | object) => {
  const p = join(root, rel)
  await mkdir(join(p, ".."), { recursive: true })
  await writeFile(p, typeof content === "string" ? content : JSON.stringify(content))
}

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "produx-ws-")))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe("detectWorkspace", () => {
  it("finds a pnpm workspace from a nested directory", async () => {
    await write("package.json", { name: "root", private: true, packageManager: "pnpm@11.13.0" })
    await write("pnpm-workspace.yaml", "packages:\n  - 'apps/*'\n  - \"packages/*\"\n")
    await write("pnpm-lock.yaml", "lockfileVersion: '9.0'\n")
    await write("turbo.json", "{}")
    await write("apps/api/package.json", { name: "api" })
    await write("packages/types/package.json", { name: "@acme/types" })
    await mkdir(join(root, ".git"))

    const ws = await detectWorkspace(join(root, "apps", "api"))
    expect(ws).toMatchObject({
      root,
      packageManager: "pnpm",
      packageManagerVersion: "11.13.0",
      globs: ["apps/*", "packages/*"],
      configFile: "pnpm-workspace.yaml",
      turbo: true,
      gitRoot: root,
    })
    expect(ws?.packages.map((p) => p.name).sort()).toEqual(["@acme/types", "api"])
  })

  it("finds npm workspaces from package.json", async () => {
    await write("package.json", { name: "root", workspaces: ["apps/*"] })
    await write("package-lock.json", "{}")
    const ws = await detectWorkspace(root)
    expect(ws).toMatchObject({ packageManager: "npm", configFile: "package.json", globs: ["apps/*"], turbo: false })
  })

  it("returns undefined outside any workspace", async () => {
    await write("package.json", { name: "solo" })
    expect(await detectWorkspace(root)).toBeUndefined()
  })

  it("refuses to guess when lockfiles of several package managers exist", async () => {
    await write("package.json", { name: "root", workspaces: ["apps/*"] })
    await write("package-lock.json", "{}")
    await write("yarn.lock", "")
    await expect(detectWorkspace(root)).rejects.toThrow(ProduxError)
  })
})

describe("globMatches", () => {
  it.each([
    ["apps/*", "apps/web", true],
    ["apps/*", "apps/web/nested", false],
    ["apps/**", "apps/web/nested", true],
    ["packages/ui", "packages/ui", true],
    ["apps/*", "tools/web", false],
  ])("%s ~ %s = %s", (glob, dir, expected) => {
    expect(globMatches(glob, dir)).toBe(expected)
  })
})

describe("addWorkspaceGlob", () => {
  it("appends to a block-style packages list, keeping other settings", () => {
    const before = "packages:\n  - 'apps/*'\n\ncatalog:\n  react: ^19\n"
    expect(addWorkspaceGlob(before, "tools/web")).toBe("packages:\n  - 'apps/*'\n  - 'tools/web'\n\ncatalog:\n  react: ^19\n")
  })

  it("refuses flow-style lists instead of rewriting them", () => {
    expect(() => addWorkspaceGlob("packages: ['apps/*']\n", "tools/web")).toThrow(ProduxError)
  })
})

describe("detectWorkspace: install side effects", () => {
  it("reports root lifecycle scripts and overrides", async () => {
    await write("package.json", {
      name: "root",
      private: true,
      scripts: { postinstall: "node marker.mjs", prepare: "husky", build: "x" },
      pnpm: { overrides: { react: "18.3.1" } },
      resolutions: { zod: "3.0.0" },
    })
    await write(
      "pnpm-workspace.yaml",
      "packages:\n  - 'apps/*'\noverrides:\n  vite: 7.0.0\n  '@types/react': 18.0.0\ncatalog:\n  react: ^19\n"
    )
    const ws = await detectWorkspace(root)
    expect(ws?.lifecycleScripts).toEqual(["postinstall", "prepare"])
    expect(ws?.overrides.sort()).toEqual(["@types/react", "react", "vite", "zod"])
    expect(ws?.hasCatalog).toBe(true)
  })
})

describe("ensureAllowBuild", () => {
  it("adds an allowBuilds block or entry, keeping other settings", () => {
    expect(ensureAllowBuild("packages:\n  - 'apps/*'\n", "esbuild")).toBe("packages:\n  - 'apps/*'\n\nallowBuilds:\n  esbuild: true\n")
    expect(ensureAllowBuild("allowBuilds:\n  sharp: true\npackages:\n  - a\n", "esbuild")).toBe(
      "allowBuilds:\n  sharp: true\n  esbuild: true\npackages:\n  - a\n"
    )
  })

  it("returns undefined when the build is already decided", () => {
    expect(ensureAllowBuild("allowBuilds:\n  esbuild: true\n", "esbuild")).toBeUndefined()
    expect(ensureAllowBuild("allowBuilds:\n  esbuild: false\n", "esbuild")).toBeUndefined()
  })
})

describe("YAML edge cases (review findings)", () => {
  it("reads and extends non-indented block lists", () => {
    const yaml = "packages:\n- apps/*\n- 'packages/*'\nallowBuilds:\n  esbuild: true\n"
    expect(parsePnpmPackages(yaml)).toEqual(["apps/*", "packages/*"])
    expect(addWorkspaceGlob(yaml, "tools/web")).toBe("packages:\n- apps/*\n- 'packages/*'\n- 'tools/web'\nallowBuilds:\n  esbuild: true\n")
  })

  it("refuses flow-style allowBuilds instead of duplicating the key", () => {
    expect(() => ensureAllowBuild("allowBuilds: { sharp: true }\n", "esbuild")).toThrow(ProduxError)
  })
})
