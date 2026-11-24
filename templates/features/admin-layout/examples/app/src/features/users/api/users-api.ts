import type { NewUser } from "../schemas/user-schema"
import { ROLES, type User } from "../types/user"

// A local in-memory API so the example works without a backend.
// Replace these functions with calls to your API client.
const FIRST = ["Ada", "Grace", "Linus", "Margaret", "Alan", "Barbara", "Ken", "Frances"]
const LAST = ["Lovelace", "Hopper", "Torvalds", "Hamilton", "Turing", "Liskov", "Thompson"]

let users: User[] = Array.from({ length: 42 }, (_, i) => {
  const first = FIRST[i % FIRST.length]!
  const last = LAST[i % LAST.length]!
  return {
    id: String(i + 1),
    name: `${first} ${last}`,
    email: `${first}.${last}${i + 1}@example.com`.toLowerCase(),
    role: ROLES[i % ROLES.length]!,
  }
})

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const usersApi = {
  async list(): Promise<User[]> {
    await delay(200)
    return users.map((u) => ({ ...u }))
  },
  async create(input: NewUser): Promise<User> {
    await delay(150)
    if (users.some((u) => u.email === input.email)) throw new Error("A user with this email already exists.")
    const user = { id: crypto.randomUUID(), ...input }
    users = [user, ...users]
    return { ...user }
  },
}
