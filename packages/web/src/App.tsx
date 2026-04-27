/**
 * Sherpy PM - Main App Component
 */

import { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./components/auth/auth-provider";
import { LoginCallback } from "./components/auth/login-callback";
import { LoginPage } from "./components/auth/login-page";
import { ProtectedRoute } from "./components/auth/protected-route";
import { InboxLayout } from "./components/inbox/inbox-layout";
import { ProjectList } from "./components/inbox/project-list";
import { ProjectDetailPage } from "./pages/project-detail";

function InboxPage() {
  return (
    <InboxLayout>
      <ProjectList />
    </InboxLayout>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/callback" element={<LoginCallback />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <InboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <Suspense fallback={<div>Loading project...</div>}>
                <ProtectedRoute>
                  <ProjectDetailPage />
                </ProtectedRoute>
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
