import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  BarChart3, 
  MessageSquare, 
  Layers, 
  LogOut,
  Settings,
  Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Upload', path: '/upload', icon: Upload },
  { name: 'Transactions', path: '/transactions', icon: BarChart3 },
  { name: 'Insights', path: '/insights', icon: MessageSquare },
  { name: 'Compare', path: '/compare', icon: Layers },
];

export default function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-white/5 bg-black/40 backdrop-blur-xl z-50">
      {/* Logo Section */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Wallet className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white display-font">
            Insight<span className="text-violet-400">Bank</span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            AI Financial Intel
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
              ${isActive 
                ? 'bg-gradient-to-r from-violet-500/10 to-transparent text-violet-400' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
            `}
          >
            <item.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
            <span className="font-medium">{item.name}</span>
            {/* Active Indicator */}
            <div className="ml-auto opacity-0 group-[.active]:opacity-100 transition-opacity">
               <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]" />
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Footer Info / Settings */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <button className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-slate-200 transition-colors">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
        <button 
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 text-rose-400/80 hover:text-rose-400 hover:bg-rose-400/5 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>

        {/* User Card */}
        <div className="mt-4 bg-white/5 rounded-2xl p-4 flex items-center gap-3 border border-white/5">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 uppercase">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-200 truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
