import React from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AppNavbar from "./components/layout/AppNavbar";
import { useAuth } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage";
import PositionsPage from "./pages/PositionsPage";
import PositionDetailPage from "./pages/PositionDetailPage";
import PositionEditPage from "./pages/PositionEditPage";
import ProfilePage from "./pages/ProfilePage";
import AttributesPage from "./pages/AttributesPage";
import UsersPage from "./pages/UsersPage";
import CVPage from "./pages/CVPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import ChooseRolePage from "./pages/ChooseRolePage";

function ProtectedRoute({ roles }) {
  const { user, loading, hasRole } = useAuth();
  if (loading) {
    return (
      <div className="page-shell text-center py-5">
        <div className="spinner-border" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !hasRole(...roles)) return <Navigate to="/" replace />;
  return <Outlet />;
}

function AppLayout() {
  return (
    <div className="app-root">
      <AppNavbar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="/search/:q" element={<SearchResultsPage />} />
        <Route path="/search" element={<SearchResultsPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/positions" element={<PositionsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/cvs/:id" element={<CVPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={["recruiter", "admin"]} />}>
          <Route path="/positions/new" element={<PositionEditPage />} />
          <Route path="/positions/:id/edit" element={<PositionEditPage />} />
          <Route path="/attributes" element={<AttributesPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/positions/:id" element={<PositionDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="/users" element={<UsersPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/choose-role" element={<ChooseRolePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}