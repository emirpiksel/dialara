import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { AuthForm } from "./AuthForm";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { isAuthenticated, isAdmin, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth(); // Ensure auth state updates properly on refresh
  }, []);

  const authenticatedNav = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Agents", href: "/agents" },
    { name: "Calls", href: "/calls" },
    { name: "Leads", href: "/leads" },
    { name: "Analytics", href: "/analytics" },
    { name: "Settings", href: "/settings" },
  ];

  return (
    <>
      <header className="fixed w-full bg-white/90 backdrop-blur-sm z-50 border-b border-gray-100">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
          <div className="w-full py-6 flex items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">ClinicAI</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {isAuthenticated ? (
                authenticatedNav.map((link) => (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-base font-medium text-gray-600 hover:text-gray-900"
                  >
                    {link.name}
                  </Link>
                ))
              ) : (
                <>
                  <Link to="/coming-soon" className="text-base font-medium text-gray-600 hover:text-gray-900">
                    Coming Soon
                  </Link>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Sign In
                  </button>
                </>
              )}

              {/* ✅ Show "Teams" button only for Admins */}
              {isAuthenticated && isAdmin && (
                <Link
                  to="/teams"
                  className="text-base font-medium text-gray-600 hover:text-gray-900"
                >
                  Teams
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4">
            <div className="flex flex-col space-y-4">
              {isAuthenticated ? (
                authenticatedNav.map((link) => (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-base font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))
              ) : (
                <>
                  <Link
                    to="/coming-soon"
                    className="text-base font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Coming Soon
                  </Link>
                  <button
                    onClick={() => {
                      setIsAuthModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Sign In
                  </button>
                </>
              )}

              {/* ✅ Show "Teams" button only for Admins */}
              {isAuthenticated && isAdmin && (
                <Link
                  to="/teams"
                  className="text-base font-medium text-gray-600 hover:text-gray-900"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Teams
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-500">
              ×
            </button>
            <AuthForm onClose={() => setIsAuthModalOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
