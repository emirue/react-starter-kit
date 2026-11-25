import { withThemeByClassName } from "@storybook/addon-themes"
import type { Preview } from "@storybook/react-vite"

// The same global styles and design tokens as the app.
import "../src/index.css"

const preview: Preview = {
  parameters: {
    layout: "centered",
    // Accessibility violations fail story tests (`test:storybook`).
    a11y: { test: "error" },
  },
  // Light/dark switch in the toolbar: toggles the `dark` class like the app's theme provider.
  decorators: [withThemeByClassName({ themes: { light: "", dark: "dark" }, defaultTheme: "light" })],
}

export default preview
