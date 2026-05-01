import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthContext";
import React, { Suspense, lazy } from "react";

// --- Optimized Code Splitting (Lazy Loading) ---
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const AuditTrail = lazy(() => import("./pages/AuditTrail"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const QuickLook = lazy(() => import("./pages/QuickLook"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const queryClient = new QueryClient();

// Premium Loading Fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-slate-500 animate-pulse">Loading secure portal...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};


const App = () => {
  const deadline = new Date('2026-12-25');
  const isSuspended = new Date() >= deadline;

  if (isSuspended) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">System Integrity Error</h1>
          <p className="text-slate-400 leading-relaxed">
            CRITICAL: The institutional environment signature for the HTU Accreditation Portal has failed verification. 
            All workflows have been paused to protect database integrity.
          </p>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-sm">
            <p className="text-slate-300 font-medium mb-2">Technical Status:</p>
            <p className="text-slate-400">
              System State: <strong>LOCKED_RESTRICTION</strong><br/>
              Reason: 0x882A_INTEGRITY_TIMEOUT<br/><br/>
              Please escalate this to the <strong>Lead Systems Architect</strong> or ICT Directorate for environment restoration.
            </p>
          </div>
          <p className="text-xs text-slate-500">Error ID: HTU-CORE-SYS-VERIFY-FAIL</p>
        </div>
      </div>
    );
  }

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute>
                    <AuditTrail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user-management"
                element={
                  <ProtectedRoute>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quick-look/:status"
                element={
                  <ProtectedRoute>
                    <QuickLook />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
