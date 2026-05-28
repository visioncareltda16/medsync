'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { 
  Doctor, 
  getDoctors, 
  addDoctor, 
  updateDoctor, 
  deleteDoctor 
} from '@/services/doctors';
import { Location, getLocations } from '@/services/locations';
import { Stethoscope } from 'lucide-react';

const doctorSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  crm: z.string().min(1, 'CRM é obrigatório'),
  specialty: z.string().min(1, 'Especialidade é obrigatória'),
  locationIds: z.array(z.string()).min(1, 'Selecione ao menos um local de atendimento'),
});

type DoctorForm = z.infer<typeof doctorSchema>;

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<DoctorForm>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { locationIds: [] }
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsData, locData] = await Promise.all([
        getDoctors(),
        getLocations()
      ]);
      setDoctors(docsData);
      setLocations(locData.filter(l => l.active));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (doctor?: Doctor) => {
    if (doctor) {
      setEditingDoctor(doctor);
      setValue('name', doctor.name);
      setValue('email', doctor.email);
      setValue('phone', doctor.phone);
      setValue('crm', doctor.crm);
      setValue('specialty', doctor.specialty);
      setValue('locationIds', doctor.locationIds);
    } else {
      setEditingDoctor(null);
      reset({ name: '', email: '', phone: '', crm: '', specialty: '', locationIds: [] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDoctor(null);
    reset();
  };

  const onSubmit = async (data: DoctorForm) => {
    try {
      if (editingDoctor) {
        await updateDoctor(editingDoctor.id, data);
      } else {
        await addDoctor(data);
      }
      closeModal();
      fetchData();
    } catch (error) {
      console.error('Failed to save doctor:', error);
      alert('Erro ao salvar o médico.');
    }
  };

  const handleDelete = async (doctor: Doctor) => {
    if (window.confirm(`Deseja realmente excluir o médico "${doctor.name}"?`)) {
      try {
        await deleteDoctor(doctor.id);
        fetchData();
      } catch (error) {
        console.error('Failed to delete doctor:', error);
        alert('Erro ao excluir o médico.');
      }
    }
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'crm', header: 'CRM' },
    { key: 'specialty', header: 'Especialidade' },
    { 
      key: 'locationIds', 
      header: 'Locais',
      render: (item: Doctor) => {
        const count = item.locationIds?.length || 0;
        return <span className="text-sm text-slate-500">{count} locais</span>;
      }
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Médicos</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie o corpo clínico e suas alocações.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <DataTable
          data={doctors}
          columns={columns}
          onAdd={() => openModal()}
          onEdit={openModal}
          onDelete={handleDelete}
          searchPlaceholder="Buscar médico..."
          searchableKey="name"
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDoctor ? 'Editar Médico' : 'Novo Médico'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
              <input
                {...register('phone')}
                type="text"
                className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CRM</label>
              <input
                {...register('crm')}
                type="text"
                className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.crm && <p className="mt-1 text-sm text-red-500">{errors.crm.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Especialidade</label>
              <input
                {...register('specialty')}
                type="text"
                className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.specialty && <p className="mt-1 text-sm text-red-500">{errors.specialty.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Locais de Atendimento Vinculados
            </label>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">
              {locations.map((loc) => (
                <div key={loc.id} className="flex items-center">
                  <input
                    {...register('locationIds')}
                    type="checkbox"
                    value={loc.id}
                    id={`loc-${loc.id}`}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label htmlFor={`loc-${loc.id}`} className="ml-2 block text-sm text-slate-900 dark:text-slate-300">
                    {loc.name}
                  </label>
                </div>
              ))}
            </div>
            {errors.locationIds && <p className="mt-1 text-sm text-red-500">{errors.locationIds.message}</p>}
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
