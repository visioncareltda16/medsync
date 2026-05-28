'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { User, getUsers, addUser, updateUser, deleteUser } from '@/services/users';
import { Doctor, getDoctors } from '@/services/doctors';
import { useAuthStore } from '@/store/useAuthStore';
import { Users as UsersIcon, AlertCircle } from 'lucide-react';

const userSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['ADMIN', 'MÉDICO']),
  doctorId: z.string().optional(),
});

type UserForm = z.infer<typeof userSchema>;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { profile, setProfile } = useAuthStore();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'MÉDICO' }
  });

  const watchRole = watch('role');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uData, dData] = await Promise.all([
        getUsers(),
        getDoctors()
      ]);
      setUsers(uData);
      setDoctors(dData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setValue('name', user.name);
      setValue('email', user.email);
      setValue('role', user.role);
      setValue('doctorId', user.doctorId || '');
    } else {
      setEditingUser(null);
      reset({ name: '', email: '', role: 'MÉDICO', doctorId: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    reset();
  };

  const onSubmit = async (data: UserForm) => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, data);
        if (profile?.id === editingUser.id) {
          setProfile({ ...profile, ...data });
        }
      } else {
        await addUser(data);
      }
      closeModal();
      fetchData();
    } catch (error) {
      console.error('Failed to save user:', error);
      alert('Erro ao salvar o usuário.');
    }
  };

  const handleDelete = async (user: User) => {
    if (window.confirm(`Deseja realmente excluir as permissões do usuário "${user.name}"?`)) {
      try {
        await deleteUser(user.id);
        fetchData();
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert('Erro ao excluir o usuário.');
      }
    }
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'email', header: 'E-mail' },
    { 
      key: 'role', 
      header: 'Permissão',
      render: (item: User) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          item.role === 'ADMIN' 
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' 
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
        }`}>
          {item.role}
        </span>
      )
    },
    {
      key: 'doctorId',
      header: 'Médico Vinculado',
      render: (item: User) => {
        const d = doctors.find(doc => doc.id === item.doctorId);
        return d ? <span className="text-sm">{d.name}</span> : <span className="text-red-500 text-sm">Não vinculado</span>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Usuários do Sistema</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie acessos e perfis (Admin / Médico).</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <DataTable
          data={users}
          columns={columns}
          onAdd={() => openModal()}
          onEdit={openModal}
          onDelete={handleDelete}
          searchPlaceholder="Buscar usuário..."
          searchableKey="name"
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
      >
        <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
          <p>Lembre-se: Este cadastro apenas define as permissões. O usuário também deve criar uma conta usando este mesmo e-mail na tela de login.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome</label>
            <input
              {...register('name')}
              type="text"
              className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
            <input
              {...register('email')}
              type="email"
              className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Perfil de Acesso</label>
            <select
              {...register('role')}
              className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ADMIN">Administrador</option>
              <option value="MÉDICO">Médico</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vincular a um Médico Cadastrado (Opcional para Admin)</label>
            <select
              {...register('doctorId')}
              className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Selecione o Médico...</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.doctorId && <p className="mt-1 text-sm text-red-500">{errors.doctorId.message}</p>}
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
