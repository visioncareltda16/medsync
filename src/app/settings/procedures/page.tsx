'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { 
  Procedure, 
  getProcedures, 
  addProcedure, 
  updateProcedure, 
  deleteProcedure 
} from '@/services/procedures';
import { Insurance, getInsurances } from '@/services/insurances';
import { Location, getLocations } from '@/services/locations';
import { Activity } from 'lucide-react';

const procedureSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().min(1, 'Código é obrigatório'),
  values: z.any().optional(),
});

type ProcedureForm = z.infer<typeof procedureSchema>;

export default function ProceduresPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<ProcedureForm>({
    resolver: zodResolver(procedureSchema),
    defaultValues: { values: {} }
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [procData, insData, locData] = await Promise.all([
        getProcedures(),
        getInsurances(),
        getLocations()
      ]);
      setProcedures(procData);
      setInsurances(insData);
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

  const openModal = (procedure?: Procedure) => {
    if (procedure) {
      setEditingProcedure(procedure);
      setValue('name', procedure.name);
      setValue('code', procedure.code);
      setValue('values', procedure.values || {});
    } else {
      setEditingProcedure(null);
      reset({ name: '', code: '', values: {} });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProcedure(null);
    reset();
  };

  const onSubmit = async (data: ProcedureForm) => {
    try {
      if (editingProcedure) {
        await updateProcedure(editingProcedure.id, data as any);
      } else {
        await addProcedure(data as any);
      }
      closeModal();
      fetchData();
    } catch (error) {
      console.error('Failed to save procedure:', error);
      alert('Erro ao salvar o procedimento.');
    }
  };

  const handleDelete = async (procedure: Procedure) => {
    if (window.confirm(`Deseja realmente excluir o procedimento "${procedure.name}"?`)) {
      try {
        await deleteProcedure(procedure.id);
        fetchData();
      } catch (error) {
        console.error('Failed to delete procedure:', error);
        alert('Erro ao excluir o procedimento.');
      }
    }
  };

  const columns = [
    { key: 'code', header: 'Código' },
    { key: 'name', header: 'Procedimento' },
    {
      key: 'values',
      header: 'Valores Configurados',
      render: (item: Procedure) => {
        const count = Object.keys(item.values || {}).length;
        return <span className="text-sm">{count} valores definidos</span>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Procedimentos</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie procedimentos e seus valores por convênio e local.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <DataTable
          data={procedures}
          columns={columns}
          onAdd={() => openModal()}
          onEdit={openModal}
          onDelete={handleDelete}
          searchPlaceholder="Buscar procedimento..."
          searchableKey="name"
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProcedure ? 'Editar Procedimento' : 'Novo Procedimento'}
      >
        <form onSubmit={handleSubmit(onSubmit, (err) => console.log('Erros de validação:', err))} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Código
              </label>
              <input
                {...register('code')}
                type="text"
                className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: 10101012"
              />
              {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome do Procedimento
              </label>
              <input
                {...register('name')}
                type="text"
                className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Consulta em Consultório"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              Valores por Convênio e Local
            </h4>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {insurances.map(insurance => {
                const linkedLocations = locations.filter(loc => insurance.locationIds.includes(loc.id));
                if (linkedLocations.length === 0) return null;

                return (
                  <div key={insurance.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <h5 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-2">{insurance.name}</h5>
                    <div className="space-y-2">
                      {linkedLocations.map(loc => {
                        const fieldName = `values.${insurance.id}_${loc.id}` as const;
                        return (
                          <div key={loc.id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400 pl-2 border-l-2 border-slate-300 dark:border-slate-600">
                              {loc.name}
                            </span>
                            <div className="relative w-32">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                              <Controller
                                name={fieldName}
                                control={control}
                                render={({ field: { onChange, value } }) => (
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={value || ''}
                                    onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                    className="block w-full pl-8 pr-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="0,00"
                                  />
                                )}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {insurances.length === 0 && (
                <p className="text-sm text-slate-500">Cadastre convênios e locais primeiro.</p>
              )}
            </div>
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
