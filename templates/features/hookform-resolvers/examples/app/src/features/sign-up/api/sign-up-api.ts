import type { SignUpValues } from "../schemas/sign-up-schema"

/** Thrown when the server rejects specific fields. */
export class FieldErrorsResponse extends Error {
  readonly fieldErrors: Partial<Record<keyof SignUpValues, string>>

  constructor(fieldErrors: FieldErrorsResponse["fieldErrors"]) {
    super("Validation failed")
    this.fieldErrors = fieldErrors
  }
}

// Stand-in for a real endpoint. Replace it with a call to your API client.
export async function submitSignUp(values: SignUpValues): Promise<{ name: string }> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  if (values.email.toLowerCase() === "taken@example.com") {
    throw new FieldErrorsResponse({ email: "This email is already registered." })
  }
  return { name: values.name }
}
