import { Menu, Bell, User, Eye, EyeOff, Clock, Timer } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useState, useEffect } from 'react';
import { getSessionDeadline } from '@/hooks/useIdleTimeout';

function SessionCountdown() {
  const { sessionTimeout, setSessionTimeout } = useUIStore();
  const [timeLeft, setTimeLeft] = useState<number>(sessionTimeout * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      const deadline = getSessionDeadline();
      if (deadline > 0) {
        const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    }
    return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-900/20 rounded-lg p-1 border border-red-200 dark:border-red-800 shadow-sm">
      <div className="flex items-center space-x-1 px-2 text-red-600 dark:text-red-400" title="Tempo limite para expirar a sessão de login">
        <Timer className="w-4 h-4" />
        <span className={`text-sm font-mono font-bold min-w-[70px] text-center ${timeLeft < 300 ? 'animate-pulse' : ''}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      <div className="border-l border-red-200 dark:border-red-800 pl-1 pr-1">
        <select
          value={sessionTimeout}
          onChange={(e) => setSessionTimeout(Number(e.target.value))}
          className="bg-transparent border-none text-xs text-slate-600 dark:text-slate-300 focus:ring-0 cursor-pointer outline-none font-medium pr-4 py-1"
          title="Tempo limite da sessão"
        >
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
          <option value={60}>1h</option>
          <option value={120}>2h</option>
          <option value={240}>4h</option>
          <option value={480}>8h</option>
        </select>
      </div>
    </div>
  );
}

export default function Header() {
  const { showValues, toggleValues, visibilityTimeout, setVisibilityTimeout } = useUIStore();
  const { toggleSidebar } = useLayoutStore();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-30 relative">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mr-4"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex items-center space-x-4">
        <SessionCountdown />

        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
          <button 
            onClick={toggleValues}
            className={`p-1.5 rounded-md transition-colors ${showValues ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            title={showValues ? "Ocultar valores" : "Mostrar valores"}
          >
            {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          
          <div className="flex items-center space-x-1 px-1 border-l border-slate-200 dark:border-slate-700 pl-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={visibilityTimeout}
              onChange={(e) => setVisibilityTimeout(Number(e.target.value))}
              className="bg-transparent border-none text-xs text-slate-600 dark:text-slate-300 focus:ring-0 cursor-pointer outline-none pl-1 pr-4 py-1"
              title="Tempo para ocultar automaticamente"
            >
              <option value={0}>Sempre</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>1h</option>
              <option value={120}>2h</option>
              <option value={180}>3h</option>
            </select>
          </div>
        </div>

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
