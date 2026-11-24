import { z } from "zod"

import { ROLES } from "./user"

export const newUserSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters."),
  email: z.email("Enter a valid email address."),
  role: z.enum(ROLES),
})

export type NewUserInput = z.input<typeof newUserSchema>
export type NewUser = z.output<typeof newUserSchema>
