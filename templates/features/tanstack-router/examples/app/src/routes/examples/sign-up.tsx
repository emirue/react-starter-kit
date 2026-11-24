// @if forms-example
import { createFileRoute } from "@tanstack/react-router"

import { SignUpPage } from "@/pages/sign-up-example"

export const Route = createFileRoute("/examples/sign-up")({ component: SignUpPage })
// @endif
