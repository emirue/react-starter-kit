import type { StorybookConfig } from "@storybook/react-vite"

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-themes", "@storybook/addon-vitest"],
  framework: "@storybook/react-vite",
  // No usage data is sent; remove this to opt in to Storybook telemetry.
  core: { disableTelemetry: true },
}

export default config
