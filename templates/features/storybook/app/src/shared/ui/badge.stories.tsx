import type { Meta, StoryObj } from "@storybook/react-vite"

import { Badge } from "./badge"

const meta = {
  title: "shared/ui/Badge",
  component: Badge,
  args: { children: "Badge" },
  argTypes: { variant: { control: "select", options: ["default", "secondary", "outline", "destructive", "ghost"] } },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      <Badge {...args}>Default</Badge>
      <Badge {...args} variant="secondary">
        Secondary
      </Badge>
      <Badge {...args} variant="outline">
        Outline
      </Badge>
      <Badge {...args} variant="destructive">
        Destructive
      </Badge>
    </div>
  ),
}
