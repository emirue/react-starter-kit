export const ROLES = ["admin", "editor", "viewer"] as const
export type Role = (typeof ROLES)[number]

export interface User {
  id: string
  name: string
  email: string
  role: Role
}
