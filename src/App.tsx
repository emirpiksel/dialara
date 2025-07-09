import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { useAppMode } from "./store/useAppMode";
import { Layout } from "./components/Layout";
import { TrainingLayout } from "./components/TrainingLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Dashboard } from "./pages/Dashboard";
import { Agents } from "./pages/Agents";
import { Calls } from "./pages/Calls"; // Keep this for general calls
import { Leads } from "./pages/Leads";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";
import { Profile } from "./pages/Profile";
import ProgressPage from "./pages/training/progress";
import LeaderboardPage from "./pages/training/leaderboard";
import TrainingSimulator from "./pages/training/simulator";

/* Public Pages */
import { Homepage } from "./pages/Homepage";
import { ComingSoon } from "./pages/ComingSoon";
import { AuthForm } from "./components/AuthForm";

/* ✅ Import Teams Page */
import { Teams } from "./pages/Teams";

/* ✅ Import Training Pages */
import Training from "./pages/Training";
import TrainingCalls from "./pages/training/TrainingCalls"; // ✅ Import Training Call Logs Page
import TrainingAnalytics from "./pages/training/TrainingAnalytics";
import UserCallDetail from "./pages/training/UserCallDetail";

function App() {
  const { isAuthenticated, checkAuth, loading, isAdmin } = useAuthStore();
  const { mode } = useAppMode();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handleOpenAuth = () => setShowAuthModal(true);
    window.addEventListener("open-auth", handleOpenAuth);

    return () => {
      window.removeEventListener("open-auth", handleOpenAuth);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes (Before Login) */}
        {!isAuthenticated ? (
          <>
            <Route path="/" element={<Homepage />} />
            <Route path="/coming-soon" element={<ComingSoon />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            {/* Redirect to Dashboard after login */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Layout Wrapper for Protected Routes */}
            <Route path="/" element={mode === 'training' ? <TrainingLayout /> : <Layout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="agents" element={<Agents />} />
              <Route path="calls" element={<Calls />} />
              <Route path="leads" element={<Leads />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
              
              {/* ✅ Training Section (Nested Routes) */}
              <Route path="training">
                <Route index element={<Training />} />
                <Route path="calls" element={<TrainingCalls />} />
                <Route path="progress" element={<ProgressPage />} />
                <Route path="leaderboard" element={<LeaderboardPage />} />
                <Route path="simulator" element={
                  <ErrorBoundary>
                    <TrainingSimulator />
                  </ErrorBoundary>
                } />
              </Route>

              {/* ✅ Training Analytics Section */}
              <Route path="training-analytics">
                <Route path="user/:userId" element={<TrainingAnalytics />} />
                <Route path="calls/:userId" element={<UserCallDetail />} />
              </Route>

              {/* ✅ Teams Page (Only Admins Can Access) */}
              {isAdmin ? (
                <Route path="teams" element={<Teams />} />
              ) : (
                <Route path="teams" element={<Navigate to="/dashboard" replace />} />
              )}

              {/* Fallback to Dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </>
        )}
      </Routes>

      {/* ✅ Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
            >
              ✕
            </button>
            <AuthForm />
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;
