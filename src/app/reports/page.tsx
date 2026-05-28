'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { getAttendances, Attendance } from '@/services/attendances';
import { getLocations, Location } from '@/services/locations';
import { getDoctors, Doctor } from '@/services/doctors';
import { getInsurances, Insurance } from '@/services/insurances';
import { FileText, Download, Printer, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'ADMIN';

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filters for Report
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterInsurance, setFilterInsurance] = useState('');
  const [groupBy, setGroupBy] = useState<'location' | 'doctor' | 'insurance'>('location');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [attData, locData, docData, insData] = await Promise.all([
          getAttendances(),
          getLocations(),
          getDoctors(),
          getInsurances()
        ]);
        setAttendances(attData);
        setLocations(locData);
        setDoctors(docData);
        setInsurances(insData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const generatePDF = (action: 'download' | 'print' = 'download') => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      
      // Filter Data
      let data = [...attendances];
      if (filterMonth) data = data.filter(a => a.month === filterMonth);
      if (isAdmin && filterDoctor) data = data.filter(a => a.doctorId === filterDoctor);
      if (!isAdmin && profile?.doctorId) data = data.filter(a => a.doctorId === profile.doctorId);
      if (filterLocation) data = data.filter(a => a.locationId === filterLocation);
      if (filterInsurance) data = data.filter(a => a.insuranceId === filterInsurance);

      // Sort Data by Date ascending, then Patient Name
      data.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.patientName.localeCompare(b.patientName);
      });

      // Header
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235); // blue-600
      doc.text('MedSync', 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text('Relatório Analítico de Atendimentos', 14, 30);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 36);
      doc.text(`Mês Referência: ${filterMonth || 'Todos'}`, 14, 41);

      let startY = 50;
      let totalGeral = 0;

      // Grouping Logic
      const grouped: Record<string, Attendance[]> = {};
      data.forEach(att => {
        let groupKey = 'Outros';
        if (groupBy === 'location') {
          groupKey = locations.find(l => l.id === att.locationId)?.name || 'Local Desconhecido';
        } else if (groupBy === 'doctor') {
          groupKey = doctors.find(d => d.id === att.doctorId)?.name || 'Médico Desconhecido';
        } else if (groupBy === 'insurance') {
          groupKey = insurances.find(i => i.id === att.insuranceId)?.name || 'Convênio Desconhecido';
        }
        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(att);
      });

      // Sort Groups A-Z
      const sortedGroupKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

      sortedGroupKeys.forEach(groupName => {
        const groupItems = grouped[groupName];
        const subtotal = groupItems.reduce((acc, item) => acc + item.subtotal, 0);
        totalGeral += subtotal;

        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(`${groupBy === 'location' ? 'Local' : groupBy === 'doctor' ? 'Médico' : 'Convênio'}: ${groupName}`, 14, startY);

        const tableData = groupItems.map(item => [
          format(parseISO(item.date), 'dd/MM/yyyy'),
          item.patientName,
          insurances.find(i => i.id === item.insuranceId)?.name || '-',
          item.status,
          `R$ ${item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
          startY: startY + 5,
          head: [['Data', 'Paciente', 'Convênio', 'Status', 'Valor (R$)']],
          body: tableData,
          foot: [['', '', '', 'Subtotal:', `R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]],
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
          margin: { top: 10 },
        });

        startY = (doc as any).lastAutoTable.finalY + 15;
      });

      // Total Geral
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }

      doc.setFillColor(37, 99, 235);
      doc.rect(14, startY, 182, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text('TOTAL GERAL:', 20, startY + 8);
      doc.text(`R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, startY + 8);

      if (action === 'download') {
        doc.save(`Relatorio_MedSync_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
      } else {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar relatório PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Relatórios em PDF</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Exporte demonstrativos financeiros e operacionais profissionais.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
          <Filter className="w-5 h-5 text-slate-400 mr-2" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Filtros do Relatório</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mês de Referência</label>
            <input 
              type="month" 
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Agrupar por</label>
            <select 
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="location">Local de Atendimento</option>
              <option value="doctor">Médico</option>
              <option value="insurance">Convênio</option>
            </select>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filtrar Médico</label>
              <select 
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
                className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Todos os Médicos</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filtrar Local</label>
            <select 
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos os Locais</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filtrar Convênio</label>
            <select 
              value={filterInsurance}
              onChange={(e) => setFilterInsurance(e.target.value)}
              className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos os Convênios</option>
              {insurances.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => generatePDF('download')}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-70"
          >
            <Download className="w-5 h-5 mr-2" />
            {isGenerating ? 'Gerando...' : 'Exportar PDF'}
          </button>
          
          <button
            onClick={() => generatePDF('print')}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg shadow-sm transition-colors disabled:opacity-70"
          >
            <Printer className="w-5 h-5 mr-2" />
            {isGenerating ? 'Gerando...' : 'Imprimir'}
          </button>
        </div>
      </div>
    </div>
  );
}
