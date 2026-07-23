'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { Modal } from '@/components/ui/Modal';
import { CalendarDays, Filter, Plus, CheckCircle, Trash2, Edit2, ChevronDown, ChevronUp, Banknote, Undo2 } from 'lucide-react';

import { Attendance, getAttendances, addAttendance, updateAttendance, deleteAttendance, markAsReceived, registerPayment, undoPayment, registerBatchPayments } from '@/services/attendances';
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
  quantities: z.record(z.string(), z.any()).optional()
});

type AttendanceForm = z.infer<typeof attendanceSchema>;

export default function AttendancesPage() {
  const { profile } = useAuthStore();
  const { showValues } = useUIStore();
  const isAdmin = profile?.role === 'ADMIN';

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [overrideBaseValues, setOverrideBaseValues] = useState<Record<string, number>>({});
  const [overrideTransferRates, setOverrideTransferRates] = useState<Record<string, number>>({});
  const [showAllProcedures, setShowAllProcedures] = useState(false);
  const [isRulesExpanded, setIsRulesExpanded] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAttendance, setPaymentAttendance] = useState<Attendance | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');

  // Group Payment Modal State
  const [isGroupPaymentModalOpen, setIsGroupPaymentModalOpen] = useState(false);
  const [groupPaymentLocationId, setGroupPaymentLocationId] = useState('');
  const [groupPaymentAmount, setGroupPaymentAmount] = useState<number | ''>('');
  const [groupPaymentItems, setGroupPaymentItems] = useState<Attendance[]>([]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Filters
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState<'A RECEBER' | 'RECEBIDO' | ''>('');

  // Sorting
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<AttendanceForm>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: { quantities: {}, date: format(new Date(), 'yyyy-MM-dd') }
  });

  const formValues = watch();
  const watchLocationId = formValues.locationId;
  const watchInsuranceId = formValues.insuranceId;
  const watchProcedureIds = formValues.procedureIds || [];
  const watchQuantities = formValues.quantities || {};
  const watchQuantitiesStr = JSON.stringify(watchQuantities);

  const previousProcedureIds = useRef<string[]>([]);
  
  useEffect(() => {
    if (editingAttendance && watchProcedureIds && watchProcedureIds.length > 1) {
      const newlyAdded = watchProcedureIds.find(id => !previousProcedureIds.current.includes(id));
      if (newlyAdded) {
        setValue('procedureIds', [newlyAdded]);
      } else {
        setValue('procedureIds', [watchProcedureIds[watchProcedureIds.length - 1]]);
      }
    }
    previousProcedureIds.current = watchProcedureIds;
  }, [watchProcedureIds, editingAttendance, setValue]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attData, locData, docData, insData, procData] = await Promise.all([
        getAttendances({ 
          date: filterDate || undefined,
          month: filterMonth || undefined,
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
  }, [filterDate, filterMonth, filterDoctor, filterLocation, filterStatus]);

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
      let local = 0;
      let effectiveBaseValue = overrideBaseValues[procId] !== undefined ? overrideBaseValues[procId] : (config.transferType === 'VARIABLE' ? 0 : config.baseValue);
      let effectiveTransferRate = overrideTransferRates[procId] !== undefined ? overrideTransferRates[procId] : config.transferRate;

      let quantity = watchQuantities[procId];
      if (typeof quantity !== 'number' || isNaN(quantity)) quantity = 1;

      if (config.transferType === 'FIXED') {
        gross = effectiveTransferRate * quantity;
      } else {
        gross = (effectiveBaseValue * (effectiveTransferRate / 100)) * quantity;
      }
      
      local = (effectiveBaseValue * quantity) - gross;
      const subtotal = gross;

      return { proc, config, subtotal, local, effectiveBaseValue, effectiveTransferRate, quantity };
    }).filter(Boolean) as Array<{ proc: Procedure, config: any, subtotal: number, local: number, effectiveBaseValue: number, effectiveTransferRate: number, quantity: number }>;
  }, [watchLocationId, watchInsuranceId, watchProcedureIds, procedures, watchQuantitiesStr, overrideBaseValues, overrideTransferRates]);

  const currentSubtotal = useMemo(() => {
    return selectedConfigs.reduce((acc, curr) => acc + curr.subtotal, 0);
  }, [selectedConfigs]);

  const openModal = (attendance?: Attendance) => {
    if (attendance) {
      setEditingAttendance(attendance);
      setOverrideBaseValues({ [attendance.procedureId]: attendance.baseValue || 0 });
      setOverrideTransferRates({ [attendance.procedureId]: attendance.transferRate || 0 });
      setShowAllProcedures(false);
      setValue('date', attendance.date);
      setValue('doctorId', attendance.doctorId);
      setValue('locationId', attendance.locationId);
      setValue('patientName', attendance.patientName);
      setValue('insuranceId', attendance.insuranceId);
      setValue('procedureIds', [attendance.procedureId]);
      setValue('quantities', { [attendance.procedureId]: attendance.quantity });
    } else {
      setEditingAttendance(null);
      setOverrideBaseValues({});
      setOverrideTransferRates({});
      setShowAllProcedures(false);
      reset({ 
        date: format(new Date(), 'yyyy-MM-dd'),
        doctorId: profile?.doctorId ? profile.doctorId : '',
        procedureIds: [],
        quantities: {}
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAttendance(null);
    setOverrideBaseValues({});
    setOverrideTransferRates({});
    setShowAllProcedures(false);
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
        const tRate = selConfig?.effectiveTransferRate !== undefined ? selConfig.effectiveTransferRate : (editingAttendance.transferRate || 0);
        const bValue = selConfig?.effectiveBaseValue !== undefined ? selConfig.effectiveBaseValue : (editingAttendance.baseValue || 0);
        const perUnitGross = tType === 'FIXED' ? tRate : (bValue * (tRate / 100));
        const lRate = bValue - perUnitGross;
        const procId = data.procedureIds[0];
        const rawQty = data.quantities?.[procId];
        const quantity = (typeof rawQty === 'number' && !isNaN(rawQty) && rawQty > 0) ? rawQty : 1;

        const payload: any = {
          ...data,
          procedureId: procId,
          quantity: quantity,
          doctorId: finalDoctorId,
          month: format(dateObj, 'yyyy-MM'),
          dayOfWeek: format(dateObj, 'EEEE', { locale: ptBR }),
          transferType: tType,
          transferRate: tRate,
          baseValue: bValue,
          localRate: lRate * quantity,
          transferValue: bValue * quantity,
          realValue: currentSubtotal,
          subtotal: currentSubtotal,
          status: editingAttendance.status,
          createdAt: editingAttendance.createdAt,
          createdBy: editingAttendance.createdBy || profile?.name || 'Desconhecido',
          createdByRole: editingAttendance.createdByRole || profile?.role || 'MÉDICO',
        };
        delete payload.procedureIds;
        delete payload.quantities;
        
        await updateAttendance(editingAttendance.id, payload as Omit<Attendance, 'id'>);
      } else {
        const promises = data.procedureIds.map(procId => {
          const sel = selectedConfigs.find(s => s.proc.id === procId);
          const tType = sel?.config?.transferType || 'PERCENTAGE';
          const tRate = sel?.effectiveTransferRate !== undefined ? sel.effectiveTransferRate : 0;
          const bValue = sel?.effectiveBaseValue !== undefined ? sel.effectiveBaseValue : 0;
          const perUnitGross = tType === 'FIXED' ? tRate : (bValue * (tRate / 100));
          const lRate = bValue - perUnitGross;
          const subtotal = sel?.subtotal || 0;
          const rawQty = data.quantities?.[procId];
          const quantity = (typeof rawQty === 'number' || !isNaN(Number(rawQty))) && Number(rawQty) > 0 ? Number(rawQty) : 1;

          const payload: any = {
            ...data,
            procedureId: procId,
            quantity: quantity,
            doctorId: finalDoctorId,
            month: format(dateObj, 'yyyy-MM'),
            dayOfWeek: format(dateObj, 'EEEE', { locale: ptBR }),
            transferType: tType,
            transferRate: tRate,
            baseValue: bValue,
            localRate: lRate * quantity,
            transferValue: bValue * quantity,
            realValue: subtotal,
            subtotal: subtotal,
            status: 'A RECEBER',
            createdAt: Date.now(),
            createdBy: profile?.name || 'Desconhecido',
            createdByRole: profile?.role || 'MÉDICO',
          };
          delete payload.procedureIds;
          delete payload.quantities;
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
      await markAsReceived(attendance.id, profile?.name || 'Sistema', attendance.subtotal);
      fetchData();
    }
  };

  const handleOpenPaymentModal = (attendance: Attendance) => {
    setPaymentAttendance(attendance);
    const faltante = attendance.subtotal - (attendance.amountReceived || 0);
    setPaymentAmount(faltante > 0 ? faltante : attendance.subtotal);
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentAttendance(null);
    setPaymentAmount('');
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAttendance || typeof paymentAmount !== 'number' || paymentAmount <= 0) return;

    try {
      const newAmountReceived = (paymentAttendance.amountReceived || 0) + paymentAmount;
      await registerPayment(
        paymentAttendance.id, 
        newAmountReceived, 
        paymentAttendance.subtotal, 
        profile?.name || 'Sistema'
      );
      handleClosePaymentModal();
      fetchData();
    } catch (error) {
      console.error('Failed to register payment:', error);
      alert('Erro ao registrar pagamento.');
    }
  };

  const handleUndoPayment = async (attendance: Attendance) => {
    if (window.confirm('Deseja desfazer o recebimento deste lançamento?')) {
      try {
        await undoPayment(attendance.id);
        fetchData();
      } catch (error) {
        console.error('Failed to undo payment:', error);
        alert('Erro ao desfazer recebimento.');
      }
    }
  };

  const handleOpenGroupPaymentModal = (locationId: string, items: Attendance[], e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Filtra os itens que não estão totalmente recebidos e os ordena para baixa (ex: mais antigos primeiro)
    const pendingItems = items.filter(item => item.status !== 'RECEBIDO').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (pendingItems.length === 0) {
      alert('Não há pendências para este local.');
      return;
    }

    setGroupPaymentItems(pendingItems);
    setGroupPaymentLocationId(locationId);
    setGroupPaymentAmount('');
    setIsGroupPaymentModalOpen(true);
  };

  const handleCloseGroupPaymentModal = () => {
    setIsGroupPaymentModalOpen(false);
    setGroupPaymentLocationId('');
    setGroupPaymentAmount('');
    setGroupPaymentItems([]);
  };

  const handleRegisterGroupPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof groupPaymentAmount !== 'number' || groupPaymentAmount <= 0 || groupPaymentItems.length === 0) return;

    try {
      let remainingValue = groupPaymentAmount;
      const updates: { id: string; amount: number; subtotal: number }[] = [];

      for (const item of groupPaymentItems) {
        if (remainingValue <= 0) break;

        const alreadyReceived = item.amountReceived || 0;
        const missingForThisItem = item.subtotal - alreadyReceived;
        
        if (missingForThisItem <= 0) continue;

        const valueToApply = Math.min(remainingValue, missingForThisItem);
        const newTotalReceived = alreadyReceived + valueToApply;

        updates.push({
          id: item.id,
          amount: newTotalReceived,
          subtotal: item.subtotal
        });

        remainingValue -= valueToApply;
      }

      if (updates.length > 0) {
        await registerBatchPayments(updates, profile?.name || 'Sistema');
        handleCloseGroupPaymentModal();
        fetchData();
      } else {
        alert('Nenhum valor pôde ser aplicado.');
      }
    } catch (error) {
      console.error('Failed to register group payment:', error);
      alert('Erro ao registrar pagamento em lote.');
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

    const sortedGroups = Object.values(groups).sort((a, b) => (a.location?.name || '').localeCompare(b.location?.name || ''));

    sortedGroups.forEach(group => {
      group.items.sort((a, b) => {
        let valA: any = a[sortField as keyof Attendance];
        let valB: any = b[sortField as keyof Attendance];

        if (sortField === 'doctorName') {
          valA = doctors.find(d => d.id === a.doctorId)?.name || '';
          valB = doctors.find(d => d.id === b.doctorId)?.name || '';
        } else if (sortField === 'patientName') {
          valA = a.patientName;
          valB = b.patientName;
        } else if (sortField === 'insuranceName') {
          valA = insurances.find(i => i.id === a.insuranceId)?.name || '';
          valB = insurances.find(i => i.id === b.insuranceId)?.name || '';
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    });

    return sortedGroups;
  }, [attendances, locations, doctors, insurances, sortField, sortDirection]);

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
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Data</label>
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              if (e.target.value) {
                setFilterMonth(e.target.value.substring(0, 7));
              }
            }}
            className="block w-full h-10 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Mês</label>
          <input 
            type="month" 
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              if (e.target.value) setFilterDate('');
            }}
            className="block w-full h-10 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500"
          />
        </div>
        {isAdmin && (
          <div className="w-full sm:w-auto min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Médico</label>
            <select 
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              className="block w-full h-10 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500"
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
            className="block w-full h-10 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500"
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
            className="block w-full h-10 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500"
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
              {groupedAttendances.map(group => {
                const groupId = group.location?.id || 'unknown';
                const isCollapsed = collapsedGroups[groupId];
                const uniqueDates = Array.from(new Set(group.items.map(i => i.date)));
                const dateColors = [
                  'bg-blue-100/70 dark:bg-blue-900/40',
                  'bg-emerald-100/70 dark:bg-emerald-900/40',
                  'bg-amber-100/70 dark:bg-amber-900/40',
                  'bg-purple-100/70 dark:bg-purple-900/40',
                  'bg-rose-100/70 dark:bg-rose-900/40'
                ];
                const groupStats = group.items.reduce((acc, item) => {
                  acc.total += item.subtotal;
                  if (item.status === 'RECEBIDO') {
                    acc.received += item.subtotal;
                  } else if (item.amountReceived) {
                    acc.received += item.amountReceived;
                  }
                  return acc;
                }, { total: 0, received: 0 });

                let headerBgClass = "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/80";
                let titleColorClass = "text-slate-900 dark:text-white";
                let statusBadge = null;

                if (groupStats.total > 0) {
                  if (groupStats.received === 0) {
                    titleColorClass = "text-purple-600 dark:text-purple-400";
                    statusBadge = <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded-full dark:bg-purple-900/40 dark:text-purple-300 uppercase">Pendente</span>;
                  } else if (groupStats.received >= groupStats.total) {
                    titleColorClass = "text-green-600 dark:text-green-400";
                    statusBadge = <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full dark:bg-green-900/30 dark:text-green-400 uppercase flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Pago</span>;
                  } else {
                    titleColorClass = "text-orange-600 dark:text-orange-400";
                    statusBadge = <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 rounded-full dark:bg-orange-900/30 dark:text-orange-400 uppercase">Parcial</span>;
                  }
                }

                return (
                <div key={groupId} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div 
                    className={`px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center cursor-pointer transition-colors ${headerBgClass}`}
                    onClick={() => toggleGroup(groupId)}
                  >
                    <div className="flex items-center gap-3">
                      <h3 className={`font-bold text-lg ${titleColorClass}`}>{group.location?.name || 'Local Desconhecido'}</h3>
                      {statusBadge}
                      <div className="p-1 rounded-full bg-slate-200/50 dark:bg-slate-700/50 text-slate-500">
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Subtotal Local</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {showValues ? `R$ ${group.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ ****'}
                        </p>
                      </div>
                      {groupStats.received < groupStats.total && (
                        <button 
                          onClick={(e) => handleOpenGroupPaymentModal(groupId, group.items, e)}
                          title="Pagamento em Lote" 
                          className="ml-2 p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-800/60 transition-colors shadow-sm"
                        >
                          <Banknote className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                      <thead className="bg-slate-50/50 dark:bg-slate-900">
                        <tr>
                          <th onClick={() => handleSort('date')} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Data{renderSortIcon('date')}</th>
                          {isAdmin && (
                            <th onClick={() => handleSort('doctorName')} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Médico{renderSortIcon('doctorName')}</th>
                          )}
                          <th onClick={() => handleSort('patientName')} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Paciente/Proced.{renderSortIcon('patientName')}</th>
                          <th onClick={() => handleSort('insuranceName')} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Convênio{renderSortIcon('insuranceName')}</th>
                          <th onClick={() => handleSort('quantity')} className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Qtd{renderSortIcon('quantity')}</th>
                          <th onClick={() => handleSort('subtotal')} className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Valor Repasse{renderSortIcon('subtotal')}</th>
                          <th onClick={() => handleSort('status')} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Status{renderSortIcon('status')}</th>
                          {isAdmin && (
                            <th onClick={() => handleSort('createdBy')} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Lançado Por{renderSortIcon('createdBy')}</th>
                          )}
                          <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="">
                        {group.items.map((item, index) => {
                          const dateColor = dateColors[uniqueDates.indexOf(item.date) % dateColors.length];
                          const previousItem = index > 0 ? group.items[index - 1] : null;
                          const isSameAsPrevious = previousItem && 
                            previousItem.patientName === item.patientName && 
                            previousItem.date === item.date &&
                            previousItem.doctorId === item.doctorId &&
                            previousItem.insuranceId === item.insuranceId;

                          return (
                          <tr 
                            key={item.id} 
                            onDoubleClick={() => openModal(item)}
                            className={`${dateColor} hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${!isSameAsPrevious && index > 0 ? 'border-t border-slate-200 dark:border-slate-800' : ''}`}
                          >
                            <td className={`px-3 ${!isSameAsPrevious ? 'pt-3 pb-1' : 'py-1'} whitespace-nowrap align-middle`}>
                              {!isSameAsPrevious ? (
                                <>
                                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{format(parseISO(item.date), 'dd/MM/yyyy')}</div>
                                  <div className="text-[11px] text-slate-500 capitalize">{item.dayOfWeek}</div>
                                </>
                              ) : (
                                <div className="text-sm font-medium text-transparent">--</div>
                              )}
                            </td>
                            {isAdmin && (
                              <td className={`px-3 ${!isSameAsPrevious ? 'pt-3 pb-1' : 'py-1'} whitespace-nowrap text-sm text-slate-500 align-middle`}>
                                {!isSameAsPrevious ? doctors.find(d => d.id === item.doctorId)?.name || 'Desconhecido' : ''}
                              </td>
                            )}
                            <td className={`px-3 ${!isSameAsPrevious ? 'pt-3 pb-1' : 'py-1'} align-middle`}>
                              {!isSameAsPrevious && (
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">{item.patientName}</div>
                              )}
                              <div className="text-[11px] text-slate-500 line-clamp-1 flex items-center ml-2">
                                <span className="mr-1 text-slate-300 dark:text-slate-600">└</span>
                                {procedures.find(p => p.id === item.procedureId)?.name}
                              </div>
                            </td>
                            <td className={`px-3 ${!isSameAsPrevious ? 'pt-3 pb-1' : 'py-1'} whitespace-nowrap text-sm text-slate-500 align-middle`}>
                              {!isSameAsPrevious ? insurances.find(i => i.id === item.insuranceId)?.name : ''}
                            </td>
                            <td className={`px-3 ${!isSameAsPrevious ? 'pt-3 pb-1' : 'py-1'} whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 text-right font-medium align-middle`}>
                              {item.quantity}
                            </td>
                            <td className={`px-3 ${!isSameAsPrevious ? 'pt-3 pb-1' : 'py-1'} whitespace-nowrap text-right align-middle`}>
                              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {showValues ? `R$ ${item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ ****'}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {item.transferType === 'FIXED' 
                                  ? `Fixo de R$ ${item.transferRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                                  : `${item.transferRate}% de R$ ${showValues ? item.transferValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '****'}`}
                              </div>
                              {item.status === 'A RECEBER' && item.amountReceived && item.amountReceived > 0 && showValues ? (
                                <div className="mt-1 text-[10px] text-orange-600 font-medium">
                                  Recebido: R$ {item.amountReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<br/>
                                  Falta: R$ {(item.subtotal - item.amountReceived).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              ) : null}
                            </td>
                            <td className={`px-3 ${!isSameAsPrevious ? 'pt-3 pb-1' : 'py-1'} whitespace-nowrap text-center align-middle`}>
                              {item.status === 'RECEBIDO' ? (
                                <span className="px-2 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                  Recebido
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                  A Receber
                                </span>
                              )}
                            </td>
                            {isAdmin && (
                              <td className={`px-3 ${!isSameAsPrevious ? 'pt-3 pb-1' : 'py-1'} whitespace-nowrap align-middle`}>
                                <div className="text-[11px] font-medium text-slate-900 dark:text-slate-100">{item.createdBy || 'Sistema'}</div>
                                <div className="text-[10px] text-slate-500">{item.createdByRole === 'ADMIN' ? 'Admin' : 'Médico'}</div>
                              </td>
                            )}
                            <td className={`px-3 ${!isSameAsPrevious ? 'pt-3 pb-1' : 'py-1'} whitespace-nowrap text-right text-sm font-medium align-middle`}>
                              <div className="flex justify-end space-x-2">
                                {item.status === 'A RECEBER' && (
                                  <>
                                    <button onClick={() => handleMarkReceived(item)} title="Marcar Recebimento Total" className="text-green-600 hover:text-green-900 dark:text-green-500 dark:hover:text-green-400">
                                      <CheckCircle className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleOpenPaymentModal(item)} title="Registrar Valor Recebido" className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-500 dark:hover:text-emerald-400">
                                      <Banknote className="w-5 h-5" />
                                    </button>
                                  </>
                                )}
                                {(item.status === 'RECEBIDO' || (item.amountReceived && item.amountReceived > 0)) ? (
                                  <button onClick={() => handleUndoPayment(item)} title="Desfazer Recebimento" className="text-orange-600 hover:text-orange-900 dark:text-orange-500 dark:hover:text-orange-400">
                                    <Undo2 className="w-5 h-5" />
                                  </button>
                                ) : null}
                                <button onClick={() => openModal(item)} title="Editar" className="text-blue-600 hover:text-blue-900 dark:text-blue-500 dark:hover:text-blue-400">
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                {isAdmin && (
                                  <button onClick={() => handleDelete(item)} title="Excluir" className="text-red-600 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400">
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              )})}

              <div className="bg-blue-600 text-white rounded-xl p-6 flex justify-between items-center shadow-lg">
                <h3 className="text-xl font-bold uppercase tracking-wide">Total Geral do Mês</h3>
                <p className="text-3xl font-extrabold">{showValues ? `R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ ****'}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal Novo Lançamento */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAttendance ? 'Editar Lançamento' : 'Novo Lançamento'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Data</label>
              <input type="date" {...register('date')} className="block w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.date && <p className="mt-0.5 text-xs text-red-500">{errors.date.message}</p>}
            </div>

            {isAdmin && (
              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Médico</label>
                <select {...register('doctorId')} className="block w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Selecione...</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {errors.doctorId && <p className="mt-0.5 text-xs text-red-500">{errors.doctorId.message}</p>}
              </div>
            )}

            <div className={isAdmin ? 'md:col-span-2' : 'md:col-span-1'}>
              <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Local de Atendimento</label>
              <select {...register('locationId')} className="block w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Selecione...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              {errors.locationId && <p className="mt-0.5 text-xs text-red-500">{errors.locationId.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Nome do Paciente</label>
              <input type="text" {...register('patientName')} className="block w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.patientName && <p className="mt-0.5 text-xs text-red-500">{errors.patientName.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Convênio</label>
              <select {...register('insuranceId')} disabled={!watchLocationId} className="block w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50">
                <option value="">Selecione...</option>
                {availableInsurances.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              {errors.insuranceId && <p className="mt-0.5 text-xs text-red-500">{errors.insuranceId.message}</p>}
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-0.5">
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  Procedimentos
                </label>
                {watchLocationId && watchInsuranceId && !showAllProcedures && (
                  <button 
                    type="button"
                    onClick={() => setShowAllProcedures(true)}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    + Incluir procedimento não configurado
                  </button>
                )}
                {watchLocationId && watchInsuranceId && showAllProcedures && (
                  <button 
                    type="button"
                    onClick={() => setShowAllProcedures(false)}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
                  >
                    Ocultar não configurados
                  </button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 p-1">
                {(!watchLocationId || !watchInsuranceId) ? (
                  <p className="text-xs text-slate-500 p-4 text-center">Selecione o Local de Atendimento e o Convênio para ver os procedimentos.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
                    {['Consulta', 'Exame', 'Cirurgia', 'Ambulatorial', 'Outros'].map(typeGroup => {
                      const groupProcs = procedures.filter(p => {
                        if (typeGroup === 'Outros') {
                          if (['Consulta', 'Exame', 'Cirurgia', 'Ambulatorial'].includes(p.type)) return false;
                        } else if (p.type !== typeGroup) {
                          return false;
                        }
                        
                        if (showAllProcedures || watchProcedureIds.includes(p.id)) return true;
                        
                        const key = `${watchInsuranceId}_${watchLocationId}`;
                        const val = p.values?.[key];
                        return val ? (val.baseValue > 0 || val.transferRate > 0 || val.localRate > 0) : false;
                    }).sort((a, b) => a.name.localeCompare(b.name));

                    if (groupProcs.length === 0) return null;

                    return (
                      <div key={typeGroup} className="mb-0">
                        <div className="px-1.5 py-0.5 mb-0.5 bg-slate-200/60 dark:bg-slate-700/60 text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider rounded sticky top-0 z-10 backdrop-blur-sm">
                          {typeGroup}
                        </div>
                        <div className="flex flex-col gap-0">
                          {groupProcs.map(p => {
                            const isChecked = watchProcedureIds.includes(p.id);
                            return (
                              <div key={p.id} className={`flex items-center justify-between py-0.5 px-1.5 rounded-sm transition-colors ${isChecked ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}>
                                <label className="flex items-center space-x-1.5 cursor-pointer flex-1 min-w-0">
                                  <input 
                                    type="checkbox" 
                                    disabled={!watchInsuranceId}
                                    value={p.id}
                                    {...register('procedureIds')}
                                    className="h-3 w-3 flex-shrink-0 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
                                  />
                                  <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300 leading-tight truncate">
                                    {p.name}
                                  </span>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
                {watchLocationId && watchInsuranceId && procedures.length === 0 && (
                  <p className="text-xs text-slate-500 p-2 text-center">Nenhum procedimento encontrado para este convênio.</p>
                )}
              </div>
              {errors.procedureIds && <p className="mt-0.5 text-xs text-red-500">{errors.procedureIds.message as string}</p>}
            </div>

              {/* Configuração Financeira Transparente */}
              {selectedConfigs.length > 0 && (
                <div className="md:col-span-2 mt-2 border border-blue-100 dark:border-blue-900/30 rounded-lg overflow-hidden bg-blue-50/50 dark:bg-blue-900/10">
                  <div 
                    className="bg-blue-100/50 dark:bg-blue-900/30 px-3 py-2 border-b border-blue-100 dark:border-blue-900/30 flex justify-between items-center cursor-pointer select-none"
                    onClick={() => setIsRulesExpanded(!isRulesExpanded)}
                  >
                    <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Regras de Repasse (Automático)</h4>
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">
                      {isRulesExpanded ? 'Recolher' : 'Expandir'}
                    </span>
                  </div>
                  {isRulesExpanded && (
                    <div className="max-h-40 overflow-y-auto">
                    {selectedConfigs.map(({ proc, config, subtotal, local, effectiveBaseValue, quantity }) => (
                      <div key={proc.id} className="p-3 border-b border-blue-100 dark:border-blue-900/30 last:border-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                        <div className="w-full sm:w-1/3 sm:min-w-[120px] flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 uppercase">Qtd</span>
                            <input
                              type="number"
                              min="1"
                              value={watchQuantities[proc.id] !== undefined ? watchQuantities[proc.id] : 1}
                              onChange={(e) => setValue(`quantities.${proc.id}`, e.target.value === '' ? '' : parseInt(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              className="w-14 h-7 text-xs px-2 text-center border border-blue-300 bg-blue-50 text-blue-900 font-bold rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-100"
                            />
                          </div>
                          <span className="block text-sm font-bold text-slate-700 dark:text-slate-300 truncate" title={proc.name}>
                            {proc.name}
                          </span>
                        </div>
                        <div className="flex-1">
                          <span className="block text-[9px] text-slate-500 uppercase">Base/Repasse (Unitário)</span>
                          {showValues ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-slate-500">R$</span>
                              <input 
                                type="number" step="0.01" min="0"
                                value={overrideBaseValues[proc.id] !== undefined ? overrideBaseValues[proc.id] : (config.transferType === 'VARIABLE' ? '' : config.baseValue)}
                                onChange={(e) => setOverrideBaseValues(prev => ({ ...prev, [proc.id]: e.target.value ? parseFloat(e.target.value) : 0 }))}
                                className="w-16 px-1 py-0.5 text-xs font-medium border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-slate-800 rounded outline-none transition-colors dark:text-slate-200"
                                placeholder="0.00"
                                title="Editar Base"
                              />
                              <span className="text-xs text-slate-500">/</span>
                              {config.transferType === 'FIXED' && <span className="text-xs text-slate-500">R$</span>}
                              <input 
                                type="number" step="0.01" min="0"
                                value={overrideTransferRates[proc.id] !== undefined ? overrideTransferRates[proc.id] : config.transferRate}
                                onChange={(e) => setOverrideTransferRates(prev => ({ ...prev, [proc.id]: e.target.value ? parseFloat(e.target.value) : 0 }))}
                                className="w-12 px-1 py-0.5 text-xs font-medium border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-slate-800 rounded outline-none transition-colors dark:text-slate-200"
                                placeholder="0.00"
                                title="Editar Repasse"
                              />
                              {config.transferType === 'PERCENTAGE' && <span className="text-xs text-slate-500">%</span>}
                            </div>
                          ) : (
                            <span className="font-medium text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">R$ **** / ****</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="block text-[9px] text-slate-500 uppercase">Taxa Local</span>
                          <span className="font-medium text-xs text-red-600 dark:text-red-400 whitespace-nowrap">
                            {showValues ? `- R$ ${Math.abs(local).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '- R$ ****'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] text-slate-500 uppercase">Líquido</span>
                          <span className="font-bold text-xs text-blue-700 dark:text-blue-400 whitespace-nowrap">
                            {showValues ? `R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ ****'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              )}
            </div>

          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Subtotal Previsto:</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {showValues ? `R$ ${currentSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ ****'}
            </span>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Salvar Lançamento</button>
          </div>
        </form>
      </Modal>

      {/* Modal de Pagamento Parcial */}
      <Modal isOpen={isPaymentModalOpen} onClose={handleClosePaymentModal} title="Registrar Recebimento">
        {paymentAttendance && (
          <form onSubmit={handleRegisterPayment} className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Procedimento:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{procedures.find(p => p.id === paymentAttendance.procedureId)?.name || 'Desconhecido'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Valor Total:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">R$ {paymentAttendance.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              {paymentAttendance.amountReceived && paymentAttendance.amountReceived > 0 ? (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Já Recebido:</span>
                  <span className="font-medium">R$ {paymentAttendance.amountReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm text-orange-600 font-semibold border-t border-slate-200 dark:border-slate-700 pt-2">
                <span>Falta Receber:</span>
                <span>R$ {(paymentAttendance.subtotal - (paymentAttendance.amountReceived || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Valor Sendo Recebido Agora
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={paymentAttendance.subtotal - (paymentAttendance.amountReceived || 0)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0,00"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Digite o valor que você está recebendo neste momento.</p>
            </div>

            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={handleClosePaymentModal} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center">
                <Banknote className="w-4 h-4 mr-2" />
                Registrar
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de Pagamento em Lote */}
      <Modal isOpen={isGroupPaymentModalOpen} onClose={handleCloseGroupPaymentModal} title="Pagamento em Lote">
        {groupPaymentLocationId && (
          <form onSubmit={handleRegisterGroupPayment} className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Local:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{locations.find(l => l.id === groupPaymentLocationId)?.name || 'Desconhecido'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Procedimentos Pendentes:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{groupPaymentItems.length}</span>
              </div>
              <div className="flex justify-between text-sm text-orange-600 font-semibold border-t border-slate-200 dark:border-slate-700 pt-2">
                <span>Total Pendente (Neste Local):</span>
                <span>R$ {groupPaymentItems.reduce((acc, item) => acc + (item.subtotal - (item.amountReceived || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Valor Total Recebido
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={groupPaymentAmount}
                  onChange={(e) => setGroupPaymentAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: 2500,00"
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                O sistema fará a baixa automática nos procedimentos da lista (dos mais antigos para os mais novos) até que o valor digitado se esgote.
              </p>
            </div>

            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={handleCloseGroupPaymentModal} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center">
                <Banknote className="w-4 h-4 mr-2" />
                Distribuir Recebimento
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
