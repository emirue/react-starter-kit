import type { Meta, StoryObj } from "@storybook/react-vite"

import { Skeleton } from "./skeleton"

/** Placeholder shapes. Data views use `LoadingState`, which adds `role="status"` and a label. */
const meta = {
  title: "shared/ui/Skeleton",
  component: Skeleton,
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Lines: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-24 w-full" />
    </div>
  ),
}
