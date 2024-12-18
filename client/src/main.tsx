import { StrictMode, lazy, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import HomePage from "./pages/HomePage";
import NewRegistrationPage from "./pages/NewRegistrationPage";
import AuthPage from "./pages/AuthPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import CustomersPage from "./pages/CustomersPage";
import PetsPage from "./pages/PetsPage";
import ServicesPage from "./pages/ServicesPage";
import InventoryPage from "./pages/InventoryPage";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useUser } from "./hooks/use-user";
import Layout from "./components/Layout";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";

// Loading component for suspense fallback
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Error fallback component
// Enhanced error fallback component with better UI and error details
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="max-w-md w-full space-y-4">
        <div className="flex items-center justify-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            We encountered an error while processing your request. Please try again.
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
            {error.message}
          </pre>
        </div>
        <div className="flex justify-center">
          <Button 
            onClick={resetErrorBoundary}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

// Global error handler setup
function setupErrorHandlers() {
  if (typeof window !== 'undefined') {
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('Global error:', { message, source, lineno, colno, error });
      // You could also send this to an error tracking service
    };

    window.onunhandledrejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // You could also send this to an error tracking service
    };
  }
}

function Router() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/register" component={NewRegistrationPage} />
        <Route component={AuthPage} />
      </Switch>
    );
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
            <Route path="/settings/inventory-categories" component={lazy(() => import('./pages/settings/categories'))} />
            <Route path="/settings/pet-breeds" component={lazy(() => import('./pages/settings/pet-breeds'))} />
            <Route path="/settings/roles" component={lazy(() => import('./pages/RoleManagementPage'))} />
            <Route path="/settings/user-management" component={lazy(() => import('./pages/settings/user-management'))} />
            <Route>404 Page Not Found</Route>
          </Switch>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}

// Initialize error handlers
setupErrorHandlers();

// Create root and render app
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset app state here if needed
        queryClient.clear();
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<LoadingSpinner />}>
          <Router />
          <Toaster />
        </Suspense>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
