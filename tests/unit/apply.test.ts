import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { Journal, assertWritableTarget, writeFiles } from "../../src/core/apply.ts"
import { ProduxError } from "../../src/utils/errors.ts"

let tmp: string
beforeEach(async () => {
  tmp = await realpath(await mkdtemp(join(tmpdir(), "produx-apply-")))
})
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe("assertWritableTarget", () => {
  it("accepts a missing or empty directory", async () => {
    await expect(assertWritableTarget(join(tmp, "new"))).resolves.toBeUndefined()
    await mkdir(join(tmp, "empty"))
    await expect(assertWritableTarget(join(tmp, "empty"))).resolves.toBeUndefined()
  })

  it("rejects a non-empty directory and a file", async () => {
    await mkdir(join(tmp, "full"))
    await writeFile(join(tmp, "full", "keep.txt"), "x")
    await expect(assertWritableTarget(join(tmp, "full"))).rejects.toThrow(/not empty/)
    await expect(assertWritableTarget(join(tmp, "full", "keep.txt"))).rejects.toThrow(/not a directory/)
  })

  it("rejects targets that resolve outside the allowed root through a symlink", async () => {
    const outside = await realpath(await mkdtemp(join(tmpdir(), "produx-outside-")))
    await mkdir(join(tmp, "ws"))
    await symlink(outside, join(tmp, "ws", "apps"))
    await expect(assertWritableTarget(join(tmp, "ws", "apps", "web"), join(tmp, "ws"))).rejects.toThrow(/outside/)
    await rm(outside, { recursive: true, force: true })
  })
})

describe("writeFiles + Journal", () => {
  it("writes files atomically into a new directory, including unicode and spaces", async () => {
    const dest = join(tmp, "내 프로젝트 app")
    const journal = new Journal()
    await writeFiles(
      dest,
      [
        { path: "a.txt", content: "A" },
        { path: "src/b.ts", content: "B" },
      ],
      journal
    )
    expect(await readFile(join(dest, "src", "b.ts"), "utf8")).toBe("B")
    expect(journal.created).toEqual([dest])
  })

  it("refuses paths that escape the destination", async () => {
    await expect(writeFiles(join(tmp, "x"), [{ path: "../evil.txt", content: "" }], new Journal())).rejects.toThrow(ProduxError)
    expect(existsSync(join(tmp, "evil.txt"))).toBe(false)
    expect(existsSync(join(tmp, "x"))).toBe(false)
  })

  it("rolls back created directories and restores modified files", async () => {
    const existing = join(tmp, "pnpm-workspace.yaml")
    await writeFile(existing, "packages:\n  - 'apps/*'\n")
    const journal = new Journal()
    await writeFiles(join(tmp, "apps", "web"), [{ path: "index.html", content: "<p>" }], journal)
    await journal.modify(existing, "changed")
    expect(await readFile(existing, "utf8")).toBe("changed")

    await journal.rollback()
    expect(existsSync(join(tmp, "apps"))).toBe(false)
    expect(await readFile(existing, "utf8")).toBe("packages:\n  - 'apps/*'\n")
  })
})

describe("writeFiles edge cases (review findings)", () => {
  it("keeps a pre-existing empty directory (same inode) instead of replacing it", async () => {
    const { stat } = await import("node:fs/promises")
    const dest = join(tmp, "here")
    await mkdir(dest)
    const before = (await stat(dest)).ino
    const journal = new Journal()
    await writeFiles(dest, [{ path: "a.txt", content: "A" }], journal)
    expect((await stat(dest)).ino).toBe(before)
    expect(await readFile(join(dest, "a.txt"), "utf8")).toBe("A")
    await journal.rollback()
    expect(existsSync(dest)).toBe(true)
    expect(existsSync(join(dest, "a.txt"))).toBe(false)
  })

  it("a rollback while files are being written (Ctrl+C) leaves nothing behind", async () => {
    const journal = new Journal()
    const dest = join(tmp, "app")
    const files = Array.from({ length: 300 }, (_, i) => ({ path: `src/f${i}.ts`, content: "x".repeat(1000) }))
    const writing = writeFiles(dest, files, journal).catch(() => undefined)
    for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r))
    await journal.rollback()
    await writing
    const { readdir } = await import("node:fs/promises")
    expect(await readdir(tmp)).toEqual([])
  })
})
