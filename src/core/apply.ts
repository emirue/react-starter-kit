import { constants, existsSync } from "node:fs"
import { access, mkdir, mkdtemp, readdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises"
import { basename, dirname, join, relative, resolve } from "node:path"

import { ProduxError } from "../utils/errors.ts"
import type { PlannedFile } from "./generate.ts"
import { isInside } from "./workspace.ts"

/** Everything this run created or changed, so it can be undone. */
export class Journal {
  /** Directories created by this run: removed on rollback. */
  readonly created: string[] = []
  /** Pre-existing empty directories this run filled: emptied on rollback. */
  readonly filled: string[] = []
  /** Original content of files this run changed (null: the file did not exist). */
  readonly original = new Map<string, string | null>()
  /** Set when a rollback starts, so in-flight writes stop instead of recreating files. */
  cancelled = false

  async backup(path: string): Promise<void> {
    if (!this.original.has(path)) this.original.set(path, existsSync(path) ? await readFile(path, "utf8") : null)
  }

  async modify(path: string, content: string): Promise<void> {
    await this.backup(path)
    await writeFile(path, content)
  }

  async rollback(): Promise<void> {
    this.cancelled = true
    for (const [path, content] of this.original) {
      if (content === null) await rm(path, { force: true })
      else await writeFile(path, content)
    }
    for (const dir of [...this.created].reverse()) await rm(dir, { recursive: true, force: true })
    for (const dir of this.filled) {
      for (const entry of await readdir(dir).catch(() => [])) await rm(join(dir, entry), { recursive: true, force: true })
    }
  }
}

function nearestExisting(path: string): string {
  let dir = path
  while (!existsSync(dir) && dirname(dir) !== dir) dir = dirname(dir)
  return dir
}

/**
 * The target must be a missing or empty directory, writable, and (when
 * `allowedRoot` is given) inside it after resolving symbolic links.
 */
export async function assertWritableTarget(dir: string, allowedRoot?: string): Promise<void> {
  if (existsSync(dir)) {
    if (!(await stat(dir)).isDirectory()) throw new ProduxError(`${dir} exists and is not a directory.`)
    if ((await readdir(dir)).length) {
      throw new ProduxError(`${dir} is not empty.`, "Choose another directory or empty it first; existing files are never overwritten.")
    }
  }
  const anchor = nearestExisting(dir)
  if (allowedRoot) {
    const real = resolve(await realpath(anchor), relative(anchor, dir))
    if (!isInside(await realpath(allowedRoot), real)) {
      throw new ProduxError(`${dir} resolves to ${real}, which is outside the workspace ${allowedRoot}.`)
    }
  }
  try {
    await access(anchor, constants.W_OK)
  } catch {
    throw new ProduxError(`No write permission for ${anchor}.`)
  }
}

/** Writes all files into `dest` through a staging directory, then moves them into place. */
export async function writeFiles(dest: string, files: PlannedFile[], journal: Journal): Promise<void> {
  for (const f of files) {
    if (!isInside(dest, resolve(dest, f.path))) throw new ProduxError(`Refusing to write outside the project: ${f.path}`)
  }

  const preExisting = existsSync(dest)
  const parent = dirname(dest)
  const firstCreated = nearestExisting(parent) === parent ? undefined : topMissing(parent)
  await mkdir(parent, { recursive: true })
  if (firstCreated) journal.created.push(firstCreated)

  const staging = await mkdtemp(join(parent, `.${basename(dest)}.produx-`))
  // Tracked immediately: a rollback (Ctrl+C) during writing must remove it.
  journal.created.push(staging)
  const stop = () => {
    if (journal.cancelled) throw new ProduxError("Cancelled while writing files.")
  }
  try {
    for (const f of files) {
      stop()
      const out = join(staging, f.path)
      await mkdir(dirname(out), { recursive: true })
      await writeFile(out, f.content)
    }
    stop()
    if (preExisting) {
      // Keep the user's (empty) directory itself, e.g. when run with ".".
      for (const entry of await readdir(staging)) await rename(join(staging, entry), join(dest, entry))
      await rm(staging, { recursive: true, force: true })
      journal.filled.push(dest)
    } else {
      await rename(staging, dest)
      if (!firstCreated) journal.created.push(dest)
    }
  } catch (e) {
    await rm(staging, { recursive: true, force: true })
    throw e
  } finally {
    const index = journal.created.indexOf(staging)
    if (index !== -1) journal.created.splice(index, 1)
  }
}

function topMissing(path: string): string {
  let top = path
  while (!existsSync(dirname(top))) top = dirname(top)
  return top
}
