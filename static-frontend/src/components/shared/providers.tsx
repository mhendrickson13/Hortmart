import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { AppPreferencesProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60_000,      // 5 min — data is fresh, no refetch
            gcTime: 10 * 60_000,         // 10 min — keep in cache after unmount
            refetchOnMount: 'always',    // only refetch if stale
            refetchOnWindowFocus: false,
            retry: 1,                    // 1 retry, then fail
          },
        },
      })
  );

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <AppPreferencesProvider>
          {children}
          <Toaster />
        </AppPreferencesProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
