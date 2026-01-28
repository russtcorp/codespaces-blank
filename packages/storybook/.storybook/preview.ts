import type { Preview } from "@storybook/react";
import "../../ui/src/styles.css"; // Use shared UI package styles instead of coupling to specific app

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
