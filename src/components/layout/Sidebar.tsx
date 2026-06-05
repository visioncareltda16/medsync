import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CalendarDays, 
  FileText, 
  Settings, 
  LogOut,
  Building2,
  Users,
  Stethoscope,
  BriefcaseMedical,
  Activity
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useLayoutStore } from '@/store/useLayoutStore';
import { logout } from '@/services/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const { isSidebarOpen, closeSidebar } = useLayoutStore();
  const isAdmin = profile?.role === 'ADMIN';

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-sky-400 group-hover:text-sky-300', show: true },
    { name: 'Lançamentos', href: '/attendances', icon: CalendarDays, color: 'text-emerald-400 group-hover:text-emerald-300', show: true },
    { name: 'Relatórios', href: '/reports', icon: FileText, color: 'text-amber-400 group-hover:text-amber-300', show: true },
  ];

  const adminItems = [
    { name: 'Locais', href: '/settings/locations', icon: Building2, color: 'text-indigo-400 group-hover:text-indigo-300' },
    { name: 'Convênios', href: '/settings/insurances', icon: BriefcaseMedical, color: 'text-rose-400 group-hover:text-rose-300' },
    { name: 'Procedimentos', href: '/settings/procedures', icon: Activity, color: 'text-cyan-400 group-hover:text-cyan-300' },
    { name: 'Médicos', href: '/settings/doctors', icon: Stethoscope, color: 'text-fuchsia-400 group-hover:text-fuchsia-300' },
    { name: 'Usuários', href: '/settings/users', icon: Users, color: 'text-violet-400 group-hover:text-violet-300' },
  ];

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-950 flex flex-col h-full border-r border-slate-800/80 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Content Container */}
        <div className="relative z-10 flex flex-col h-full w-full">
          <div className="h-16 flex items-center px-6 font-extrabold text-2xl text-white tracking-tight border-b border-white/10 shadow-sm">
            <span className="text-blue-400 mr-2 drop-shadow-sm">Med</span>Sync
          </div>

          <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="px-4 mb-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest drop-shadow-md">
              Principal
            </div>
            <ul className="space-y-1 px-2">
              {menuItems.map((item) => item.show && (
                <li key={item.name}>
                  <Link 
                    href={item.href}
                    onClick={closeSidebar}
                    className={`group flex items-center px-4 py-2.5 rounded-xl transition-all duration-300 ${
                      isActive(item.href) 
                        ? 'bg-blue-600/80 text-white shadow-md shadow-blue-900/20 border border-blue-500/30' 
                        : 'text-slate-100 hover:bg-white/20 hover:text-white border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 mr-3 transition-transform duration-300 group-hover:scale-125 ${
                      isActive(item.href) ? 'text-white drop-shadow-sm' : item.color
                    }`} />
                    <span className="font-medium tracking-wide">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {isAdmin && (
              <>
                <div className="px-4 mt-8 mb-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest drop-shadow-md">
                  Configurações
                </div>
                <ul className="space-y-1 px-2">
                  {adminItems.map((item) => (
                    <li key={item.name}>
                      <Link 
                        href={item.href}
                        onClick={closeSidebar}
                        className={`group flex items-center px-4 py-2.5 rounded-xl transition-all duration-300 ${
                          isActive(item.href) 
                            ? 'bg-blue-600/80 text-white shadow-md shadow-blue-900/20 border border-blue-500/30' 
                            : 'text-slate-100 hover:bg-white/20 hover:text-white border border-transparent'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 mr-3 transition-transform duration-300 group-hover:scale-125 ${
                          isActive(item.href) ? 'text-white drop-shadow-sm' : item.color
                        }`} />
                        <span className="font-medium tracking-wide">{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </nav>

          <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm mt-auto">
            <div className="mb-4 px-2">
              <p className="text-sm font-bold text-white truncate drop-shadow-sm">{profile?.name}</p>
              <p className="text-xs text-blue-200/70 truncate">{profile?.email}</p>
            </div>
            <button 
              onClick={() => {
                closeSidebar();
                logout();
              }}
              className="group flex w-full items-center px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition-all duration-300 border border-transparent hover:border-red-500/30"
            >
              <LogOut className="w-5 h-5 mr-3 transition-transform duration-300 group-hover:-translate-x-1" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
