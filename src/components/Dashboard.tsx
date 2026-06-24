/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Elegant Premium Dashboard for TagihanPay
 */

import React, { useMemo, useState } from "react";
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
  Calendar,
  Layers,
  Boxes,
  MapPin,
  Search
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

  // 3D Visualization States and Computations
  const [chartStyle, setChartStyle] = useState<"2d" | "3d">("3d");
  const [active3DMetric, setActive3DMetric] = useState<"revenue" | "services" | "compare">("revenue");
  const [hovered3DBar, setHovered3DBar] = useState<number | null>(null);

  // Village/Address Distribution State and Memo
  const [alamatSearch, setAlamatSearch] = useState("");

  const addressStats = useMemo(() => {
    const counts: Record<string, { total: number; PLN: number; PDAM: number; WIFI: number }> = {};
    pelangganList.forEach(p => {
      const addr = (p.alamat || "Tanpa Alamat").trim();
      if (!counts[addr]) {
        counts[addr] = { total: 0, PLN: 0, PDAM: 0, WIFI: 0 };
      }
      counts[addr].total += 1;
      if (p.layanan === "PLN") counts[addr].PLN += 1;
      else if (p.layanan === "PDAM") counts[addr].PDAM += 1;
      else if (p.layanan === "WIFI") counts[addr].WIFI += 1;
    });

    return Object.entries(counts)
      .map(([alamat, stats]) => ({
        alamat,
        ...stats
      }))
      .sort((a, b) => b.total - a.total);
  }, [pelangganList]);

  const filteredAddressStats = useMemo(() => {
    if (!alamatSearch.trim()) return addressStats;
    const q = alamatSearch.toLowerCase();
    return addressStats.filter(item => item.alamat.toLowerCase().includes(q));
  }, [addressStats, alamatSearch]);

  const revenue3DData = useMemo(() => {
    return monthlyRevenue.map((m) => ({
      label: m.label,
      shortLabel: m.label.split(" ")[0],
      value: m.total,
      theme: "indigo",
      topColor: "#a5b4fc"
    }));
  }, [monthlyRevenue]);

  const services3DData = useMemo(() => {
    return [
      {
        label: "Listrik PLN",
        shortLabel: "PLN",
        value: serviceStats.PLN,
        theme: "amber",
        topColor: "#fef08a"
      },
      {
        label: "Air PDAM",
        shortLabel: "PDAM",
        value: serviceStats.PDAM,
        theme: "blue",
        topColor: "#bfdbfe"
      },
      {
        label: "Internet WIFI",
        shortLabel: "WIFI",
        value: serviceStats.WIFI,
        theme: "purple",
        topColor: "#e9d5ff"
      }
    ];
  }, [serviceStats]);

  const compare3DData = useMemo(() => {
    return [
      {
        label: "Terbayar Lunas",
        shortLabel: "Lunas",
        value: totalPendapatan,
        theme: "emerald",
        topColor: "#a7f3d0"
      },
      {
        label: "Tunggakan Aktif",
        shortLabel: "Tunggakan",
        value: totalTunggakan,
        theme: "rose",
        topColor: "#fecdd3"
      }
    ];
  }, [totalPendapatan, totalTunggakan]);

  const active3DDataset = useMemo(() => {
    if (active3DMetric === "services") return services3DData;
    if (active3DMetric === "compare") return compare3DData;
    return revenue3DData;
  }, [active3DMetric, revenue3DData, services3DData, compare3DData]);

  const max3DValue = useMemo(() => {
    const maxVal = Math.max(...active3DDataset.map(item => item.value), 1);
    return maxVal;
  }, [active3DDataset]);

  const positions3D = useMemo(() => {
    const list: { x: number; w: number; d: number }[] = [];
    const N = active3DDataset.length;
    const startX = 40;
    
    if (N === 6) {
      for (let i = 0; i < 6; i++) {
        list.push({
          x: startX + i * 82 + 10,
          w: 34,
          d: 14
        });
      }
    } else if (N === 3) {
      for (let i = 0; i < 3; i++) {
        list.push({
          x: startX + i * 160 + 60,
          w: 50,
          d: 18
        });
      }
    } else {
      for (let i = 0; i < 2; i++) {
        list.push({
          x: startX + i * 220 + 90,
          w: 58,
          d: 22
        });
      }
    }
    return list;
  }, [active3DDataset]);

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
        
        {/* Custom Monthly Revenue Bar Chart with Elegant Mesh Layout / Interactive 3D Visualization */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 space-y-6 flex flex-col justify-between" id="monthly-revenue-chart-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs uppercase tracking-wide">
                <Boxes size={15} className="animate-pulse text-indigo-500" />
                <span>Analisa Visualisasi Multi-Dimensi</span>
              </div>
              <h4 className="text-base font-bold text-slate-850">
                {chartStyle === "3d" ? "Proyeksi 3D Hologram Loket" : "Tren Grafik Pendapatan Bulanan"}
              </h4>
              <p className="text-xs text-slate-500">
                {chartStyle === "3d" 
                  ? "Tampilan visualisasi interaktif 3D pilar untuk perbandingan data yang taktil." 
                  : "Grafik linear akumulasi omset kas masuk TagihanPay tahun 2026."}
              </p>
            </div>

            {/* Segmented Controls for 2D vs 3D */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setChartStyle("3d")}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  chartStyle === "3d" 
                    ? "bg-white text-indigo-950 shadow-xs" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers size={13} />
                Tampilan 3D
              </button>
              <button
                type="button"
                onClick={() => setChartStyle("2d")}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  chartStyle === "2d" 
                    ? "bg-white text-indigo-950 shadow-xs" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <TrendingUp size={13} />
                Tampilan 2D
              </button>
            </div>
          </div>

          {/* 3D Secondary Filter Bar (Only shown in 3D Mode) */}
          {chartStyle === "3d" && (
            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3" id="3d-metrics-selector">
              <button
                type="button"
                onClick={() => { setActive3DMetric("revenue"); setHovered3DBar(null); }}
                className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase transition flex items-center gap-1.5 border cursor-pointer ${
                  active3DMetric === "revenue"
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm shadow-indigo-100/30"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Pemasukan Bulanan
              </button>
              <button
                type="button"
                onClick={() => { setActive3DMetric("services"); setHovered3DBar(null); }}
                className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase transition flex items-center gap-1.5 border cursor-pointer ${
                  active3DMetric === "services"
                    ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm shadow-amber-100/30"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Kategori Layanan
              </button>
              <button
                type="button"
                onClick={() => { setActive3DMetric("compare"); setHovered3DBar(null); }}
                className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase transition flex items-center gap-1.5 border cursor-pointer ${
                  active3DMetric === "compare"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm shadow-emerald-100/30"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Lunas vs Tunggakan
              </button>
            </div>
          )}

          {/* MAIN GRAPH AREA */}
          <div className="relative min-h-[260px] flex flex-col justify-center" id="main-chart-canvas">
            {chartStyle === "2d" ? (
              /* Original 2D Recharts AreaChart */
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
            ) : (
              /* Pure HTML/SVG 3D Isometric Chart */
              <div className="w-full flex flex-col justify-center items-center" id="isometric-3d-scene">
                <svg viewBox="0 0 600 300" className="w-full max-w-2xl h-full min-h-[240px] drop-shadow-sm overflow-visible">
                  <defs>
                    {/* Indigo (Revenue) */}
                    <linearGradient id="grad-indigo-front" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                    <linearGradient id="grad-indigo-right" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4338ca" />
                      <stop offset="100%" stopColor="#312e81" />
                    </linearGradient>

                    {/* Amber (PLN) */}
                    <linearGradient id="grad-amber-front" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <linearGradient id="grad-amber-right" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d97706" />
                      <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>

                    {/* Blue (PDAM) */}
                    <linearGradient id="grad-blue-front" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                    <linearGradient id="grad-blue-right" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#1e3a8a" />
                    </linearGradient>

                    {/* Purple (WIFI) */}
                    <linearGradient id="grad-purple-front" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c084fc" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                    <linearGradient id="grad-purple-right" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9333ea" />
                      <stop offset="100%" stopColor="#581c87" />
                    </linearGradient>

                    {/* Emerald (Lunas) */}
                    <linearGradient id="grad-emerald-front" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <linearGradient id="grad-emerald-right" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="100%" stopColor="#064e3b" />
                    </linearGradient>

                    {/* Rose (Tunggakan) */}
                    <linearGradient id="grad-rose-front" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" />
                      <stop offset="100%" stopColor="#f43f5e" />
                    </linearGradient>
                    <linearGradient id="grad-rose-right" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e11d48" />
                      <stop offset="100%" stopColor="#4c0519" />
                    </linearGradient>

                    {/* Glow filters */}
                    <filter id="glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.3" />
                    </filter>
                    <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.3" />
                    </filter>
                    <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.3" />
                    </filter>
                    <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#a855f7" floodOpacity="0.3" />
                    </filter>
                    <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#10b981" floodOpacity="0.3" />
                    </filter>
                    <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#f43f5e" floodOpacity="0.3" />
                    </filter>
                  </defs>

                  {/* 3D Grid Perspective Lines on the floor */}
                  <g className="opacity-30">
                    <line x1={30} y1={240} x2={570} y2={240} stroke="#94a3b8" strokeWidth="1.5" />
                    <line x1={44} y1={233} x2={584} y2={233} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
                  </g>

                  {/* Background Gridlines for height metric scales */}
                  {[0.25, 0.5, 0.75, 1.0].map((ratio, index) => {
                    const yVal = 240 - ratio * 160;
                    return (
                      <g key={index} className="opacity-25">
                        <line x1={30} y1={yVal} x2={570} y2={yVal} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                        {/* Horizontal side perspective line */}
                        <line x1={30} y1={yVal} x2={44} y2={yVal - 7} stroke="#e2e8f0" strokeWidth="0.8" />
                        <text
                          x={22}
                          y={yVal + 3}
                          fill="#94a3b8"
                          fontSize={9}
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          {ratio === 1.0 ? "MAX" : `Rp ${((ratio * max3DValue) / 1000).toFixed(0)}k`}
                        </text>
                      </g>
                    );
                  })}

                  {/* RENDER THE 3D COLUMNS */}
                  {active3DDataset.map((item, i) => {
                    const pos = positions3D[i];
                    if (!pos) return null;
                    const isHovered = hovered3DBar === i;

                    const H = Math.max(8, (item.value / max3DValue) * 160);
                    const dx = pos.d;
                    const dy = - (pos.d / 2);
                    const baseY = 240;

                    const frontPoints = `${pos.x},${baseY - H} ${pos.x + pos.w},${baseY - H} ${pos.x + pos.w},${baseY} ${pos.x},${baseY}`;
                    const rightPoints = `${pos.x + pos.w},${baseY - H} ${pos.x + pos.w + dx},${baseY - H + dy} ${pos.x + pos.w + dx},${baseY + dy} ${pos.x + pos.w},${baseY}`;
                    const topPoints = `${pos.x},${baseY - H} ${pos.x + pos.w},${baseY - H} ${pos.x + pos.w + dx},${baseY - H + dy} ${pos.x + dx},${baseY - H + dy}`;
                    const pedestalPoints = `${pos.x - 4},${baseY} ${pos.x + pos.w + 4},${baseY} ${pos.x + pos.w + dx + 4},${baseY + dy} ${pos.x + dx - 4},${baseY + dy}`;

                    return (
                      <g
                        key={i}
                        className="cursor-pointer"
                        onMouseEnter={() => setHovered3DBar(i)}
                        onMouseLeave={() => setHovered3DBar(null)}
                      >
                        {/* Pedestal Base Plate under the 3D pillar */}
                        <polygon
                          points={pedestalPoints}
                          fill={isHovered ? "rgba(99,102,241,0.06)" : "#f8fafc"}
                          stroke={isHovered ? "currentColor" : "#e2e8f0"}
                          strokeWidth={isHovered ? "1.5" : "1"}
                          className={`transition-all duration-300 ${
                            isHovered 
                              ? item.theme === "amber" ? "text-amber-500" :
                                item.theme === "blue" ? "text-blue-500" :
                                item.theme === "purple" ? "text-purple-500" :
                                item.theme === "emerald" ? "text-emerald-500" :
                                item.theme === "rose" ? "text-rose-500" :
                                "text-indigo-500"
                              : ""
                          }`}
                        />

                        {/* Outer Glow filter applied on hover */}
                        <g 
                          filter={isHovered ? `url(#glow-${item.theme})` : undefined}
                          className="transition-transform duration-300"
                          style={{
                            transform: isHovered ? "translateY(-6px)" : "translateY(0)"
                          }}
                        >
                          {/* Front face with gradient */}
                          <polygon
                            points={frontPoints}
                            fill={`url(#grad-${item.theme}-front)`}
                            className="transition-all duration-300"
                          />

                          {/* Right face with gradient */}
                          <polygon
                            points={rightPoints}
                            fill={`url(#grad-${item.theme}-right)`}
                            className="transition-all duration-300"
                          />

                          {/* Top face with bright theme colors */}
                          <polygon
                            points={topPoints}
                            fill={item.topColor}
                            className="transition-all duration-300"
                          />
                        </g>

                        {/* Overlay X-axis Label text under the column */}
                        <text
                          x={pos.x + pos.w / 2 + pos.d / 2}
                          y={baseY + 22}
                          textAnchor="middle"
                          fill={isHovered ? "#0f172a" : "#64748b"}
                          fontSize={10}
                          fontFamily="sans-serif"
                          fontWeight={isHovered ? "bold" : "600"}
                          className="transition-colors duration-300 font-mono"
                        >
                          {item.shortLabel}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* 3D Holographic metrics dashboard deck details */}
                <div className="w-full mt-4 bg-slate-900 border border-slate-800 text-white p-4.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden shadow-2xl transition-all duration-300">
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none"></div>
                  
                  {hovered3DBar !== null ? (
                    <>
                      <div className="space-y-1 z-10 text-left">
                        <span className="p-1 px-2 text-[8.5px] font-mono font-black uppercase rounded tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/10 inline-block">
                          Informasi Terfokus 3D
                        </span>
                        <h5 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            active3DDataset[hovered3DBar].theme === "amber" ? "bg-amber-400" :
                            active3DDataset[hovered3DBar].theme === "blue" ? "bg-blue-400" :
                            active3DDataset[hovered3DBar].theme === "purple" ? "bg-purple-400" :
                            active3DDataset[hovered3DBar].theme === "emerald" ? "bg-emerald-400" :
                            active3DDataset[hovered3DBar].theme === "rose" ? "bg-rose-400" :
                            "bg-indigo-400"
                          }`}></span>
                          {active3DDataset[hovered3DBar].label}
                        </h5>
                      </div>
                      
                      <div className="space-y-0.5 z-10 text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 font-semibold block font-mono">NOMINAL REKOR</span>
                        <p className="text-base font-black text-emerald-400 font-mono">
                          {formatRupiah(active3DDataset[hovered3DBar].value)}
                        </p>
                      </div>

                      <div className="space-y-0.5 z-10 text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 font-semibold block font-mono">PERSENTASE KONTRIBUSI</span>
                        <p className="text-sm font-bold text-slate-200">
                          {totalPendapatan > 0
                            ? `${((active3DDataset[hovered3DBar].value / (active3DMetric === "compare" ? (totalPendapatan + totalTunggakan) : totalPendapatan)) * 100).toFixed(1)}%`
                            : "0%"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 font-medium py-1.5 font-sans z-10">
                      <Sparkles size={14} className="text-indigo-400 animate-spin-slow shrink-0" />
                      <span>Gerakkan kursor atau sentuh pilar 3D untuk memicu analisa hologram instan.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 pt-2 border-t border-slate-100">
            <span className="font-semibold uppercase tracking-wider">Tampilan 3D Render Engine v2.0</span>
            <span className="text-indigo-600 font-black">
              {chartStyle === "3d" ? `Metric: ${active3DMetric.toUpperCase()}` : `Volume Puncak: ${formatRupiah(maxRevenue)}`}
            </span>
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

      {/* SEBARAN PELANGGAN PER ALAMAT / DESA */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-5" id="customer-address-distribution">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-4">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs uppercase tracking-wide">
              <MapPin size={15} className="text-indigo-500 shrink-0" />
              <span>Pemetaan Wilayah Pelanggan</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-850">Sebaran Pelanggan per Alamat / Desa</h4>
            <p className="text-xs text-slate-500">
              Menampilkan distribusi total pelanggan terdaftar dan jenis layanan aktif di masing-masing wilayah desa atau jalan.
            </p>
          </div>

          {/* Search Box inside Section */}
          <div className="relative w-full md:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Cari desa atau alamat..."
              value={alamatSearch}
              onChange={(e) => setAlamatSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
            />
            {alamatSearch && (
              <button
                onClick={() => setAlamatSearch("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] font-mono text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Grid mapping address stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="address-grid">
          {filteredAddressStats.map((item) => {
            const maxTotal = addressStats.length > 0 ? addressStats[0].total : 1;
            const percentageOfMax = Math.round((item.total / maxTotal) * 100);
            const totalPelangganApp = pelangganList.length || 1;
            const percentageOfTotal = ((item.total / totalPelangganApp) * 100).toFixed(1);

            return (
              <div 
                key={item.alamat} 
                className="p-4 bg-slate-50/40 hover:bg-slate-50 border border-slate-100 hover:border-indigo-100 rounded-2xl transition duration-300 flex flex-col justify-between gap-3 group relative overflow-hidden text-left"
              >
                {/* Visual accent top line on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>

                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-extrabold text-slate-850 text-xs line-clamp-2 leading-snug group-hover:text-indigo-900 transition">
                      {item.alamat}
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-[10px] font-black rounded-md shrink-0">
                      {item.total} PLG
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 font-medium">
                    Rasio: <strong className="text-slate-650 font-bold">{percentageOfTotal}%</strong> dari total pelanggan
                  </p>
                </div>

                {/* Progress bar mapping concentration */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-650 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentageOfMax}%` }}
                    ></div>
                  </div>
                </div>

                {/* Services breakdown in this address */}
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 text-[10px] font-mono text-slate-500">
                  <span className="font-bold text-[9px] text-slate-400 uppercase tracking-wider block mr-1">Layanan:</span>
                  
                  {item.PLN > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-100" title="Listrik PLN">
                      <Zap size={9} fill="currentColor" />
                      <span>{item.PLN}</span>
                    </span>
                  )}
                  {item.PDAM > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100" title="Air PDAM">
                      <Droplet size={9} fill="currentColor" />
                      <span>{item.PDAM}</span>
                    </span>
                  )}
                  {item.WIFI > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100" title="Internet WIFI">
                      <Wifi size={9} />
                      <span>{item.WIFI}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredAddressStats.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <MapPin size={22} className="text-slate-300" />
              <span className="font-bold text-slate-700">Wilayah Tidak Ditemukan</span>
              <span>Tidak ada alamat/desa yang cocok dengan pencarian "{alamatSearch}"</span>
            </div>
          )}
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
