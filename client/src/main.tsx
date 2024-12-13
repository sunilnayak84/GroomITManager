import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { useUser } from "./hooks/use-user";

// Component imports
import Layout from "./components/Layout";

// Page imports
import HomePage from "./pages/HomePage";
import AppointmentsPage from "./pages/AppointmentsPage";
import CustomersPage from "./pages/CustomersPage";
import PetsPage from "./pages/PetsPage";
import ServicesPage from "./pages/ServicesPage";
import InventoryPage from "./pages/InventoryPage";
import RoleManagementPage from "./pages/RoleManagementPage";
import AuthPage from "./pages/AuthPage";
import { Loader2 } from "lucide-react";
import { useUser } from "./hooks/use-user";

// Styles
import "./index.css";

// Loading component for suspense fallback
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h2>
      <pre className="text-sm text-gray-500 mb-4">{error.message}</pre>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}

function Router() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<LoadingSpinner />}>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/appointments" component={AppointmentsPage} />
            <Route path="/customers" component={CustomersPage} />
            <Route path="/pets" component={PetsPage} />
            <Route path="/services" component={ServicesPage} />
            <Route path="/staff" component={lazy(() => import('./pages/StaffPage'))} />
            <Route path="/inventory" component={InventoryPage} />
            <Route path="/settings/working-hours" component={lazy(() => import('./pages/WorkingHoursPage'))} />
            <Route path="/role-management" component={RoleManagementPage} />
            <Route>404 Page Not Found</Route>
          </Switch>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);