import { NavLink } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, FileText, Users, ScrollText, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tenders', label: 'Tenders', icon: FileText },
  { to: '/audit', label: 'Audit Trail', icon: ScrollText },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 shrink-0 bg-navy-950 text-white flex flex-col min-h-screen">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
          <div>
            <p className="font-bold tracking-wide leading-tight">PRAMAAN</p>
            <p className="text-[11px] text-white/50 leading-tight">Verify with Evidence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 px-2 mb-3">
          <Users className="w-4 h-4 text-white/60" />
          <div className="text-xs">
            <p className="font-medium">{user?.name}</p>
            <p className="text-white/50 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  );
}
