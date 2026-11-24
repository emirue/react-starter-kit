// @if forms-example
import { createFileRoute } from "@tanstack/react-router"

import { SignUpForm } from "@/features/sign-up/components/sign-up-form"

export const Route = createFileRoute("/examples/sign-up")({
  component: SignUpForm,
})
// @endif
