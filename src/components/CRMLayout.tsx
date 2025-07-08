import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { ModeSwitcher } from './ModeSwitcher';
import {
  Home,
  Notebook as Robot,
  BarChart2,
  User,
  LogOut,
  Phone,
  Users,
} from "lucide-react";
import { useAuthStore } from "../store/auth";

export function CRMLayout() {
  const { fullName, isAuthenticated, isAdmin, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 space-y-2">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {fullName ? `Welcome, ${fullName}` : "Welcome"}
            </h1>
            <ModeSwitcher />
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <NavItem to="/dashboard" icon={<Home />} label="Dashboard" />
            <NavItem to="/agents" icon={<Robot />} label="Agents" />
            <NavItem to="/calls" icon={<Phone />} label="Calls" />
            <NavItem to="/leads" icon={<Users />} label="Leads" />
            <NavItem to="/analytics" icon={<BarChart2 />} label="Analytics" />
            {isAuthenticated && isAdmin && (
              <NavItem to="/teams" icon={<Users />} label="Teams" />
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <NavItem to="/profile" icon={<User />} label="Profile" />
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 mt-1 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64 flex-1">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? "bg-blue-50 text-blue-700"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`
      }
    >
      {icon}
      <span className="ml-3">{label}</span>
    </NavLink>
  );
}
