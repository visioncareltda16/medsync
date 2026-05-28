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
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'Lançamentos', href: '/attendances', icon: CalendarDays, show: true },
    { name: 'Relatórios', href: '/reports', icon: FileText, show: true },
  ];

  const adminItems = [
    { name: 'Locais', href: '/settings/locations', icon: Building2 },
    { name: 'Convênios', href: '/settings/insurances', icon: BriefcaseMedical },
    { name: 'Procedimentos', href: '/settings/procedures', icon: Activity },
    { name: 'Médicos', href: '/settings/doctors', icon: Stethoscope },
    { name: 'Usuários', href: '/settings/users', icon: Users },
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
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center px-6 font-bold text-xl text-white tracking-tight border-b border-slate-800">
          <span className="text-blue-500 mr-2">Med</span>Sync
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Principal
          </div>
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => item.show && (
              <li key={item.name}>
                <Link 
                  href={item.href}
                  onClick={closeSidebar}
                  className={`flex items-center px-4 py-2.5 rounded-lg transition-colors ${
                    isActive(item.href) 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>

          {isAdmin && (
            <>
              <div className="px-4 mt-8 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Configurações
              </div>
              <ul className="space-y-1 px-2">
                {adminItems.map((item) => (
                  <li key={item.name}>
                    <Link 
                      href={item.href}
                      onClick={closeSidebar}
                      className={`flex items-center px-4 py-2.5 rounded-lg transition-colors ${
                        isActive(item.href) 
                          ? 'bg-blue-600 text-white' 
                          : 'hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-white truncate">{profile?.name}</p>
            <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
          </div>
          <button 
            onClick={() => {
              closeSidebar();
              logout();
            }}
            className="flex w-full items-center px-4 py-2 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
