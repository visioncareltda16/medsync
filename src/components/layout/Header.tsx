import { Menu, Bell, User } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6">
      <div className="flex items-center">
        <button className="lg:hidden text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <Menu className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}
