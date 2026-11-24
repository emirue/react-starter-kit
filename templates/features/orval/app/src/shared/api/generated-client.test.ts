// @if msw && examples && vitest
import { describe, expect, it } from "vitest"

import { createTodo, listTodos } from "./generated/api"

describe("generated API client", () => {
  it("talks to the API through the project's client", async () => {
    // @if axios
    const created = await createTodo({ title: "From Orval" })
    expect(created.title).toBe("From Orval")
    const open = await listTodos({ filter: "open" })
    expect(open.map((t) => t.title)).toContain("From Orval")
    // @else
    const created = await createTodo({ title: "From Orval" })
    expect(created.status).toBe(201)
    const open = await listTodos({ filter: "open" })
    expect(open.status).toBe(200)
    // @endif
  })
})
// @endif
