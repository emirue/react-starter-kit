import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { FieldErrorsResponse, submitSignUp } from "../api/sign-up-api"
import { signUpSchema, type SignUpInput, type SignUpValues } from "../schemas/sign-up-schema"

const FIELDS = [
  { name: "name", label: "Name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
] as const

export function SignUpForm() {
  const [welcome, setWelcome] = useState<string>()
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput, unknown, SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  })

  const onSubmit: SubmitHandler<SignUpValues> = async (values) => {
    setWelcome(undefined)
    try {
      const result = await submitSignUp(values)
      setWelcome(result.name)
      reset()
    } catch (error) {
      if (error instanceof FieldErrorsResponse) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof SignUpValues, { type: "server", message }, { shouldFocus: true })
        }
        return
      }
      setError("root.server", { type: "server", message: "Could not sign up. Try again." })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Forms</h2>
        </CardTitle>
        <CardDescription>
          React Hook Form with a Zod schema. Try <code>taken@example.com</code> to see a server-side error.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {FIELDS.map((field) => {
            const error = errors[field.name]
            const errorId = `sign-up-${field.name}-error`
            return (
              <div key={field.name} className="flex flex-col gap-1.5">
                <Label htmlFor={`sign-up-${field.name}`}>{field.label}</Label>
                <Input
                  id={`sign-up-${field.name}`}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  {...register(field.name)}
                />
                {error && (
                  <p id={errorId} className="text-sm text-destructive">
                    {error.message}
                  </p>
                )}
              </div>
            )
          })}
          {errors.root?.server && (
            <p role="alert" className="text-sm text-destructive">
              {errors.root.server.message}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing up…" : "Sign up"}
            </Button>
            <p role="status" className="text-sm text-muted-foreground">
              {welcome ? `Welcome, ${welcome}!` : null}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
