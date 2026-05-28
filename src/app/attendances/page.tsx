'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuthStore } from '@/store/useAuthStore';
import { Modal } from '@/components/ui/Modal';
import { CalendarDays, Filter, Plus, CheckCircle, Trash2, Edit2 } from 'lucide-react';

import { Attendance, getAttendances, addAttendance, updateAttendance, deleteAttendance, markAsReceived } from '@/services/attendances';
import { Location, getLocations } from '@/services/locations';
import { Doctor, getDoctors } from '@/services/doctors';
import { Insurance, getInsurances } from '@/services/insurances';
import { Procedure, getProcedures } from '@/services/procedures';

const attendanceSchema = z.object({
  date: z.string().min(1, 'Data é obrigatória'),
  doctorId: z.string().optional(),
  locationId: z.string().min(1, 'Local é obrigatório'),
  patientName: z.string().min(1, 'Paciente é obrigatório'),
  insuranceId: z.string().min(1, 'Convênio é obrigatório'),
  procedureIds: z.array(z.string()).min(1, 'Selecione pelo menos um procedimento'),
  quantity: z.number().min(1, 'Quantidade deve ser maior que 0')
});

type AttendanceForm = z.infer<typeof attendanceSchema>;

export default function AttendancesPage() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'ADMIN';

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);

  // Filters
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState<'A RECEBER' | 'RECEBIDO' | ''>('');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<AttendanceForm>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: { quantity: 1, date: format(new Date(), 'yyyy-MM-dd') }
  });

  const watchLocationId = watch('locationId');
  const watchInsuranceId = watch('insuranceId');
  const watchProcedureIds = watch('procedureIds') || [];
  const watchQuantity = watch('quantity') || 1;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attData, locData, docData, insData, procData] = await Promise.all([
        getAttendances({ 
          month: filterMonth,
          doctorId: !isAdmin && profile?.doctorId ? profile.doctorId : (filterDoctor || undefined),
          locationId: filterLocation || undefined,
          status: (filterStatus as any) || undefined
        }),
        getLocations(),
        getDoctors(),
        getInsurances(),
        getProcedures()
      ]);
      setAttendances(attData);
      setLocations(locData);
      setDoctors(docData);
      setInsurances(insData);
      setProcedures(procData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterMonth, filterDoctor, filterLocation, filterStatus]);

  // Derived options based on selections
  const availableInsurances = useMemo(() => {
    if (!watchLocationId) return insurances;
    return insurances.filter(ins => ins.locationIds.includes(watchLocationId));
  }, [watchLocationId, insurances]);

  // Derived transfer config
  const selectedConfigs = useMemo(() => {
    if (!watchLocationId || !watchInsuranceId || !watchProcedureIds.length) return [];
    
    return watchProcedureIds.map(procId => {
      const proc = procedures.find(p => p.id === procId);
      if (!proc) return null;
      const key = `${watchInsuranceId}_${watchLocationId}`;
      const config = proc.values[key];
      if (!config) return null;
      
      let gross = 0;
      if (config.transferType === 'FIXED') {
        gross = config.transferRate * watchQuantity;
      } else {
        gross = (config.baseValue * (config.transferRate / 100)) * watchQuantity;
      }
      const local = config.localRate * watchQuantity;
      const subtotal = gross - local;

      return { proc, config, subtotal };
    }).filter(Boolean) as Array<{ proc: Procedure, config: any, subtotal: number }>;
  }, [watchLocationId, watchInsuranceId, watchProcedureIds, procedures, watchQuantity]);

  const currentSubtotal = useMemo(() => {
    return selectedConfigs.reduce((acc, curr) => acc + curr.subtotal, 0);
  }, [selectedConfigs]);

  const openModal = (attendance?: Attendance) => {
    if (attendance) {
      setEditingAttendance(attendance);
      setValue('date', attendance.date);
      setValue('doctorId', attendance.doctorId);
      setValue('locationId', attendance.locationId);
      setValue('patientName', attendance.patientName);
      setValue('insuranceId', attendance.insuranceId);
      setValue('procedureIds', [attendance.procedureId]);
      setValue('quantity', attendance.quantity);
    } else {
      setEditingAttendance(null);
      reset({ 
        date: format(new Date(), 'yyyy-MM-dd'),
        doctorId: profile?.doctorId ? profile.doctorId : '',
        procedureIds: [],
        quantity: 1
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAttendance(null);
    reset();
  };

  const onSubmit = async (data: AttendanceForm) => {
    const dateObj = parseISO(data.date);
    
    // Ensure doctorId is set for non-admins if not provided
    const finalDoctorId = data.doctorId || (!isAdmin && profile?.doctorId ? profile.doctorId : '');

    if (!finalDoctorId) {
      alert('Erro: Por favor, selecione um médico (ou cadastre um novo na aba Médicos).');
      return;
    }

    try {
      if (editingAttendance) {
        const selConfig = selectedConfigs[0];
        const tType = selConfig?.config?.transferType || editingAttendance.transferType || 'PERCENTAGE';
        const tRate = selConfig?.config?.transferRate || editingAttendance.transferRate || 0;
        const bValue = selConfig?.config?.baseValue || editingAttendance.baseValue || 0;
        const lRate = selConfig?.config?.localRate || editingAttendance.localRate || 0;

        const payload: any = {
          ...data,
          procedureId: data.procedureIds[0],
          doctorId: finalDoctorId,
          month: format(dateObj, 'yyyy-MM'),
          dayOfWeek: format(dateObj, 'EEEE', { locale: ptBR }),
          transferType: tType,
          transferRate: tRate,
          baseValue: bValue,
          localRate: lRate,
          transferValue: bValue,
          realValue: currentSubtotal,
          subtotal: currentSubtotal,
          status: editingAttendance.status,
          createdAt: editingAttendance.createdAt,
          createdBy: editingAttendance.createdBy || profile?.name || 'Desconhecido',
          createdByRole: editingAttendance.createdByRole || profile?.role || 'MÉDICO',
        };
        delete payload.procedureIds;
        
        await updateAttendance(editingAttendance.id, payload as Omit<Attendance, 'id'>);
      } else {
        const promises = data.procedureIds.map(procId => {
          const sel = selectedConfigs.find(s => s.proc.id === procId);
          const tType = sel?.config?.transferType || 'PERCENTAGE';
          const tRate = sel?.config?.transferRate || 0;
          const bValue = sel?.config?.baseValue || 0;
          const lRate = sel?.config?.localRate || 0;
          const subtotal = sel?.subtotal || 0;

          const payload: any = {
            ...data,
            procedureId: procId,
            doctorId: finalDoctorId,
            month: format(dateObj, 'yyyy-MM'),
            dayOfWeek: format(dateObj, 'EEEE', { locale: ptBR }),
            transferType: tType,
            transferRate: tRate,
            baseValue: bValue,
            localRate: lRate,
            transferValue: bValue,
            realValue: subtotal,
            subtotal: subtotal,
            status: 'A RECEBER',
            createdAt: Date.now(),
            createdBy: profile?.name || 'Desconhecido',
            createdByRole: profile?.role || 'MÉDICO',
          };
          delete payload.procedureIds;
          return addAttendance(payload as Omit<Attendance, 'id'>);
        });

        await Promise.all(promises);
      }
      closeModal();
      fetchData();
    } catch (error) {
      console.error('Failed to save attendance:', error);
      alert('Erro ao salvar lançamento.');
    }
  };

  const handleDelete = async (attendance: Attendance) => {
    if (window.confirm('Deseja realmente excluir este lançamento?')) {
      await deleteAttendance(attendance.id);
      fetchData();
    }
  };

  const handleMarkReceived = async (attendance: Attendance) => {
    if (attendance.status === 'RECEBIDO') return;
    if (window.confirm('Marcar como recebido?')) {
      await markAsReceived(attendance.id, profile?.name || 'Sistema');
      fetchData();
    }
  };

  // Grouping attendances by location
  const groupedAttendances = useMemo(() => {
    const groups: Record<string, {
      location: Location | undefined;
      items: Attendance[];
      subtotal: number;
    }> = {};

    attendances.forEach(att => {
      if (!groups[att.locationId]) {
        groups[att.locationId] = {
          location: locations.find(l => l.id === att.locationId),
          items: [],
          subtotal: 0
        };
      }
      groups[att.locationId].items.push(att);
      groups[att.locationId].subtotal += att.subtotal;
    });

    return Object.values(groups).sort((a, b) => (a.location?.name || '').localeCompare(b.location?.name || ''));
  }, [attendances, locations]);

  const totalGeral = groupedAttendances.reduce((acc, curr) => acc + curr.subtotal, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lançamentos Diários</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Controle seus atendimentos e repasses.</p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Lançamento
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Mês</label>
          <input 
            type="month" 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500"
          />
        </div>
        {isAdmin && (
          <div className="w-full sm:w-auto min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Médico</label>
            <select 
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500"
            >
              <option value="">Todos os Médicos</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
        <div className="w-full sm:w-auto min-w-[200px]">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Local</label>
          <select 
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500"
          >
            <option value="">Todos os Locais</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-auto min-w-[150px]">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Status</label>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="A RECEBER">A Receber</option>
            <option value="RECEBIDO">Recebido</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedAttendances.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <Filter className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">Nenhum lançamento encontrado</h3>
              <p className="text-slate-500">Tente ajustar os filtros ou adicione um novo lançamento.</p>
            </div>
          ) : (
            <>
              {groupedAttendances.map(group => (
                <div key={group.location?.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{group.location?.name || 'Local Desconhecido'}</h3>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Subtotal Local</p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        R$ {group.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                      <thead className="bg-slate-50/50 dark:bg-slate-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                          {isAdmin && (
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Médico</th>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Paciente/Proced.</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Convênio</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Qtd</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor Repasse</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                          {isAdmin && (
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Lançado Por</th>
                          )}
                          <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {group.items.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{format(parseISO(item.date), 'dd/MM/yyyy')}</div>
                              <div className="text-xs text-slate-500 capitalize">{item.dayOfWeek}</div>
                            </td>
                            {isAdmin && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {doctors.find(d => d.id === item.doctorId)?.name || 'Desconhecido'}
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.patientName}</div>
                              <div className="text-xs text-slate-500">{procedures.find(p => p.id === item.procedureId)?.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {insurances.find(i => i.id === item.insuranceId)?.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 text-right font-medium">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-slate-500">
                                {item.transferType === 'FIXED' 
                                  ? `Fixo de R$ ${item.transferRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                                  : `${item.transferRate}% de R$ ${item.transferValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {item.status === 'RECEBIDO' ? (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                  Recebido
                                </span>
                              ) : (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                  A Receber
                                </span>
                              )}
                            </td>
                            {isAdmin && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-xs font-medium text-slate-900 dark:text-slate-100">{item.createdBy || 'Sistema'}</div>
                                <div className="text-[10px] text-slate-500">{item.createdByRole === 'ADMIN' ? 'Admin' : 'Médico'}</div>
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                {item.status === 'A RECEBER' && (
                                  <button onClick={() => handleMarkReceived(item)} title="Marcar como Recebido" className="text-green-600 hover:text-green-900 dark:text-green-500 dark:hover:text-green-400">
                                    <CheckCircle className="w-5 h-5" />
                                  </button>
                                )}
                                <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-900 dark:text-blue-500 dark:hover:text-blue-400">
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                {isAdmin && (
                                  <button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400">
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div className="bg-blue-600 text-white rounded-xl p-6 flex justify-between items-center shadow-lg">
                <h3 className="text-xl font-bold uppercase tracking-wide">Total Geral do Mês</h3>
                <p className="text-3xl font-extrabold">R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal Novo Lançamento */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAttendance ? 'Editar Lançamento' : 'Novo Lançamento'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
              <input type="date" {...register('date')} className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date.message}</p>}
            </div>

            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Médico</label>
                <select {...register('doctorId')} className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Selecione...</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {errors.doctorId && <p className="mt-1 text-sm text-red-500">{errors.doctorId.message}</p>}
              </div>
            )}

            <div className={isAdmin ? 'md:col-span-2' : 'md:col-span-1'}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Local de Atendimento</label>
              <select {...register('locationId')} className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Selecione...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              {errors.locationId && <p className="mt-1 text-sm text-red-500">{errors.locationId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Convênio</label>
              <select {...register('insuranceId')} disabled={!watchLocationId} className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50">
                <option value="">Selecione...</option>
                {availableInsurances.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              {errors.insuranceId && <p className="mt-1 text-sm text-red-500">{errors.insuranceId.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Procedimentos {editingAttendance && <span className="text-amber-500 font-normal">(Edição restrita)</span>}
              </label>
              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 p-1">
                {['Consulta', 'Exame', 'Cirurgia', 'Ambulatorial', 'Outros'].map(typeGroup => {
                  const groupProcs = procedures.filter(p => {
                    if (typeGroup === 'Outros') {
                      return !['Consulta', 'Exame', 'Cirurgia', 'Ambulatorial'].includes(p.type);
                    }
                    return p.type === typeGroup;
                  });

                  if (groupProcs.length === 0) return null;

                  return (
                    <div key={typeGroup} className="mb-2">
                      <div className="px-2 py-1 bg-slate-200/60 dark:bg-slate-700/60 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider rounded sticky top-0 z-10 backdrop-blur-sm">
                        {typeGroup}
                      </div>
                      <div className="mt-1 flex flex-col gap-0.5">
                        {groupProcs.map(p => {
                          const isChecked = watchProcedureIds.includes(p.id);
                          const isEditingRestricted = editingAttendance !== null && !isChecked;
                          return (
                            <label key={p.id} className={`flex items-center space-x-2 py-1 px-2 rounded-sm transition-colors ${isChecked ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50'} ${isEditingRestricted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                              <input 
                                type={editingAttendance ? 'radio' : 'checkbox'} 
                                disabled={!watchInsuranceId || isEditingRestricted}
                                value={p.id}
                                {...register('procedureIds')}
                                className="h-3.5 w-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
                              />
                              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300 leading-tight">
                                {p.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {procedures.length === 0 && (
                  <p className="text-sm text-slate-500 p-2">Nenhum procedimento encontrado.</p>
                )}
              </div>
              {errors.procedureIds && <p className="mt-1 text-sm text-red-500">{errors.procedureIds.message as string}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Paciente</label>
              <input type="text" {...register('patientName')} className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.patientName && <p className="mt-1 text-sm text-red-500">{errors.patientName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantidade</label>
              <input type="number" {...register('quantity', { valueAsNumber: true })} min="1" className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity.message}</p>}
            </div>

              {/* Configuração Financeira Transparente */}
              {selectedConfigs.length > 0 && (
                <div className="md:col-span-2 mt-2 border border-blue-100 dark:border-blue-900/30 rounded-lg overflow-hidden bg-blue-50/50 dark:bg-blue-900/10">
                  <div className="bg-blue-100/50 dark:bg-blue-900/30 px-3 py-2 border-b border-blue-100 dark:border-blue-900/30">
                    <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Regras de Repasse (Automático)</h4>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {selectedConfigs.map(({ proc, config, subtotal }) => (
                      <div key={proc.id} className="p-3 border-b border-blue-100 dark:border-blue-900/30 last:border-0 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                        <div className="md:col-span-2">
                          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={proc.name}>{proc.name}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500 uppercase">Base/Repasse</span>
                          <span className="font-medium text-xs text-slate-700 dark:text-slate-300">
                            R$ {config.baseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / {config.transferType === 'FIXED' ? `R$ ${config.transferRate.toLocaleString()}` : `${config.transferRate}%`}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500 uppercase">Taxa Local</span>
                          <span className="font-medium text-xs text-red-600 dark:text-red-400">
                            - R$ {config.localRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] text-slate-500 uppercase">Líquido</span>
                          <span className="font-bold text-xs text-blue-700 dark:text-blue-400">
                            R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Subtotal Previsto:</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              R$ {currentSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Salvar Lançamento</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
