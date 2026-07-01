'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '@/store/useAuthStore';
import { initAuthListener, logout } from '@/services/auth';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { useUIStore } from '@/store/useUIStore';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuthStore();
  const { sessionTimeout } = useUIStore();
  const router = useRouter();
  const pathname = usePathname();

  // Session inactivity timeout
  useIdleTimeout(() => {
    if (user) {
      console.log('User logged out due to inactivity');
      logout();
      router.push('/login?timeout=true');
    }
  }, sessionTimeout);

  useEffect(() => {
    const unsubscribe = initAuthListener();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login' && pathname !== '/setup-admin') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If on login or setup page, don't show sidebar/header
  if (pathname === '/login' || pathname === '/setup-admin') {
    return <>{children}</>;
  }

  // If not loading, no user, and not on a public page, we are redirecting to login. Don't render the app shell.
  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Require profile loaded to show app
  if (!profile && user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  // Block pending users
  if (profile?.role === 'PENDENTE') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Conta em Análise</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Seu cadastro foi realizado com sucesso e está aguardando a liberação do administrador. 
            Você terá acesso ao sistema assim que seu perfil for aprovado.
          </p>
          <button
            onClick={() => {
              import('@/services/auth').then(({ logout }) => logout());
            }}
            className="w-full py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Sair e voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
