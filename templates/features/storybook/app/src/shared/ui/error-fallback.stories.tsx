// @if router || error-boundary
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { ErrorFallback } from "./error-fallback"

/** Shown by route error boundaries (inside the layout) and the top-level error boundary. */
const meta = {
  title: "shared/ui/ErrorFallback",
  component: ErrorFallback,
  parameters: { layout: "fullscreen" },
  args: { error: new Error("Could not load this page."), onRetry: fn() },
} satisfies Meta<typeof ErrorFallback>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("alert")).toHaveTextContent("Could not load this page.")
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }))
    await expect(args.onRetry).toHaveBeenCalled()
  },
}

export const WithoutRetry: Story = { args: { onRetry: undefined } }
// @endif
