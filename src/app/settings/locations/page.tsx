'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
import { Building2, Upload, X } from 'lucide-react';

const locationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  address: z.string().min(1, 'Endereço é obrigatório'),
  phone: z.string().optional(),
  logoUrl: z.string().optional(),
  active: z.boolean(),
});

type LocationForm = z.infer<typeof locationSchema>;

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: { active: true }
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewLogo(base64String);
        setValue('logoUrl', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const [showColumns, setShowColumns] = useState({
    name: true,
    address: true,
    phone: true,
    active: true
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
      setValue('logoUrl', location.logoUrl || '');
      setValue('active', location.active);
      setPreviewLogo(location.logoUrl || null);
    } else {
      setEditingLocation(null);
      reset({ active: true, name: '', address: '', phone: '', logoUrl: '' });
      setPreviewLogo(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
    setPreviewLogo(null);
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
    {
      key: 'actions',
      header: 'Regras',
      render: (item: Location) => (
        <Link 
          href={`/settings/locations/${item.id}`}
          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-xs px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded border border-indigo-100 dark:border-indigo-800 whitespace-nowrap"
        >
          Configurar Convênios e Preços
        </Link>
      )
    },
    showColumns.name && { 
      key: 'name', 
      header: 'Nome',
      render: (item: Location) => (
        <div className="flex items-center space-x-3">
          {item.logoUrl ? (
            <img src={item.logoUrl} alt={item.name} className="h-10 w-20 rounded object-contain bg-white border border-slate-200 dark:border-slate-700 p-0.5" />
          ) : (
            <div className="h-10 w-16 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <Building2 className="w-5 h-5 text-slate-400" />
            </div>
          )}
          <span className="font-medium text-slate-900 dark:text-white">{item.name}</span>
        </div>
      )
    },
    showColumns.address && { key: 'address', header: 'Endereço' },
    showColumns.phone && { key: 'phone', header: 'Telefone', render: (item: Location) => item.phone || '-' },
    showColumns.active && { 
      key: 'active', 
      header: 'Status',
      render: (item: Location) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
          {item.active ? 'Ativo' : 'Inativo'}
        </span>
      )
    }
  ].filter(Boolean) as any[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Locais de Atendimento</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie clínicas, hospitais e consultórios.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm mt-4 sm:mt-0">
          <span className="text-slate-500 font-medium px-2">Exibir Colunas:</span>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input type="checkbox" checked={showColumns.name} onChange={(e) => setShowColumns(s => ({...s, name: e.target.checked}))} className="rounded border-slate-300 text-blue-600" />
            <span className="text-slate-700 dark:text-slate-300">Nome</span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input type="checkbox" checked={showColumns.address} onChange={(e) => setShowColumns(s => ({...s, address: e.target.checked}))} className="rounded border-slate-300 text-blue-600" />
            <span className="text-slate-700 dark:text-slate-300">Endereço</span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input type="checkbox" checked={showColumns.phone} onChange={(e) => setShowColumns(s => ({...s, phone: e.target.checked}))} className="rounded border-slate-300 text-blue-600" />
            <span className="text-slate-700 dark:text-slate-300">Telefone</span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer pr-2">
            <input type="checkbox" checked={showColumns.active} onChange={(e) => setShowColumns(s => ({...s, active: e.target.checked}))} className="rounded border-slate-300 text-blue-600" />
            <span className="text-slate-700 dark:text-slate-300">Status</span>
          </label>
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
          onRowDoubleClick={openModal}
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
              Logo (opcional)
            </label>
            <div className="flex items-center space-x-4">
              {previewLogo ? (
                <div className="relative">
                  <img src={previewLogo} alt="Logo preview" className="w-24 h-16 rounded-lg object-contain border border-slate-200 dark:border-slate-700 bg-white p-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewLogo(null);
                      setValue('logoUrl', '');
                    }}
                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 border-dashed">
                  <Building2 className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <div className="flex-1">
                <label className="flex items-center justify-center w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Upload className="w-4 h-4 mr-2" />
                  {previewLogo ? 'Trocar imagem' : 'Fazer upload da logo'}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                </label>
                <p className="mt-1 text-xs text-slate-500">PNG, JPG ou GIF. Máx 2MB.</p>
              </div>
            </div>
          </div>

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
