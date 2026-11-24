import type { Meta, StoryObj } from "@storybook/react-vite"

import { Input } from "./input"
import { Label } from "./label"

/** Inputs always have a visible label (`Label` + `htmlFor`). */
const meta = {
  title: "shared/ui/Input",
  component: Input,
  args: { id: "email", type: "email", placeholder: "you@example.com" },
  render: (args) => (
    <div className="flex w-72 flex-col gap-1.5">
      <Label htmlFor={args.id}>Email</Label>
      <Input {...args} />
    </div>
  ),
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Invalid: Story = {
  args: { "aria-invalid": true, "aria-describedby": "email-error", defaultValue: "not-an-email" },
  render: (args) => (
    <div className="flex w-72 flex-col gap-1.5">
      <Label htmlFor={args.id}>Email</Label>
      <Input {...args} />
      <p id="email-error" className="text-sm text-destructive">
        Enter a valid email address.
      </p>
    </div>
  ),
}

export const Disabled: Story = { args: { disabled: true } }
