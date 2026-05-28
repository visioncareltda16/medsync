'use client';

import React, { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function SetupAdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Criando...');
    setError(null);
    
    try {
      let user;
      // 1. Tentar criar usuário no Firebase Auth
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      } catch (authErr: any) {
        // Se a conta já existe (porque a tentativa anterior falhou na metade), fazemos o login
        if (authErr.code === 'auth/email-already-in-use') {
          const loginCredential = await signInWithEmailAndPassword(auth, email, password);
          user = loginCredential.user;
        } else {
          throw authErr;
        }
      }

      // 2. Salvar documento no Firestore com Role de ADMIN
      await setDoc(doc(db, 'users', user.uid), {
        name: name,
        email: email,
        role: 'ADMIN'
      });

      setStatus('Sucesso! Administrador criado. Você já pode acessar a página inicial /login e fazer login.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro ao criar o administrador.');
      setStatus(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">Criar Primeiro Administrador</h1>
        
        {status && (
          <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg text-sm">
            {status}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Seu Nome"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="admin@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha (Mínimo 6 caracteres)</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Criar Conta Admin
          </button>
        </form>
      </div>
    </div>
  );
}
