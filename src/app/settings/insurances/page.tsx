'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { 
  Insurance, 
  getInsurances, 
  addInsurance, 
  updateInsurance, 
  deleteInsurance 
} from '@/services/insurances';
import { Location, getLocations } from '@/services/locations';
import { BriefcaseMedical } from 'lucide-react';

const insuranceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  locationIds: z.array(z.string()).min(1, 'Selecione ao menos um local de atendimento'),
});

type InsuranceForm = z.infer<typeof insuranceSchema>;

export default function InsurancesPage() {
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<InsuranceForm>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: { locationIds: [] }
  });

  const selectedLocationIds = watch('locationIds');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [insurancesData, locationsData] = await Promise.all([
        getInsurances(),
        getLocations()
      ]);
      setInsurances(insurancesData);
      setLocations(locationsData.filter(loc => loc.active)); // Only active locations for selection
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (insurance?: Insurance) => {
    if (insurance) {
      setEditingInsurance(insurance);
      setValue('name', insurance.name);
      setValue('locationIds', insurance.locationIds);
    } else {
      setEditingInsurance(null);
      reset({ name: '', locationIds: [] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingInsurance(null);
    reset();
  };

  const onSubmit = async (data: InsuranceForm) => {
    try {
      if (editingInsurance) {
        await updateInsurance(editingInsurance.id, data);
      } else {
        await addInsurance(data);
      }
      closeModal();
      fetchData();
    } catch (error) {
      console.error('Failed to save insurance:', error);
      alert('Erro ao salvar o convênio.');
    }
  };

  const handleDelete = async (insurance: Insurance) => {
    if (window.confirm(`Deseja realmente excluir o convênio "${insurance.name}"?`)) {
      try {
        await deleteInsurance(insurance.id);
        fetchData();
      } catch (error) {
        console.error('Failed to delete insurance:', error);
        alert('Erro ao excluir o convênio.');
      }
    }
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { 
      key: 'locationIds', 
      header: 'Locais Vinculados',
      render: (item: Insurance) => {
        const linkedLocations = locations.filter(loc => item.locationIds.includes(loc.id));
        if (linkedLocations.length === 0) return <span className="text-slate-400 text-sm">Nenhum</span>;
        
        return (
          <div className="flex flex-wrap gap-1">
            {linkedLocations.map(loc => (
              <span key={loc.id} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs border border-blue-100 dark:border-blue-800">
                {loc.name}
              </span>
            ))}
          </div>
        );
      }
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg">
            <BriefcaseMedical className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Convênios</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie planos de saúde e parcerias.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <DataTable
          data={insurances}
          columns={columns}
          onAdd={() => openModal()}
          onEdit={openModal}
          onDelete={handleDelete}
          searchPlaceholder="Buscar convênio..."
          searchableKey="name"
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingInsurance ? 'Editar Convênio' : 'Novo Convênio'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome do Convênio
            </label>
            <input
              {...register('name')}
              type="text"
              className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: Unimed Saúde"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Locais de Atendimento
            </label>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {locations.length > 0 ? locations.map((loc) => (
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
              )) : (
                <p className="text-sm text-slate-500">Nenhum local ativo encontrado.</p>
              )}
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
