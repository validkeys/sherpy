/**
 * Sherpy PM - Main App Component
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/auth/auth-provider";
import { LoginPage } from "./components/auth/login-page";
import { LoginCallback } from "./components/auth/login-callback";
import { ProtectedRoute } from "./components/auth/protected-route";
import { InboxLayout } from "./components/inbox/inbox-layout";
import { ProjectList } from "./components/inbox/project-list";

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
