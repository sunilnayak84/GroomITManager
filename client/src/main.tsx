import React, { StrictMode, lazy, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { WebSocketProvider } from "./contexts/websocket-context";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import CustomersPage from "./pages/CustomersPage";
import PetsPage from "./pages/PetsPage";
import ServicesPage from "./pages/ServicesPage";
import InventoryPage from "./pages/InventoryPage";
import MarketplacePage from "./pages/MarketplacePage";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useUser } from "./hooks/use-user";
import Layout from "./components/Layout";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import RoleManagementPage from "./pages/RoleManagementPage";
import WorkingHoursPage from "./pages/WorkingHoursPage";
import LoyaltyProgramPage from "./pages/settings/LoyaltyProgramPage";
import DogWalkingPage from "./pages/DogWalkingPage";
import StaffManagementPage from "./pages/StaffManagementPage";

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

  // Handle URL parameters by cleaning them if present
  useEffect(() => {
    const url = new URL(window.location.href);
    // If we have initialPath param, replace the URL with the actual path
    if (url.searchParams.has('initialPath')) {
      const initialPath = url.searchParams.get('initialPath') || '/';
      // Remove the query parameters and navigate to the clean URL
      window.history.replaceState({}, '', initialPath);
    }
  }, []);

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
            <Route path="/walks" component={DogWalkingPage} />
            <Route path="/inventory" component={InventoryPage} />
            <Route path="/marketplace" component={MarketplacePage} />
            <Route path="/settings/working-hours" component={WorkingHoursPage} />
            <Route path="/settings/categories" component={lazy(() => import('./pages/settings/CategoriesPage'))} />
            <Route path="/settings/breeds" component={lazy(() => import('./pages/settings/BreedsPage'))} />
            <Route path="/settings/role-management" component={RoleManagementPage} />
            <Route path="/settings/loyalty" component={LoyaltyProgramPage} />
            <Route path="/settings/rewards" component={lazy(() => import('./pages/settings/RewardsManagementPage'))} />
            <Route path="/settings/staff" component={StaffManagementPage} />
            <Route path="/staff-availability" component={lazy(() => import('./pages/staff-availability'))} />
            <Route path="/billing" component={lazy(() => import('./pages/BillingPage'))} />
            <Route path="/billing/:id">{(params) => <React.Suspense fallback={<div>Loading...</div>}>
              {React.createElement(React.lazy(() => import('./pages/BillDetailsPage')), { billId: params.id })}
            </React.Suspense>}</Route>
            <Route>404 Page Not Found</Route>
          </Switch>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}

// Global error handler setup
setupErrorHandlers();

// Configure API URL based on environment
window.API_BASE_URL = import.meta.env.PROD
  ? "/api" // Use relative path in production
  : "http://localhost:3000";

// Log API configuration
console.log(`API configured with base URL: ${window.API_BASE_URL}`);

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
        <WebSocketProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <Router />
            <Toaster />
          </Suspense>
        </WebSocketProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);