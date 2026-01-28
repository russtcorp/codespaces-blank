import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Configure stale times and other defaults here if needed
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

export default queryClient;
