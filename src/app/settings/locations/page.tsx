'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { 
  Location, 
  getLocations, 
  addLocation, 
  updateLocation, 
  deleteLocation 
} from '@/services/locations';
import { Building2 } from 'lucide-react';

const locationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  address: z.string().min(1, 'Endereço é obrigatório'),
  phone: z.string().optional(),
  active: z.boolean(),
});

type LocationForm = z.infer<typeof locationSchema>;

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: { active: true }
  });

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const data = await getLocations();
      setLocations(data);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const openModal = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setValue('name', location.name);
      setValue('address', location.address);
      setValue('phone', location.phone || '');
      setValue('active', location.active);
    } else {
      setEditingLocation(null);
      reset({ active: true, name: '', address: '', phone: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
    reset();
  };

  const onSubmit = async (data: LocationForm) => {
    try {
      if (editingLocation) {
        await updateLocation(editingLocation.id, data);
      } else {
        await addLocation(data);
      }
      closeModal();
      fetchLocations();
    } catch (error) {
      console.error('Failed to save location:', error);
      alert('Erro ao salvar o local de atendimento.');
    }
  };

  const handleDelete = async (location: Location) => {
    if (window.confirm(`Deseja realmente excluir o local "${location.name}"?`)) {
      try {
        await deleteLocation(location.id);
        fetchLocations();
      } catch (error) {
        console.error('Failed to delete location:', error);
        alert('Erro ao excluir o local.');
      }
    }
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'address', header: 'Endereço' },
    { key: 'phone', header: 'Telefone', render: (item: Location) => item.phone || '-' },
    { 
      key: 'active', 
      header: 'Status',
      render: (item: Location) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
          {item.active ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Locais de Atendimento</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie clínicas, hospitais e consultórios.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <DataTable
          data={locations}
          columns={columns}
          onAdd={() => openModal()}
          onEdit={openModal}
          onDelete={handleDelete}
          searchPlaceholder="Buscar local..."
          searchableKey="name"
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingLocation ? 'Editar Local' : 'Novo Local'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome do Local
            </label>
            <input
              {...register('name')}
              type="text"
              className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: Clínica Saúde Plus"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Endereço Completo
            </label>
            <input
              {...register('address')}
              type="text"
              className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Av. Paulista, 1000 - SP"
            />
            {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Telefone de Contato
            </label>
            <input
              {...register('phone')}
              type="text"
              className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="flex items-center">
            <input
              {...register('active')}
              id="active"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
            />
            <label htmlFor="active" className="ml-2 block text-sm text-slate-900 dark:text-slate-300">
              Local Ativo
            </label>
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
