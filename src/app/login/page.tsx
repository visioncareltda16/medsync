'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { login, resetPassword, registerUser } from '@/services/auth';
import { Stethoscope, Lock, Mail, AlertCircle, ArrowLeft, User } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

const forgotSchema = z.object({
  email: z.string().email('Email inválido'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const [view, setView] = useState<'login' | 'forgot' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register: registerLogin, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const { register: registerForgot, handleSubmit: handleForgotSubmit, formState: { errors: forgotErrors } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema)
  });

  const { register: registerSignup, handleSubmit: handleRegisterSubmit, formState: { errors: registerErrors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema)
  });

  const onLogin = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      setError(null);
      await login(data.email, data.password);
      // Redirection is handled by AppLayout auth listener
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const onForgot = async (data: ForgotForm) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      await resetPassword(data.email);
      setSuccess('E-mail de recuperação enviado com sucesso. Verifique sua caixa de entrada.');
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar recuperação de senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterForm) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      await registerUser(data.name, data.email, data.password);
      setSuccess('Cadastro realizado! Sua conta está aguardando liberação do administrador.');
      setView('login');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950">
      {/* Left panel - Branding */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 relative text-white p-12 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
          style={{ backgroundImage: "url('/login_bg.png')" }}
        />
        {/* Gradient Overlay for Readability */}
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-blue-900/50 via-blue-800/40 to-slate-900/60" />
        
        {/* Content */}
        <div className="z-20 flex flex-col items-center">
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm mb-6 shadow-xl border border-white/20">
            <Stethoscope className="w-20 h-20 opacity-100" />
          </div>
          <h1 className="text-5xl font-extrabold mb-4 text-center tracking-tight text-white drop-shadow-md">MedSync</h1>
          <p className="text-blue-50 text-xl text-center max-w-md leading-relaxed drop-shadow-sm font-medium">
            Sistema completo e inteligente para gerenciamento de serviços médicos, repasses e faturamento diário.
          </p>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 p-8 md:p-12">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8">
          <div className="md:hidden flex items-center justify-center mb-8 text-blue-600 dark:text-blue-500">
            <Stethoscope className="w-10 h-10 mr-2" />
            <h1 className="text-3xl font-bold tracking-tight">MedSync</h1>
          </div>

          {view === 'login' && (
            <>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Bem-vindo de volta</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Faça login na sua conta para continuar</p>

              {error && (
                <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-600 text-sm flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      {...registerLogin('email')}
                      type="email"
                      className="block w-full pl-10 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                      placeholder="seu@email.com"
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="mt-1 text-sm text-red-500">{loginErrors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      {...registerLogin('password')}
                      type="password"
                      className="block w-full pl-10 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                  {loginErrors.password && (
                    <p className="mt-1 text-sm text-red-500">{loginErrors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setView('register');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Solicitar acesso
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            </>
          )}

          {view === 'forgot' && (
            <>
              <button 
                onClick={() => {
                  setView('login');
                  setError(null);
                  setSuccess(null);
                }}
                className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para o login
              </button>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Recuperar senha</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Digite seu e-mail para receber um link de redefinição</p>

              {error && (
                <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-600 text-sm flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 rounded-lg bg-green-50 text-green-700 text-sm">
                  {success}
                </div>
              )}

              <form onSubmit={handleForgotSubmit(onForgot)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      {...registerForgot('email')}
                      type="email"
                      className="block w-full pl-10 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                      placeholder="seu@email.com"
                    />
                  </div>
                  {forgotErrors.email && (
                    <p className="mt-1 text-sm text-red-500">{forgotErrors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </form>
            </>
          )}

          {view === 'register' && (
            <>
              <button 
                onClick={() => {
                  setView('login');
                  setError(null);
                  setSuccess(null);
                }}
                className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para o login
              </button>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Solicitar Acesso</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Preencha seus dados para criar sua conta</p>

              {error && (
                <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-600 text-sm flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      {...registerSignup('name')}
                      type="text"
                      className="block w-full pl-10 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                      placeholder="Seu nome"
                    />
                  </div>
                  {registerErrors.name && (
                    <p className="mt-1 text-sm text-red-500">{registerErrors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      {...registerSignup('email')}
                      type="email"
                      className="block w-full pl-10 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                      placeholder="seu@email.com"
                    />
                  </div>
                  {registerErrors.email && (
                    <p className="mt-1 text-sm text-red-500">{registerErrors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      {...registerSignup('password')}
                      type="password"
                      className="block w-full pl-10 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                  {registerErrors.password && (
                    <p className="mt-1 text-sm text-red-500">{registerErrors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      {...registerSignup('confirmPassword')}
                      type="password"
                      className="block w-full pl-10 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                  {registerErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{registerErrors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Criando conta...' : 'Criar conta'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
