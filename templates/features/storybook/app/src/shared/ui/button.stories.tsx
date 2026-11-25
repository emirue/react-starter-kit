import type { Meta, StoryObj } from "@storybook/react-vite"
import { Plus } from "lucide-react"

import { Button } from "./button"

const meta = {
  title: "shared/ui/Button",
  component: Button,
  args: { children: "Button" },
  argTypes: {
    variant: { control: "select", options: ["default", "secondary", "outline", "ghost", "destructive", "link"] },
    size: { control: "select", options: ["default", "xs", "sm", "lg"] },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button {...args}>Default</Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="outline">
        Outline
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="destructive">
        Destructive
      </Button>
      <Button {...args} variant="link">
        Link
      </Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button {...args} size="xs">
        Extra small
      </Button>
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args}>Default</Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  ),
}

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Plus aria-hidden="true" />
        Add user
      </>
    ),
  },
}

export const IconOnly: Story = {
  args: { size: "icon", "aria-label": "Add", children: <Plus aria-hidden="true" /> },
}

export const Disabled: Story = { args: { disabled: true } }
