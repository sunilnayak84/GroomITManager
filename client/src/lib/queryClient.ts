import { QueryClient } from "@tanstack/react-query";
import { auth } from "./firebase";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false
    }
  },
  queryFn: async ({ queryKey }) => {
    // Get current user's token
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      if (res.status >= 500) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }

      // Handle unauthorized errors
      if (res.status === 401) {
        // Redirect to login or handle unauthorized access
        window.location.href = '/login';
        throw new Error('Unauthorized access');
      }

      throw new Error(`${res.status}: ${await res.text()}`);
    }

    return res.json();
  }
});
