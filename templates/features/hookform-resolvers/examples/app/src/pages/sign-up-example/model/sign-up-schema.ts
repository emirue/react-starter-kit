import { z } from "zod"

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Enter at least 2 characters."),
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })

export type SignUpInput = z.input<typeof signUpSchema>
export type SignUpValues = z.output<typeof signUpSchema>
