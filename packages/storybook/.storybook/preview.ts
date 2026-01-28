import type { Preview } from "@storybook/react";
import "../../../apps/store/app/styles/tailwind.css"; // Reuse existing tailwind styles

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
