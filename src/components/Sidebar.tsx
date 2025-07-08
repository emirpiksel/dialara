import { Home, Users, Phone, BarChart2, Bot, GraduationCap, List } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAppMode } from '@/store/useAppMode';
import { ModeSwitcher } from './ModeSwitcher';

export const Sidebar = () => {
  const { mode } = useAppMode();

  return (
    <aside className="w-64 bg-white border-r h-screen flex flex-col justify-between">
      <div>
        <div className="p-4 text-xl font-bold">Dialara 🧠</div>
        <ModeSwitcher />
        <nav className="flex flex-col gap-1 px-4">
          {mode === 'crm' ? (
            <>
              <SidebarItem to="/dashboard" icon={<Home />} label="Dashboard" />
              <SidebarItem to="/agents" icon={<Bot />} label="Agents" />
              <SidebarItem to="/calls" icon={<Phone />} label="Calls" />
              <SidebarItem to="/leads" icon={<List />} label="Leads" />
              <SidebarItem to="/analytics" icon={<BarChart2 />} label="Analytics" />
              <SidebarItem to="/teams" icon={<Users />} label="Teams" />
            </>
          ) : (
            <>
              <SidebarItem to="/training/overview" icon={<GraduationCap />} label="Training Overview" />
              <SidebarItem to="/training/logs" icon={<List />} label="Training Call Logs" />
              <SidebarItem to="/training/progress" icon={<BarChart2 />} label="Progress" />
              <SidebarItem to="/training/leaderboard" icon={<Users />} label="Leaderboard" />
            </>
          )}
        </nav>
      </div>

      <div className="px-4 pb-6 text-sm text-muted-foreground">
        <SidebarItem to="/profile" icon={<Users />} label="Profile" />
        <SidebarItem to="/logout" icon={<List />} label="Sign Out" />
      </div>
    </aside>
  );
};

const SidebarItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-2 p-2 rounded-md ${
        isActive ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-muted transition'
      }`
    }
  >
    {icon}
    {label}
  </NavLink>
);
