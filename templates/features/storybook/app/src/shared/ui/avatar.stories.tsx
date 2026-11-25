// @if admin-layout
import type { Meta, StoryObj } from "@storybook/react-vite"

import { Avatar, AvatarFallback } from "./avatar"

/** Fallback initials use `text-foreground`: `text-muted-foreground` on `bg-muted` is below 4.5:1. */
const meta = {
  title: "shared/ui/Avatar",
  component: Avatar,
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Initials: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Avatar className="size-8">
        <AvatarFallback className="text-foreground">AD</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback className="text-foreground">GH</AvatarFallback>
      </Avatar>
    </div>
  ),
}
// @endif
