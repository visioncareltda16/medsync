'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { getAttendances, Attendance } from '@/services/attendances';
import { getLocations, Location } from '@/services/locations';
import { getDoctors, Doctor } from '@/services/doctors';
import { getInsurances, Insurance } from '@/services/insurances';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { format, subMonths } from 'date-fns';
import { DollarSign, Activity, CalendarClock, TrendingUp } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'ADMIN';

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);

  // Default to current month
  const currentMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch all data for the last 6 months to build evolution charts
        const attData = await getAttendances(
          !isAdmin && profile?.doctorId ? { doctorId: profile.doctorId } : undefined
        );
        const [locData, docData, insData] = await Promise.all([
          getLocations(),
          getDoctors(),
          getInsurances()
        ]);

        setAttendances(attData);
        setLocations(locData);
        setDoctors(docData);
        setInsurances(insData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAdmin, profile]);

  // Compute KPIs for current month
  const kpis = useMemo(() => {
    const currentAtts = attendances.filter(a => a.month === currentMonth);
    const totalMes = currentAtts.reduce((acc, a) => acc + a.subtotal, 0);
    const totalRecebido = currentAtts.filter(a => a.status === 'RECEBIDO').reduce((acc, a) => acc + a.subtotal, 0);
    const totalAReceber = currentAtts.filter(a => a.status === 'A RECEBER').reduce((acc, a) => acc + a.subtotal, 0);
    const totalAtendimentos = currentAtts.reduce((acc, a) => acc + a.quantity, 0);

    return { totalMes, totalRecebido, totalAReceber, totalAtendimentos };
  }, [attendances, currentMonth]);

  // Data for Charts
  const chartData = useMemo(() => {
    // 1. Recebido vs A Receber (Pie)
    const statusData = [
      { name: 'Recebido', value: kpis.totalRecebido },
      { name: 'A Receber', value: kpis.totalAReceber }
    ];

    // 2. Comparativo entre locais (Bar)
    const locMap = locations.reduce((acc, loc) => ({ ...acc, [loc.id]: loc.name }), {} as Record<string, string>);
    const locationDataObj: Record<string, number> = {};
    attendances.filter(a => a.month === currentMonth).forEach(a => {
      const locName = locMap[a.locationId] || 'Desconhecido';
      locationDataObj[locName] = (locationDataObj[locName] || 0) + a.subtotal;
    });
    const locationData = Object.keys(locationDataObj).map(key => ({ name: key, valor: locationDataObj[key] }));

    // 3. Comparativo por convênio (Pie)
    const insMap = insurances.reduce((acc, ins) => ({ ...acc, [ins.id]: ins.name }), {} as Record<string, string>);
    const insuranceDataObj: Record<string, number> = {};
    attendances.filter(a => a.month === currentMonth).forEach(a => {
      const insName = insMap[a.insuranceId] || 'Desconhecido';
      insuranceDataObj[insName] = (insuranceDataObj[insName] || 0) + a.subtotal;
    });
    const insuranceData = Object.keys(insuranceDataObj).map(key => ({ name: key, value: insuranceDataObj[key] }));

    // 4. Evolução mensal de faturamento (Line)
    // Get last 6 months
    const last6Months = Array.from({ length: 6 }).map((_, i) => format(subMonths(new Date(), 5 - i), 'yyyy-MM'));
    const evolutionData = last6Months.map(month => {
      const monthAtts = attendances.filter(a => a.month === month);
      const recebido = monthAtts.filter(a => a.status === 'RECEBIDO').reduce((acc, a) => acc + a.subtotal, 0);
      const aReceber = monthAtts.filter(a => a.status === 'A RECEBER').reduce((acc, a) => acc + a.subtotal, 0);
      return { month, recebido, aReceber, total: recebido + aReceber };
    });

    return { statusData, locationData, insuranceData, evolutionData };
  }, [attendances, kpis, locations, insurances, currentMonth]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Geral</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Visão financeira e operacional do mês de {currentMonth}.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl mr-4">
            <DollarSign className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Faturamento Previsto</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              R$ {kpis.totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center">
          <div className="p-3 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-xl mr-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Recebido</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              R$ {kpis.totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-xl mr-4">
            <CalendarClock className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">A Receber</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              R$ {kpis.totalAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-xl mr-4">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Atendimentos</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {kpis.totalAtendimentos}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Evolução Mensal (Últimos 6 meses)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.evolutionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip 
                  formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="total" name="Faturamento Previsto" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="recebido" name="Recebido" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Faturamento por Local (Mês Atual)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.locationData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip 
                  formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Bar dataKey="valor" name="Faturamento" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center">
          <div className="w-full md:w-1/2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Por Convênio</h3>
            <p className="text-sm text-slate-500 mb-6">Faturamento segmentado por planos</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.insuranceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.insuranceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="w-full md:w-1/2 mt-8 md:mt-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Status de Recebimento</h3>
            <p className="text-sm text-slate-500 mb-6">Inadimplência vs Recebido</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" /> {/* Recebido - Green */}
                    <Cell fill="#f59e0b" /> {/* A Receber - Amber */}
                  </Pie>
                  <Tooltip formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
