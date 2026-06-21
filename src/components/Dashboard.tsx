/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Elegant Premium Dashboard for TagihanPay
 */

import React, { useMemo } from "react";
import { 
  Users, 
  Wallet, 
  Clock, 
  Activity, 
  PlusCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  FileText,
  Zap,
  Droplet,
  Wifi,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Calendar
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { Pelanggan, Transaksi, BiayaTarif, TanggalPembayaran, formatRupiah, getMonthLabel } from "../types";

// Custom tooltip for professional visual consistency
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-850 text-white text-xs p-2.5 px-3.5 rounded-xl shadow-xl font-mono leading-relaxed pointer-events-none z-50">
        <p className="font-bold text-slate-450 mb-0.5">{payload[0].payload.label || payload[0].name}</p>
        <p className="text-emerald-400 font-extrabold text-[11.5px]">{formatRupiah(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

interface DashboardProps {
  pelangganList: Pelanggan[];
  transaksiList: Transaksi[];
  biayaList: BiayaTarif[];
  tanggalList: TanggalPembayaran[];
  onNavigate: (tab: string) => void;
  onQuickPayment: (pelangganId: string) => void;
}

export default function Dashboard({
  pelangganList,
  transaksiList,
  biayaList,
  tanggalList,
  onNavigate,
  onQuickPayment
}: DashboardProps) {

  // Calculate stats
  const totalPendapatan = useMemo(() => {
    return transaksiList.reduce((sum, tx) => sum + tx.jumlahBayar, 0);
  }, [transaksiList]);

  // Determine standard cost for active periods (Juni 2026 / Bulan Ini) for clients
  const activePeriods = ["2026-06"];
  
  const arrearsList = useMemo(() => {
    const list: { pelanggan: Pelanggan; periode: string; perkiraanBiaya: number }[] = [];
    
    // For each pelanggan, check if they paid for activePeriods
    pelangganList.forEach(p => {
      // Find tariff for client's service, prioritizing custom customer nominal
      let perkiraanBiaya = 100000;
      if (p.nominalTarif !== undefined && p.nominalTarif !== null && p.nominalTarif >= 0) {
        perkiraanBiaya = p.nominalTarif;
      } else {
        const rateObj = p.idTarif ? biayaList.find(b => b.id === p.idTarif) : biayaList.find(b => b.layanan === p.layanan);
        perkiraanBiaya = rateObj ? rateObj.biayaPerBulan : 100000;
      }

      activePeriods.forEach(period => {
        const alreadyPaid = transaksiList.some(tx => 
          tx.idPelanggan === p.id && 
          tx.layanan === p.layanan && 
          tx.periode === period
        );

        if (!alreadyPaid) {
          list.push({
            pelanggan: p,
            periode: period,
            perkiraanBiaya
          });
        }
      });
    });
    return list;
  }, [pelangganList, transaksiList, biayaList]);

  const totalTunggakan = useMemo(() => {
    return arrearsList.reduce((sum, item) => sum + item.perkiraanBiaya, 0);
  }, [arrearsList]);

  const lunasCount = transaksiList.length;
  const tunggakanCount = arrearsList.length;
  const totalBillsExpected = lunasCount + tunggakanCount;
  const settlementRate = totalBillsExpected > 0 ? Math.round((lunasCount / totalBillsExpected) * 100) : 100;

  // Breakdown of transactions by service type (PLN, PDAM, WIFI)
  const serviceStats = useMemo(() => {
    const stats = { PLN: 0, PDAM: 0, WIFI: 0 };
    transaksiList.forEach(tx => {
      if (stats[tx.layanan] !== undefined) {
        stats[tx.layanan] += tx.jumlahBayar;
      }
    });
    return stats;
  }, [transaksiList]);

  // Monthly stats for chart
  const monthlyRevenue = useMemo(() => {
    const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
    return months.map(m => {
      const total = transaksiList
        .filter(tx => tx.periode === m)
        .reduce((sum, tx) => sum + tx.jumlahBayar, 0);
      
      const labelParts = m.split("-");
      const monthName = getMonthLabel(labelParts[1]);
      return { 
        periode: m, 
        label: `${monthName} ${labelParts[0]}`,
        total 
      };
    });
  }, [transaksiList]);

  const maxRevenue = useMemo(() => {
    const maxVal = Math.max(...monthlyRevenue.map(m => m.total), 1);
    return maxVal;
  }, [monthlyRevenue]);

  const categoryChartData = useMemo(() => {
    return [
      { name: "Listrik PLN", value: serviceStats.PLN, color: "#fbbf24", icon: Zap },
      { name: "Air PDAM", value: serviceStats.PDAM, color: "#3b82f6", icon: Droplet },
      { name: "Internet WIFI", value: serviceStats.WIFI, color: "#a855f7", icon: Wifi }
    ];
  }, [serviceStats]);

  // Upcoming Deadlines filter & computation (with 3-day window comparison)
  const upcomingDeadlines = useMemo(() => {
    const list: {
      pelanggan: Pelanggan;
      tanggalJatuhTempo: number;
      dueDateFormatted: string;
      daysRemaining: number;
      isPaid: boolean;
      periode: string;
      layanan: string;
    }[] = [];

    const todayObj = new Date();
    // Reset time for safe date comparison
    const todayNoTime = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
    const oneDayMs = 24 * 60 * 60 * 1000;

    pelangganList.forEach((p) => {
      // Find matching due date schedule for the service
      const schedule = p.idTanggal ? tanggalList.find((t) => t.id === p.idTanggal) : tanggalList.find((t) => t.layanan === p.layanan);
      if (!schedule) return;

      const dueDay = schedule.tanggalJatuhTempo;

      // Candidate due dates: previous month, current month, next month
      const candidates = [
        new Date(todayNoTime.getFullYear(), todayNoTime.getMonth() - 1, dueDay),
        new Date(todayNoTime.getFullYear(), todayNoTime.getMonth(), dueDay),
        new Date(todayNoTime.getFullYear(), todayNoTime.getMonth() + 1, dueDay)
      ];

      candidates.forEach((candidate) => {
        const diffMs = candidate.getTime() - todayNoTime.getTime();
        const diffDays = Math.round(diffMs / oneDayMs);

        // Check if within next 3 days (inclusive of today)
        if (diffDays >= 0 && diffDays <= 3) {
          // Format period code YYYY-MM
          const year = candidate.getFullYear();
          const month = String(candidate.getMonth() + 1).padStart(2, '0');
          const periodStr = `${year}-${month}`;

          // Check if this specific customer has paid for this service and period already
          const hasPaid = transaksiList.some(
            (tx) =>
              tx.idPelanggan === p.id &&
              tx.layanan === p.layanan &&
              tx.periode === periodStr
          );

          // Format due date in Indonesian
          const dueDateFormatted = candidate.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
          });

          list.push({
            pelanggan: p,
            tanggalJatuhTempo: dueDay,
            dueDateFormatted,
            daysRemaining: diffDays,
            isPaid: hasPaid,
            periode: periodStr,
            layanan: p.layanan
          });
        }
      });
    });

    // Sort by days remaining ascending (soonest first)
    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [pelangganList, tanggalList, transaksiList]);

  return (
    <div className="space-y-6" id="modern-elegant-dashboard">
      
      {/* Top Banner Accent - Gorgeous Minimal Editorial Aesthetic */}
      <div className="relative bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl overflow-hidden border border-slate-800" id="dashboard-hero">
        {/* Abstract Background Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/90 [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-95"></div>
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl"></div>
        <div className="absolute right-1/4 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
        
        {/* Subtle dot pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] opacity-70 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-indigo-200 border border-white/10 tracking-wide font-mono">
              <Sparkles size={12} className="text-indigo-400 animate-spin-slow" />
              SISTEM MULTI-BILLING LOKET AKTIF
            </div>
            
            <h1 className="text-2xl md:text-3.5xl font-sans font-black tracking-tight leading-tight">
              Akses Kendali Keuangan <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-white to-emerald-200">
                Loket Pembayaran Digital
              </span>
            </h1>
            
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-medium">
              Selamat datang kembali. Anda dapat mengolah rincian transaksi pembayaran digital untuk layanan <span className="text-white font-bold underline decoration-amber-400 decoration-2">Listrik PLN</span>, <span className="text-white font-bold underline decoration-blue-400 decoration-2">Air PDAM</span>, dan <span className="text-white font-bold underline decoration-purple-400 decoration-2">Internet WIFI</span> pelanggan dalam satu konsol yang ringkas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0 self-start lg:self-center">
            <button 
              onClick={() => onNavigate("transaksi")}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
              id="quick-pay-btn"
            >
              <PlusCircle size={15} />
              Input Pembayaran Baru
            </button>
            <button 
              onClick={() => onNavigate("pelanggan")}
              className="px-5 py-3 bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white border border-white/10 font-bold text-xs rounded-2xl flex items-center gap-2 cursor-pointer"
              id="quick-add-client-btn"
            >
              <Users size={15} />
              Data Pelanggan
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Block - Elegant Minimalist White Cards with Bold Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="stats-grid">
        
        {/* KPI 1: Total Pendapatan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md hover:border-slate-200 transition duration-300 relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-l-2xl"></div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 font-black uppercase tracking-wider block">Total Pendapatan</span>
            <h3 className="text-2xl font-black text-slate-850 tracking-tight font-mono">
              {formatRupiah(totalPendapatan)}
            </h3>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              <CheckCircle2 size={11} className="text-emerald-500" /> Terbayar Lunas ({lunasCount} Tx)
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition duration-300">
            <Wallet size={20} />
          </div>
        </div>

        {/* KPI 2: Total Tunggakan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md hover:border-slate-200 transition duration-300 relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 rounded-l-2xl"></div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 font-black uppercase tracking-wider block">Total Tunggakan</span>
            <h3 className="text-2xl font-black text-slate-850 tracking-tight font-mono">
              {formatRupiah(totalTunggakan)}
            </h3>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
              <Clock size={11} className="text-rose-500" /> {tunggakanCount} Tagihan Belum Lunas
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition duration-300">
            <AlertTriangle size={20} className="text-rose-500" />
          </div>
        </div>

        {/* KPI 3: Jumlah Pelanggan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md hover:border-slate-200 transition duration-300 relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 rounded-l-2xl"></div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 font-black uppercase tracking-wider block">Masyarakat Terdaftar</span>
            <h3 className="text-2xl font-black text-slate-850 tracking-tight">
              {pelangganList.length} <span className="text-xs font-bold text-slate-450 font-mono">Pelanggan</span>
            </h3>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              <Activity size={11} className="text-indigo-500" /> Layanan Aktif Terpantau
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition duration-300">
            <Users size={20} />
          </div>
        </div>

        {/* KPI 4: Rasio Pelunasan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md hover:border-slate-200 transition duration-300 relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-950 rounded-l-2xl"></div>
          <div className="space-y-2 w-full">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono text-slate-400 font-black uppercase tracking-wider block">Rasio Pelunasan</span>
              <span className="text-[11px] font-bold text-slate-800 font-mono">{settlementRate}%</span>
            </div>
            
            {/* Custom mini progress bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-650 h-full rounded-full transition-all duration-1000"
                style={{ width: `${settlementRate}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
              <span>Keberhasilan loket</span>
              <span className="text-slate-500">Target 100%</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Charts & Breakdown Bento Row - Styled Elegantly */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-graphics">
        
        {/* Custom Monthly Revenue Bar Chart with Elegant Mesh Layout */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 space-y-6 flex flex-col justify-between" id="monthly-revenue-chart-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs uppercase tracking-wide">
                <TrendingUp size={15} />
                <span>Analisa Grafik</span>
              </div>
              <h4 className="text-base font-bold text-slate-850">Tren Pendapatan Bulanan</h4>
              <p className="text-xs text-slate-500">Arus kas pendapatan riil bulanan yang masuk sepanjang tahun 2526.</p>
            </div>
            <span className="px-3 py-1 text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full font-mono max-w-fit">
              TAHUN AGARAN 2026
            </span>
          </div>

          {/* AreaChart using Recharts */}
          <div className="h-64 w-full" id="revenue-recharts-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyRevenue}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  tickFormatter={(tick) => tick.split(" ")[0]}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(val) => `Rp ${(val / 1000).toFixed(0)}k`}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#4f46e5" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 pt-2 border-t border-slate-100">
            <span className="font-semibold">Sistem Laporan Otomatis</span>
            <span className="text-indigo-600 font-bold">Volume Puncak: {formatRupiah(maxRevenue)}</span>
          </div>
        </div>

        {/* Service Type Distribution Bento Card for Premium UI Feel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between space-y-5" id="service-proportion-card">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-black uppercase text-slate-400 tracking-wider block">Analisa Layanan</span>
            <h4 className="text-base font-bold text-slate-850">Proporsi Kas Masuk</h4>
            <p className="text-xs text-slate-500">Volume setoran dana berdasarkan kategori utama.</p>
          </div>

          {/* Interactive PieChart block */}
          <div className="relative flex items-center justify-center h-44" id="pie-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[9px] uppercase font-mono font-black text-slate-400 tracking-wider">Total Revenue</span>
              <span className="text-xs font-black text-slate-800 font-mono mt-0.5">{formatRupiah(totalPendapatan)}</span>
            </div>
          </div>

          {/* Clean metadata list mapping the categories */}
          <div className="space-y-2.5" id="pie-legend-items">
            {categoryChartData.map((item, index) => {
              const Icon = item.icon;
              const percentage = totalPendapatan > 0 ? ((item.value / totalPendapatan) * 100).toFixed(1) : "0.0";
              
              return (
                <div key={index} className="flex items-center justify-between text-xs p-1 px-2 hover:bg-slate-50 rounded-xl transition">
                  <span className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="p-1 rounded-md" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                      <Icon size={12} fill={item.color === "#fbbf24" || item.color === "#3b82f6" ? "currentColor" : "none"} />
                    </span>
                    {item.name}
                  </span>
                  
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-400 text-[10px] font-bold">({percentage}%)</span>
                    <span className="font-black text-slate-800">{formatRupiah(item.value)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold font-mono">
            <span>UPTIME LOKET</span>
            <span className="text-emerald-500 flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              99.9% LIVE SECURE
            </span>
          </div>

        </div>

      </div>

      {/* Row: Recent Transactions & Urgent Deadlines / Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="monitoring-flow">

        {/* Upcoming Deadlines (Next 3 Days) Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between" id="upcoming-deadlines-panel">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-850">Tenggat Jatuh Tempo Terdekat</h4>
              <p className="text-[11px] text-slate-400 font-medium font-sans">Jadwal batas bayar dalam 3 hari ke depan.</p>
            </div>
            <span className="px-2.5 py-0.5 text-[9px] font-mono font-bold bg-amber-50 border border-amber-100 text-amber-600 rounded-md uppercase">
              3 HARI KEDEPAN
            </span>
          </div>

          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 flex-1 mt-2">
            {upcomingDeadlines.map((item, index) => (
              <div 
                key={`${item.pelanggan.id}-${item.periode}-${index}`} 
                className={`p-3 rounded-xl border flex justify-between items-center transition duration-350 ${
                  item.isPaid 
                    ? "bg-emerald-50/10 border-emerald-100/40 hover:bg-emerald-50/20" 
                    : "bg-amber-50/20 border-amber-100/40 hover:bg-amber-50/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${item.isPaid ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-850 truncate">{item.pelanggan.nama}</h5>
                    <p className="text-[10px] text-slate-550 flex flex-wrap items-center gap-1.5 mt-0.5 font-sans">
                      <span className={`font-extrabold text-[9px] px-1 rounded-sm ${
                        item.layanan === "PLN" ? "bg-amber-50 border border-amber-100 text-amber-700" :
                        item.layanan === "PDAM" ? "bg-blue-50 border border-blue-100 text-blue-700" :
                        "bg-purple-50 border border-purple-100 text-purple-700"
                      }`}>{item.layanan}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono text-slate-500">{item.dueDateFormatted}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {item.isPaid ? (
                    <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-md">
                      LUNAS
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 border border-amber-150 px-2 py-0.5 rounded-md shrink-0">
                        {item.daysRemaining === 0 ? "HARI INI" : `${item.daysRemaining} HARI`}
                      </span>
                      <button 
                        onClick={() => onQuickPayment(item.pelanggan.id)}
                        className="p-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] rounded-md transition cursor-pointer active:scale-95 shrink-0"
                        title="Proses Bayar"
                      >
                        Bayar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {upcomingDeadlines.length === 0 && (
              <div className="p-8 text-center bg-slate-50/50 text-slate-400 rounded-2xl border border-dashed border-slate-200 text-xs flex flex-col items-center justify-center gap-2 h-full min-h-[220px]">
                <Calendar size={24} className="text-slate-300" />
                <span className="font-bold text-slate-700">Aman untuk 3 Hari ke Depan</span>
                <span className="text-[10.5px] text-slate-450 max-w-[220px]">Tidak ada pelanggan dengan tenggat waktu dalam 3 hari ini.</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions List Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-850">Aktivitas 5 Pembayaran Terakhir</h4>
              <p className="text-[11px] text-slate-400 font-medium">Histori pencatatan invoice terbaru lunas cetak kwitansi.</p>
            </div>
            
            <button 
              onClick={() => onNavigate("transaksi")} 
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer transition"
            >
              Laporan Rinci <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 flex-1 mt-2">
            {transaksiList.slice(0, 5).map((tx) => (
              <div key={tx.id} className="p-3.5 flex justify-between items-center bg-white hover:bg-slate-50/70 transition">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl text-xs font-semibold shrink-0 ${
                    tx.layanan === "PLN" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                    tx.layanan === "PDAM" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                    "bg-purple-50 text-purple-600 border border-purple-100"
                  }`}>
                    {tx.layanan === "PLN" && <Zap size={14} fill="currentColor" />}
                    {tx.layanan === "PDAM" && <Droplet size={14} fill="currentColor" />}
                    {tx.layanan === "WIFI" && <Wifi size={14} />}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-850 truncate">{tx.namaPelanggan}</h5>
                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5 truncate">
                      <span className="font-bold text-indigo-900 bg-indigo-50 px-1 rounded-sm">{tx.id.split("-").pop()}</span>
                      <span>•</span>
                      <span>{tx.periode}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-500 uppercase">{tx.metodePembayaran}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-slate-850 block font-mono">
                    {formatRupiah(tx.jumlahBayar)}
                  </span>
                  <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-50 border border-slate-100 p-0.5 px-1.5 rounded-md mt-0.5 inline-block">
                    {new Date(tx.tanggalBayar).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
            {transaksiList.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 h-full min-h-[220px]">
                <FileText size={24} className="text-slate-300" />
                <span>Belum ada transaksi pembayaran yang tercatat dalam log lokal.</span>
              </div>
            )}
          </div>
        </div>

        {/* High Priority Alerts & Active Demands */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-850">Tunggakan Kolektif Urgensi Tinggi</h4>
              <p className="text-[11px] text-slate-400 font-medium font-sans">Lacak tunggakan aktif yang harus segera diselesaikan untuk menghindari denda / pemutusan.</p>
            </div>
            <span className="px-2.5 py-0.5 text-[9px] font-mono font-bold bg-rose-50 border border-rose-100 text-rose-600 rounded-md uppercase">
              SIAGA DENDA
            </span>
          </div>

          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 flex-1 mt-2">
            {arrearsList.slice(0, 5).map((item, index) => (
              <div key={`${item.pelanggan.id}-${item.periode}-${index}`} className="p-3 bg-rose-50/20 rounded-xl border border-rose-100/30 flex justify-between items-center hover:bg-rose-50/55 transition duration-350">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0"></div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-850 truncate">{item.pelanggan.nama}</h5>
                    <p className="text-[10px] text-slate-550 flex items-center gap-1.5 mt-0.5 font-sans">
                      <span className="font-extrabold text-[#701a1a] bg-rose-50 border border-rose-100 px-1 rounded-sm">{item.pelanggan.layanan}</span>
                      <span>Periode:</span>
                      <span className="font-mono text-slate-600 font-medium">{item.periode}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-black text-rose-700 font-mono">
                    {formatRupiah(item.perkiraanBiaya)}
                  </span>
                  <button 
                    onClick={() => onQuickPayment(item.pelanggan.id)}
                    className="p-1.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-[10px] rounded-lg flex items-center justify-center transition cursor-pointer"
                    title="Bayar Sekarang"
                  >
                    Bayar
                  </button>
                </div>
              </div>
            ))}
            {arrearsList.length === 0 && (
              <div className="p-8 text-center bg-emerald-50/20 text-emerald-600 rounded-2xl border border-dashed border-emerald-150 text-xs flex flex-col items-center justify-center gap-2.5 h-full min-h-[220px]">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-full">
                  <CheckCircle2 size={24} fill="currentColor" className="text-white" />
                </div>
                <span className="font-bold text-slate-800">Seluruh Tagihan Lunas Terbayar!</span>
                <span className="text-[10.5px] text-slate-450 max-w-[280px]">Kerja bagus, tidak ada denda keterlambatan atau tunggakan aktif terdeteksi saat ini.</span>
              </div>
            )}
            
            {arrearsList.length > 5 && (
              <div className="text-center pt-2">
                <button 
                  onClick={() => onNavigate("transaksi")}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 hover:underline cursor-pointer"
                >
                  +{arrearsList.length - 5} Tunggakan Lainnya Tersisa. Lacak Selengkapnya di Menu Tagihan
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
