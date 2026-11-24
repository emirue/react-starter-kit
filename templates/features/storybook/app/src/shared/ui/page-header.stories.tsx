import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "./button"
import { PageHeader } from "./page-header"

const meta = {
  title: "shared/ui/PageHeader",
  component: PageHeader,
  parameters: { layout: "padded" },
  args: { title: "Users", description: "Search, sort and page through users, or add one." },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithActions: Story = {
  args: { actions: <Button>Add user</Button> },
}

/** Actions move below the title on small screens. */
export const Mobile: Story = {
  args: { actions: <Button>Add user</Button> },
  globals: { viewport: { value: "mobile1" } },
}
