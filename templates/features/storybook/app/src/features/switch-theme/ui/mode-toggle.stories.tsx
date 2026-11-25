// @if theme
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { ThemeProvider } from "@/shared/lib/theme"

import { ModeToggle } from "./mode-toggle"

const meta = {
  title: "features/switch-theme/ModeToggle",
  component: ModeToggle,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof ModeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SwitchesTheme: Story = {
  play: async ({ canvasElement }) => {
    const dark = within(canvasElement).getByRole("button", { name: "Dark" })
    await userEvent.click(dark)
    await expect(dark).toHaveAttribute("aria-pressed", "true")
    await expect(document.documentElement).toHaveClass("dark")
  },
}
// @endif
