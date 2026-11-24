import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "./button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card"

const meta = {
  title: "shared/ui/Card",
  component: Card,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>
          <h2>Card title</h2>
        </CardTitle>
        <CardDescription>A short description of the card.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Cards group related content and actions.</p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Action</Button>
      </CardFooter>
    </Card>
  ),
}
