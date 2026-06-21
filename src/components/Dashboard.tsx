/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
  Wifi
} from "lucide-react";
import { Pelanggan, Transaksi, BiayaTarif, formatRupiah, getMonthLabel } from "../types";

interface DashboardProps {
  pelangganList: Pelanggan[];
  transaksiList: Transaksi[];
  biayaList: BiayaTarif[];
  onNavigate: (tab: string) => void;
  onQuickPayment: (pelangganId: string) => void;
}

export default function Dashboard({
  pelangganList,
  transaksiList,
  biayaList,
  onNavigate,
  onQuickPayment
}: DashboardProps) {

  // Calculate stats
  const totalPendapatan = useMemo(() => {
    return transaksiList.reduce((sum, tx) => sum + tx.jumlahBayar, 0);
  }, [transaksiList]);

  // Determine standard cost for active periods (Mei, Juni 2026) for clients
  const activePeriods = ["2026-05", "2026-06"];
  
  const arrearsList = useMemo(() => {
    const list: { pelanggan: Pelanggan; periode: string; perkiraanBiaya: number }[] = [];
    
    // For each pelanggan, check if they paid for activePeriods
    pelangganList.forEach(p => {
      // Find standard tariff for client's service
      const rateObj = biayaList.find(b => b.layanan === p.layanan);
      const perkiraanBiaya = rateObj ? rateObj.biayaPerBulan : 100000;

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

  return (
    <div className="space-y-6">
      
      {/* Top Banner Accent */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden" id="dashboard-hero">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-radial-gradient pointer-events-none"></div>
        <div className="space-y-2 z-10">
          <h1 className="text-2xl md:text-3xl font-sans font-bold tracking-tight">
            Selamat Datang di Portal Tagihan Digital!
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-xl">
            Sistem tata kelola keuangan pembayaran digital **PLN**, **PDAM**, dan **WIFI**. Kelola data dengan gampang, lincah, dan akurat.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 z-10">
          <button 
            onClick={() => onNavigate("transaksi")}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition text-white font-medium text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            id="quick-pay-btn"
          >
            <PlusCircle size={16} />
            Input Pembayaran
          </button>
          <button 
            onClick={() => onNavigate("pelanggan")}
            className="px-5 py-2.5 bg-slate-700/80 hover:bg-slate-700 transition text-white border border-slate-600/50 font-medium text-sm rounded-xl flex items-center gap-2"
            id="quick-add-client-btn"
          >
            <Users size={16} />
            Data Pelanggan
          </button>
        </div>
      </div>

      {/* KPI Stats Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="stats-grid">
        
        {/* KPI: Total Pendapatan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition duration-300">
          <div className="space-y-1">
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Total Pendapatan</p>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              {formatRupiah(totalPendapatan)}
            </h3>
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <CheckCircle2 size={12} /> Terbayar Lunas
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-500">
            <Wallet size={24} />
          </div>
        </div>

        {/* KPI: Total Tunggakan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition duration-300">
          <div className="space-y-1">
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Total Tunggakan</p>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              {formatRupiah(totalTunggakan)}
            </h3>
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <Clock size={12} fill="currentColor" className="text-white" /> {arrearsList.length} Tagihan Belum Bayar
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-500">
            <Clock size={24} />
          </div>
        </div>

        {/* KPI: Jumlah Pelanggan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition duration-300">
          <div className="space-y-1">
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Jumlah Pelanggan</p>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              {pelangganList.length} <span className="text-sm font-normal text-slate-500">Jiwa</span>
            </h3>
            <p className="text-xs text-indigo-500 flex items-center gap-1">
              <Activity size={12} /> Pelanggan Aktif Terdaftar
            </p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-500">
            <Users size={24} />
          </div>
        </div>

        {/* KPI: Rasio Pelunasan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition duration-300">
          <div className="space-y-1 w-full mr-2">
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Rasio Pelunasan</p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                {settlementRate}%
              </h3>
              <span className="text-xs font-medium text-slate-500">Target 100%</span>
            </div>
            {/* Custom mini progress bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                style={{ width: `${settlementRate}%` }}
              ></div>
            </div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-500 h-fit self-center">
            <Activity size={24} />
          </div>
        </div>

      </div>

      {/* Main Charts & Breakdown Bento Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-graphics">
        
        {/* Custom Monthly Revenue Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">Tren Pendapatan Bulanan</h4>
              <p className="text-xs text-slate-500">Arus kas pendapatan yang masuk di tahun 2026</p>
            </div>
            <span className="px-2.5 py-1 text-xs font-mono text-indigo-600 bg-indigo-50 rounded-md font-semibold">Tahun Buku 2026</span>
          </div>

          {/* Bar Diagram Platform using CSS/SVG */}
          <div className="relative pt-4">
            <div className="h-64 flex items-end justify-between gap-3 md:gap-6 px-2 border-b border-slate-100">
              {monthlyRevenue.map((item) => {
                const barHeight = item.total > 0 ? (item.total / maxRevenue) * 100 : 5;
                return (
                  <div key={item.periode} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs py-1.5 px-3 rounded-lg shadow-lg pointer-events-none z-20 flex flex-col items-center whitespace-nowrap">
                      <span className="font-semibold text-[11px] text-slate-300">{item.label}</span>
                      <span className="text-emerald-400 font-mono font-bold mt-0.5">{formatRupiah(item.total)}</span>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-1 mt-1"></div>
                    </div>

                    {/* Interactive Animated Bar */}
                    <div 
                      className="w-full bg-slate-100 rounded-t-lg group-hover:bg-indigo-100 active:scale-95 transition-all duration-500 flex flex-col justify-end overflow-hidden" 
                      style={{ height: `100%` }}
                    >
                      <div 
                        className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-t-lg transition-all duration-1000 ease-out flex items-center justify-center text-[10px] text-white font-mono"
                        style={{ height: `${barHeight}%` }}
                      >
                        {item.total > 0 && barHeight > 18 && (
                          <span className="hidden md:inline rotate-90 md:rotate-0 font-semibold mb-1">
                            {(item.total / 1000).toFixed(0)}k
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] md:text-xs text-slate-500 mt-2 font-medium max-w-[64px] text-center truncate">
                      {item.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Zero label helper */}
            <div className="absolute left-0 bottom-0 text-[10px] text-slate-400 font-mono pl-1 pb-1">
              Rp 0
            </div>
            {/* Max label helper */}
            <div className="absolute left-0 top-0 text-[10px] text-indigo-600 font-mono font-semibold pl-1">
              Max: {formatRupiah(maxRevenue)}
            </div>
          </div>
        </div>

        {/* Service Type Breakdown and Statistics Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">Distribusi Tagihan Masuk</h4>
            <p className="text-xs text-slate-500">Porsi pendapatan per jenis layanan s/d hari ini</p>
          </div>

          <div className="space-y-4 my-auto">
            
            {/* PLN Item */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="inline-flex p-1.5 bg-amber-50 text-amber-500 rounded-md">
                    <Zap size={14} />
                  </span>
                  Listrik PLN
                </span>
                <span className="font-bold text-slate-800 font-mono">{formatRupiah(serviceStats.PLN)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${totalPendapatan > 0 ? (serviceStats.PLN / totalPendapatan) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* PDAM Item */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="inline-flex p-1.5 bg-blue-50 text-blue-500 rounded-md">
                    <Droplet size={14} />
                  </span>
                  Air Bersih PDAM
                </span>
                <span className="font-bold text-slate-800 font-mono">{formatRupiah(serviceStats.PDAM)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${totalPendapatan > 0 ? (serviceStats.PDAM / totalPendapatan) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* WIFI Item */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="inline-flex p-1.5 bg-purple-50 text-purple-500 rounded-md">
                    <Wifi size={14} />
                  </span>
                  Internet WIFI
                </span>
                <span className="font-bold text-slate-800 font-mono">{formatRupiah(serviceStats.WIFI)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${totalPendapatan > 0 ? (serviceStats.WIFI / totalPendapatan) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Uptime Layanan:</span>
            <span className="font-mono text-emerald-500 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Aktif 100%
            </span>
          </div>

        </div>

      </div>

      {/* Row: Recent Transactions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Transactions Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-slate-800">5 Pembayaran Terakhir</h4>
            <button 
              onClick={() => onNavigate("transaksi")} 
              className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
            >
              Lihat Riwayat <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
            {transaksiList.slice(0, 5).map((tx) => (
              <div key={tx.id} className="p-3.5 flex justify-between items-center bg-white hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-xs font-semibold ${
                    tx.layanan === "PLN" ? "bg-amber-50 text-amber-600" :
                    tx.layanan === "PDAM" ? "bg-blue-50 text-blue-600" :
                    "bg-purple-50 text-purple-600"
                  }`}>
                    {tx.layanan === "PLN" && <Zap size={16} />}
                    {tx.layanan === "PDAM" && <Droplet size={16} />}
                    {tx.layanan === "WIFI" && <Wifi size={16} />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">{tx.namaPelanggan}</h5>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {tx.id} • {tx.periode} • {tx.metodePembayaran}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 block font-mono">
                    {formatRupiah(tx.jumlahBayar)}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {new Date(tx.tanggalBayar).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
            {transaksiList.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada transaksi pembayaran yang tercatat.
              </div>
            )}
          </div>
        </div>

        {/* High Priority Alerts & Quick Action Launcher */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-slate-800">Tunggakan Urgent (Mei / Juni)</h4>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-rose-50 text-rose-500 rounded-md">
              Awas Denda
            </span>
          </div>

          <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
            {arrearsList.slice(0, 5).map((item, index) => (
              <div key={`${item.pelanggan.id}-${item.periode}-${index}`} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100/50 flex justify-between items-center hover:bg-rose-50 transition duration-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">{item.pelanggan.nama}</h5>
                    <p className="text-[10px] text-slate-500">
                      Tunggakan **{item.pelanggan.layanan}** untuk periode **{item.periode}**
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-600 font-mono">
                    {formatRupiah(item.perkiraanBiaya)}
                  </span>
                  <button 
                    onClick={() => onQuickPayment(item.pelanggan.id)}
                    className="p-1.5 bg-rose-600 font-semibold text-[10px] tracking-wide text-white hover:bg-rose-700 rounded-md flex items-center justify-center transition"
                    title="Bayar Sekarang"
                  >
                    Bayar
                  </button>
                </div>
              </div>
            ))}
            {arrearsList.length === 0 && (
              <div className="p-8 text-center bg-emerald-50/20 text-emerald-600 rounded-xl border border-dashed border-emerald-100 text-xs flex flex-col items-center gap-2">
                <CheckCircle2 size={24} />
                <span>Fantastis! Seluruh pelanggan lunas membayar tagihan.</span>
              </div>
            )}
            {arrearsList.length > 5 && (
              <div className="text-center pt-2">
                <button 
                  onClick={() => onNavigate("transaksi")}
                  className="text-xs text-slate-500 font-medium hover:text-indigo-600 hover:underline"
                >
                  +{arrearsList.length - 5} Tunggakan Lainnya. Lihat di Menu Tagihan Belum Lunas
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
