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
  procedureId: z.string().min(1, 'Procedimento é obrigatório'),
  quantity: z.number().min(1, 'Quantidade deve ser maior que 0'),
  transferType: z.enum(['PERCENTAGE', 'FIXED']),
  transferRate: z.number().min(0, 'Valor não pode ser negativo'),
}).superRefine((data, ctx) => {
  if (data.transferType === 'PERCENTAGE' && data.transferRate > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A taxa deve ser até 100%',
      path: ['transferRate'],
    });
  }
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
    defaultValues: { quantity: 1, transferRate: 100, transferType: 'PERCENTAGE', date: format(new Date(), 'yyyy-MM-dd') }
  });

  const watchLocationId = watch('locationId');
  const watchInsuranceId = watch('insuranceId');
  const watchProcedureId = watch('procedureId');
  const watchQuantity = watch('quantity') || 1;
  const watchTransferRate = watch('transferRate') || 0;
  const watchTransferType = watch('transferType') || 'PERCENTAGE';

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

  // Derived transfer value
  const currentTransferValue = useMemo(() => {
    if (!watchLocationId || !watchInsuranceId || !watchProcedureId) return 0;
    const proc = procedures.find(p => p.id === watchProcedureId);
    if (!proc) return 0;
    const key = `${watchInsuranceId}_${watchLocationId}`;
    return proc.values[key] || 0;
  }, [watchLocationId, watchInsuranceId, watchProcedureId, procedures]);

  const currentSubtotal = useMemo(() => {
    if (watchTransferType === 'FIXED') {
      return watchTransferRate * watchQuantity;
    }
    const val = currentTransferValue * watchQuantity;
    return val * (watchTransferRate / 100);
  }, [currentTransferValue, watchQuantity, watchTransferRate, watchTransferType]);

  const openModal = (attendance?: Attendance) => {
    if (attendance) {
      setEditingAttendance(attendance);
      setValue('date', attendance.date);
      setValue('doctorId', attendance.doctorId);
      setValue('locationId', attendance.locationId);
      setValue('patientName', attendance.patientName);
      setValue('insuranceId', attendance.insuranceId);
      setValue('procedureId', attendance.procedureId);
      setValue('quantity', attendance.quantity);
      setValue('transferType', attendance.transferType || 'PERCENTAGE');
      setValue('transferRate', attendance.transferRate);
    } else {
      setEditingAttendance(null);
      reset({ 
        date: format(new Date(), 'yyyy-MM-dd'),
        doctorId: profile?.doctorId ? profile.doctorId : '',
        quantity: 1, 
        transferType: 'PERCENTAGE',
        transferRate: 100 
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

    const payload: Omit<Attendance, 'id'> = {
      ...data,
      doctorId: finalDoctorId,
      month: format(dateObj, 'yyyy-MM'),
      dayOfWeek: format(dateObj, 'EEEE', { locale: ptBR }),
      transferValue: currentTransferValue,
      realValue: currentSubtotal,
      subtotal: currentSubtotal,
      status: editingAttendance ? editingAttendance.status : 'A RECEBER',
      createdAt: editingAttendance ? editingAttendance.createdAt : Date.now(),
      createdBy: editingAttendance?.createdBy || profile?.name || 'Desconhecido',
      createdByRole: editingAttendance?.createdByRole || profile?.role || 'MÉDICO',
    };

    try {
      if (editingAttendance) {
        await updateAttendance(editingAttendance.id, payload);
      } else {
        await addAttendance(payload);
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

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Procedimento</label>
              <select {...register('procedureId')} disabled={!watchInsuranceId} className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50">
                <option value="">Selecione...</option>
                {procedures.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.procedureId && <p className="mt-1 text-sm text-red-500">{errors.procedureId.message}</p>}
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

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Repasse</label>
              <select {...register('transferType')} className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="PERCENTAGE">Percentual (%)</option>
                <option value="FIXED">Valor Fixo (R$)</option>
              </select>
              {errors.transferType && <p className="mt-1 text-sm text-red-500">{errors.transferType.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {watchTransferType === 'FIXED' ? 'Valor Fixo (R$)' : 'Taxa de Repasse (%)'}
              </label>
              <input type="number" step="any" {...register('transferRate', { valueAsNumber: true })} min="0" className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.transferRate && <p className="mt-1 text-sm text-red-500">{errors.transferRate.message}</p>}
            </div>
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
