'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Location, getLocations } from '@/services/locations';
import { Insurance, getInsurances, updateInsurance } from '@/services/insurances';
import { Procedure, getProcedures, updateProcedure } from '@/services/procedures';
import { Building2, ArrowLeft, Settings2, Plus, Check, Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export default function LocationSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const locationId = params.id as string;

  const [location, setLocation] = useState<Location | null>(null);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedInsuranceId, setSelectedInsuranceId] = useState<string | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  // Local state for editing procedure values
  const [editedValues, setEditedValues] = useState<Record<string, Record<string, any>>>({}); // { procId: { baseValue, transferType, transferRate, localRate } }
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [locationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [locs, ins, procs] = await Promise.all([
        getLocations(),
        getInsurances(),
        getProcedures()
      ]);
      const currentLoc = locs.find(l => l.id === locationId);
      if (!currentLoc) {
        router.push('/settings/locations');
        return;
      }
      setLocation(currentLoc);
      setInsurances(ins);
      setProcedures(procs);

      // Select first active insurance if none selected
      const activeIns = ins.filter(i => i.locationIds?.includes(locationId));
      if (activeIns.length > 0 && !selectedInsuranceId) {
        setSelectedInsuranceId(activeIns[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Populate local edit state when insurance changes or procedures load
  useEffect(() => {
    if (selectedInsuranceId && procedures.length > 0) {
      const newEditedValues: Record<string, any> = {};
      procedures.forEach(p => {
        const key = `${selectedInsuranceId}_${locationId}`;
        const val = p.values?.[key];
        newEditedValues[p.id] = val ? { ...val } : { baseValue: 0, transferType: 'PERCENTAGE', transferRate: 0, localRate: 0 };
      });
      setEditedValues(newEditedValues);
    }
  }, [selectedInsuranceId, procedures, locationId]);

  const activeInsurances = insurances.filter(i => i.locationIds?.includes(locationId));

  const toggleInsuranceLink = async (insurance: Insurance) => {
    const isLinked = insurance.locationIds?.includes(locationId);
    let newLocationIds = insurance.locationIds || [];
    
    if (isLinked) {
      newLocationIds = newLocationIds.filter(id => id !== locationId);
      if (selectedInsuranceId === insurance.id) setSelectedInsuranceId(null);
    } else {
      newLocationIds = [...newLocationIds, locationId];
    }

    try {
      await updateInsurance(insurance.id, { locationIds: newLocationIds });
      // Update local state to avoid full refetch delay
      setInsurances(prev => prev.map(i => i.id === insurance.id ? { ...i, locationIds: newLocationIds } : i));
    } catch (error) {
      console.error('Error linking insurance:', error);
      alert('Erro ao vincular convênio.');
    }
  };

  const handleValueChange = (procId: string, field: string, value: any) => {
    setEditedValues(prev => ({
      ...prev,
      [procId]: {
        ...prev[procId],
        [field]: value
      }
    }));
  };

  const handleSavePrices = async () => {
    if (!selectedInsuranceId) return;
    try {
      setIsSaving(true);
      const key = `${selectedInsuranceId}_${locationId}`;
      
      // Batch update procedures
      // Note: In a real large-scale app, a batched Firestore write would be better here.
      // We will loop through procedures that have changes. 
      // For simplicity in this demo, we update all.
      
      const promises = procedures.map(p => {
        const newValues = { ...(p.values || {}) };
        newValues[key] = editedValues[p.id] as any; // Cast as any or ProcedureValue to fix TS
        return updateProcedure(p.id, { values: newValues } as any);
      });

      await Promise.all(promises);
      alert('Preços salvos com sucesso!');
      await fetchData(); // refresh to get true server state
    } catch (error) {
      console.error('Error saving prices:', error);
      alert('Erro ao salvar preços.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !location) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link href="/settings/locations" className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Settings2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Regras Financeiras</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Unidade: <strong className="text-slate-700 dark:text-slate-300">{location.name}</strong></p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar: Convênios da Unidade */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Convênios</h3>
              <button 
                onClick={() => setIsLinkModalOpen(true)}
                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                title="Vincular Novo Convênio"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-1">
              {activeInsurances.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum convênio vinculado a esta unidade.</p>
              ) : (
                activeInsurances.map(ins => (
                  <button
                    key={ins.id}
                    onClick={() => setSelectedInsuranceId(ins.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedInsuranceId === ins.id 
                        ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-300' 
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {ins.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content: Precificação */}
        <div className="flex-1">
          {!selectedInsuranceId ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">Selecione um Convênio</h3>
              <p className="text-sm text-slate-500">Escolha um convênio na lateral para configurar as regras e preços dos procedimentos nesta unidade.</p>
              {activeInsurances.length === 0 && (
                <button 
                  onClick={() => setIsLinkModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Vincular Primeiro Convênio
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                  Preços para: <span className="text-blue-600 dark:text-blue-400">{insurances.find(i => i.id === selectedInsuranceId)?.name}</span>
                </h3>
                <button
                  onClick={handleSavePrices}
                  disabled={isSaving}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? 'Salvando...' : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Regras
                    </>
                  )}
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-0">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Procedimento</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Valor Base (R$)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">Tipo Repasse</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Repasse</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Taxa Local (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                    {procedures.map(proc => {
                      const vals = editedValues[proc.id] || { baseValue: 0, transferType: 'PERCENTAGE', transferRate: 0, localRate: 0 };
                      return (
                        <tr key={proc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-300">
                            <div className="font-medium">{proc.name}</div>
                            <div className="text-xs text-slate-500">{proc.code} • {proc.type}</div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number" step="0.01" min="0"
                              value={vals.baseValue || ''}
                              onChange={(e) => handleValueChange(proc.id, 'baseValue', e.target.value ? parseFloat(e.target.value) : 0)}
                              className="block w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={vals.transferType || 'PERCENTAGE'}
                              onChange={(e) => handleValueChange(proc.id, 'transferType', e.target.value)}
                              className="block w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800"
                            >
                              <option value="PERCENTAGE">Percentual (%)</option>
                              <option value="FIXED">Fixo (R$)</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number" step="0.01" min="0"
                              value={vals.transferRate || ''}
                              onChange={(e) => handleValueChange(proc.id, 'transferRate', e.target.value ? parseFloat(e.target.value) : 0)}
                              className="block w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number" step="0.01" min="0"
                              value={vals.localRate || ''}
                              onChange={(e) => handleValueChange(proc.id, 'localRate', e.target.value ? parseFloat(e.target.value) : 0)}
                              className="block w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title={`Vincular Convênios à ${location.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Selecione quais convênios são aceitos nesta unidade. Eles aparecerão na aba lateral para você configurar os preços.
          </p>
          <div className="max-h-60 overflow-y-auto bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-200 dark:divide-slate-700">
            {insurances.map(ins => {
              const isLinked = ins.locationIds?.includes(locationId);
              return (
                <div key={ins.id} className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{ins.name}</span>
                  <button
                    onClick={() => toggleInsuranceLink(ins)}
                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                      isLinked 
                        ? 'bg-green-100 text-green-600 hover:bg-red-100 hover:text-red-600' 
                        : 'bg-slate-200 text-slate-500 hover:bg-blue-100 hover:text-blue-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {isLinked ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="pt-4 flex justify-end border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setIsLinkModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Concluído
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
