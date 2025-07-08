import { useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { GraduationCap, BarChart2, List, Users, User, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useTrainingStore } from "@/store/training";
import { ModeSwitcher } from "./ModeSwitcher";

export function TrainingLayout() {
  const { fullName, isAuthenticated, isAdmin, signOut, userId } = useAuthStore();
  const { setUserId } = useTrainingStore();
  const navigate = useNavigate();

  // ✅ Inject userId into training store for call simulation tracking
  useEffect(() => {
    if (userId) {
      setUserId(userId);
    }
  }, [userId, setUserId]);

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
              {fullName ? `Training Mode 🎓` : "Training Mode"}
            </h1>
            <ModeSwitcher />
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <NavItem to="/training" icon={<GraduationCap />} label="Training Overview" exact />
            <NavItem to="/training/calls" icon={<List />} label="Training Call Logs" />
            <NavItem to="/training/progress" icon={<BarChart2 />} label="Progress" />
            <NavItem to="/training/leaderboard" icon={<Users />} label="Leaderboard" />
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

      {/* Main */}
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
  exact = false,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={exact}
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
