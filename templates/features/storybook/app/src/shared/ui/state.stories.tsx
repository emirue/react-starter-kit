import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { EmptyState, ErrorState, LoadingState } from "./state"

/** Every data view shows these three states the same way. */
const meta = {
  title: "shared/ui/State",
  parameters: { layout: "padded" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = {
  render: () => <LoadingState label="Loading users" rows={3} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status", { name: "Loading users" })).toBeInTheDocument()
  },
}

const onRetry = fn()

export const WithError: Story = {
  render: () => <ErrorState error={new Error("Could not load users.")} onRetry={onRetry} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("alert")).toHaveTextContent("Could not load users.")
    await userEvent.click(canvas.getByRole("button", { name: "Retry" }))
    await expect(onRetry).toHaveBeenCalled()
  },
}

export const Empty: Story = {
  render: () => <EmptyState title="No users yet" description="Add the first user." />,
}
