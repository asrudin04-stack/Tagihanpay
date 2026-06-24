/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  FileText, 
  User, 
  Layers, 
  Calendar, 
  Clock, 
  Download, 
  Printer, 
  Search, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  TrendingDown,
  ChevronRight,
  Sparkles,
  DollarSign
} from "lucide-react";
import { 
  Pelanggan, 
  Transaksi, 
  BiayaTarif, 
  TanggalPembayaran,
  formatRupiah, 
  BULAN_LIST, 
  TAHUN_LIST, 
  getMonthLabel 
} from "../types";

interface LaporanViewProps {
  pelangganList: Pelanggan[];
  transaksiList: Transaksi[];
  biayaList: BiayaTarif[];
  tanggalList: TanggalPembayaran[];
}

type LaporanTab = "pelanggan" | "jenis" | "bulan" | "tahun" | "tunggakan";

export default function LaporanView({
  pelangganList,
  transaksiList,
  biayaList,
  tanggalList
}: LaporanViewProps) {
  
  // Active Laporan Tab
  const [activeReportTab, setActiveReportTab] = useState<LaporanTab>("pelanggan");

  // --- FILTERS STATE ---
  const [filterPelangganId, setFilterPelangganId] = useState("");
  const [filterLayanan, setFilterLayanan] = useState<"PLN" | "PDAM" | "WIFI">("PLN");
  const [filterBulan, setFilterBulan] = useState("06"); // Juni
  const [filterTahun, setFilterTahun] = useState("2026");

  // --- SEARCH QUERY FOR LAPORAN ---
  const [searchQuery, setSearchQuery] = useState("");

  // Active periods list for calculating arrears
  const activePeriods = ["2026-06"];

  // ==========================================
  // CALCULATE REPORT DATA BY CHOSEN TAB
  // ==========================================

  // Filtered customer list for the Dropdown selector
  const filteredPelangganList = useMemo(() => {
    if (!searchQuery.trim()) return pelangganList;
    const query = searchQuery.toLowerCase();
    return pelangganList.filter(p => 
      p.nama.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query) ||
      (p.noMeter && p.noMeter.toLowerCase().includes(query))
    );
  }, [pelangganList, searchQuery]);

  // Report 1: Payments per Customer
  const customerReportData = useMemo(() => {
    if (!filterPelangganId) return [];
    return transaksiList.filter((tx) => tx.idPelanggan === filterPelangganId);
  }, [filterPelangganId, transaksiList]);

  const customerDuesData = useMemo(() => {
    if (!filterPelangganId) return [];
    const client = pelangganList.find((p) => p.id === filterPelangganId);
    if (!client) return [];

    const list: { period: string; billingAmount: number }[] = [];
    const standardRate = client.nominalTarif !== undefined && client.nominalTarif !== null && client.nominalTarif >= 0
      ? client.nominalTarif
      : (client.idTarif ? biayaList.find((b) => b.id === client.idTarif) : biayaList.find((b) => b.layanan === client.layanan))?.biayaPerBulan || 100000;

    activePeriods.forEach((period) => {
      const isPaid = transaksiList.some(
        (tx) => tx.idPelanggan === filterPelangganId && tx.layanan === client.layanan && tx.periode === period
      );
      if (!isPaid) {
        const parts = period.split("-");
        list.push({
          period: `${getMonthLabel(parts[1])} ${parts[0]}`,
          billingAmount: standardRate
        });
      }
    });
    return list;
  }, [filterPelangganId, pelangganList, transaksiList, biayaList]);

  // Report 2: Payments per Service Type (PLN, PDAM, WIFI)
  const serviceReportData = useMemo(() => {
    return transaksiList.filter((tx) => tx.layanan === filterLayanan);
  }, [filterLayanan, transaksiList]);

  // Filtered version of service payments
  const filteredServiceReportData = useMemo(() => {
    if (!searchQuery.trim()) return serviceReportData;
    const query = searchQuery.toLowerCase();
    return serviceReportData.filter(tx => 
      tx.namaPelanggan.toLowerCase().includes(query) ||
      tx.idPelanggan.toLowerCase().includes(query)
    );
  }, [serviceReportData, searchQuery]);

  // Report 3: Payments per Month
  const monthReportData = useMemo(() => {
    return transaksiList.filter((tx) => tx.periode.endsWith(`-${filterBulan}`));
  }, [filterBulan, transaksiList]);

  // Filtered version of month payments
  const filteredMonthReportData = useMemo(() => {
    if (!searchQuery.trim()) return monthReportData;
    const query = searchQuery.toLowerCase();
    return monthReportData.filter(tx => 
      tx.namaPelanggan.toLowerCase().includes(query) ||
      tx.idPelanggan.toLowerCase().includes(query)
    );
  }, [monthReportData, searchQuery]);

  // Report 4: Payments per Year
  const yearReportData = useMemo(() => {
    return transaksiList.filter((tx) => tx.periode.startsWith(`${filterTahun}-`));
  }, [filterTahun, transaksiList]);

  // Filtered version of year payments
  const filteredYearReportData = useMemo(() => {
    if (!searchQuery.trim()) return yearReportData;
    const query = searchQuery.toLowerCase();
    return yearReportData.filter(tx => 
      tx.namaPelanggan.toLowerCase().includes(query) ||
      tx.idPelanggan.toLowerCase().includes(query)
    );
  }, [yearReportData, searchQuery]);

  // Report 5: All Outstanding Arrears (Tunggakan)
  const arrearsReportData = useMemo(() => {
    const list: { 
      pelangganId: string; 
      nama: string; 
      layanan: string; 
      periode: string; 
      nominal: number; 
      jatuhTempo: string;
    }[] = [];

    pelangganList.forEach((p) => {
      let nominal = 120000;
      if (p.nominalTarif !== undefined && p.nominalTarif !== null && p.nominalTarif >= 0) {
        nominal = p.nominalTarif;
      } else {
        const rateObj = p.idTarif ? biayaList.find((b) => b.id === p.idTarif) : biayaList.find((b) => b.layanan === p.layanan);
        nominal = rateObj ? rateObj.biayaPerBulan : 120000;
      }

      // Find matching due date schedule for the service/customer
      const schedule = p.idTanggal 
        ? tanggalList.find((t) => t.id === p.idTanggal) 
        : tanggalList.find((t) => t.layanan === p.layanan);
      const dueDay = schedule ? schedule.tanggalJatuhTempo : 10;

      activePeriods.forEach((period) => {
        const isPaid = transaksiList.some(
          (tx) => tx.idPelanggan === p.id && tx.layanan === p.layanan && tx.periode === period
        );

        if (!isPaid) {
          const parts = period.split("-");
          const monthLabel = getMonthLabel(parts[1]);
          list.push({
            pelangganId: p.id,
            nama: p.nama,
            layanan: p.layanan,
            periode: period,
            nominal,
            jatuhTempo: `Tanggal ${dueDay} ${monthLabel} ${parts[0]}`
          });
        }
      });
    });

    return list;
  }, [pelangganList, transaksiList, biayaList, tanggalList]);

  // Filtered version of arrears
  const filteredArrearsReportData = useMemo(() => {
    if (!searchQuery.trim()) return arrearsReportData;
    const query = searchQuery.toLowerCase();
    return arrearsReportData.filter(item => 
      item.nama.toLowerCase().includes(query) ||
      item.pelangganId.toLowerCase().includes(query)
    );
  }, [arrearsReportData, searchQuery]);

  // Get active report's sum
  const activeReportTotals = useMemo(() => {
    let dataToSum: Transaksi[] = [];
    if (activeReportTab === "pelanggan") dataToSum = customerReportData;
    else if (activeReportTab === "jenis") dataToSum = filteredServiceReportData;
    else if (activeReportTab === "bulan") dataToSum = filteredMonthReportData;
    else if (activeReportTab === "tahun") dataToSum = filteredYearReportData;
    else {
      // Arrears total
      const totalArr = filteredArrearsReportData.reduce((sum, item) => sum + item.nominal, 0);
      return { count: filteredArrearsReportData.length, money: totalArr };
    }

    const totalMoney = dataToSum.reduce((sum, tx) => sum + tx.jumlahBayar, 0);
    return { count: dataToSum.length, money: totalMoney };
  }, [
    activeReportTab, 
    customerReportData, 
    filteredServiceReportData, 
    filteredMonthReportData, 
    filteredYearReportData, 
    filteredArrearsReportData
  ]);

  // ==========================================
  // EXPORT UTILITY WORKFLOWS
  // ==========================================

  // Export visible data to Microsoft Excel / CSV Sheet format
  const handleExportExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Configure CSV rows depending on the open tab
    if (activeReportTab === "pelanggan") {
      const activeClient = pelangganList.find((p) => p.id === filterPelangganId);
      csvContent += `LAPORAN PEMBAYARAN PER PELANGGAN - ${activeClient?.nama || "BELUM DIPILIH"}\r\n`;
      csvContent += `ID Pelanggan,Nama,Layanan,No Invoice,Periode,Tanggal Bayar,Metode,Jumlah Bayar\r\n`;
      customerReportData.forEach((tx) => {
        csvContent += `${tx.idPelanggan},"${tx.namaPelanggan}",${tx.layanan},${tx.id},${tx.periode},${tx.tanggalBayar},${tx.metodePembayaran},${tx.jumlahBayar}\r\n`;
      });
      csvContent += `\r\nOutstanding Tagihan Belum Lunas:\r\n`;
      csvContent += `Periode Tunggakan,Nominal\r\n`;
      customerDuesData.forEach((d) => {
        csvContent += `${d.period},${d.billingAmount}\r\n`;
      });
    } 
    else if (activeReportTab === "jenis") {
      csvContent += `LAPORAN PEMBAYARAN JENIS LAYANAN - ${filterLayanan}\r\n`;
      csvContent += `No Invoice,ID Pelanggan,Nama Pelanggan,Periode,Tanggal Bayar,Metode,Jumlah Bayar\r\n`;
      filteredServiceReportData.forEach((tx) => {
        csvContent += `${tx.id},${tx.idPelanggan},"${tx.namaPelanggan}",${tx.periode},${tx.tanggalBayar},${tx.metodePembayaran},${tx.jumlahBayar}\r\n`;
      });
      csvContent += `Total Nominal Terbayar:,${activeReportTotals.money}\r\n`;
    } 
    else if (activeReportTab === "bulan") {
      csvContent += `LAPORAN PEMBAYARAN BULANAN - ${getMonthLabel(filterBulan)}\r\n`;
      csvContent += `No Invoice,ID Pelanggan,Nama Pelanggan,Layanan,Periode,Tanggal Bayar,Metode,Jumlah Bayar\r\n`;
      filteredMonthReportData.forEach((tx) => {
        csvContent += `${tx.id},${tx.idPelanggan},"${tx.namaPelanggan}",${tx.layanan},${tx.periode},${tx.tanggalBayar},${tx.metodePembayaran},${tx.jumlahBayar}\r\n`;
      });
      csvContent += `Total Nominal Terbayar:,${activeReportTotals.money}\r\n`;
    } 
    else if (activeReportTab === "tahun") {
      csvContent += `LAPORAN PEMBAYARAN TAHUNAN - ${filterTahun}\r\n`;
      csvContent += `No Invoice,ID Pelanggan,Nama Pelanggan,Layanan,Periode,Tanggal Bayar,Metode,Jumlah Bayar\r\n`;
      filteredYearReportData.forEach((tx) => {
        csvContent += `${tx.id},${tx.idPelanggan},"${tx.namaPelanggan}",${tx.layanan},${tx.periode},${tx.tanggalBayar},${tx.metodePembayaran},${tx.jumlahBayar}\r\n`;
      });
      csvContent += `Total Nominal Terbayar:,${activeReportTotals.money}\r\n`;
    } 
    else {
      csvContent += `LAPORAN TUNGGAKAN TAGIHAN AKTIF\r\n`;
      csvContent += `ID Pelanggan,Nama Pelanggan,Layanan,Periode Tunggakan,Nominal Tunggakan\r\n`;
      filteredArrearsReportData.forEach((item) => {
        csvContent += `${item.pelangganId},"${item.nama}",${item.layanan},${item.periode},${item.nominal}\r\n`;
      });
      csvContent += `Total Tunggakan:,${activeReportTotals.money}\r\n`;
    }

    // Create file trigger download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_tagihan_${activeReportTab}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe Browser Print trigger to function as dynamic PDF printout
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Tab Selection cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white p-2.5 border border-slate-100 shadow-sm rounded-2xl" id="laporan-main-nav">
        
        {/* Tab 1 */}
        <button
          onClick={() => { setActiveReportTab("pelanggan"); setSearchQuery(""); }}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition cursor-pointer gap-1 text-center ${
            activeReportTab === "pelanggan"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <User size={16} />
          <span className="text-[10px] font-bold tracking-tight">Per Pelanggan</span>
        </button>

        {/* Tab 2 */}
        <button
          onClick={() => { setActiveReportTab("jenis"); setSearchQuery(""); }}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition cursor-pointer gap-1 text-center ${
            activeReportTab === "jenis"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Layers size={16} />
          <span className="text-[10px] font-bold tracking-tight">Per Jenis Tagihan</span>
        </button>

        {/* Tab 3 */}
        <button
          onClick={() => { setActiveReportTab("bulan"); setSearchQuery(""); }}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition cursor-pointer gap-1 text-center ${
            activeReportTab === "bulan"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Calendar size={16} />
          <span className="text-[10px] font-bold tracking-tight">Per Bulan Buku</span>
        </button>

        {/* Tab 4 */}
        <button
          onClick={() => { setActiveReportTab("tahun"); setSearchQuery(""); }}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition cursor-pointer gap-1 text-center ${
            activeReportTab === "tahun"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <TrendingUp size={16} />
          <span className="text-[10px] font-bold tracking-tight">Per Tahun Tagihan</span>
        </button>

        {/* Tab 5 */}
        <button
          onClick={() => { setActiveReportTab("tunggakan"); setSearchQuery(""); }}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition cursor-pointer col-span-2 md:col-span-1 gap-1 text-center ${
            activeReportTab === "tunggakan"
              ? "bg-rose-950 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Clock size={16} />
          <span className="text-[10px] font-bold tracking-tight">Tunggakan SPP/Tagihan</span>
        </button>

      </div>

      {/* Dynamic Filters Row depending on open report type */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 print:hidden" id="report-filter-bar">
        
        <div className="flex justify-between items-center pb-3 border-b border-slate-50">
          <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
            Pengaturan Saringan Parameter Laporan
          </h4>
          
          {/* Print/Download Excel Floating buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 border border-slate-250 hover:bg-slate-100 text-[10px] font-semibold text-slate-650 rounded-lg flex items-center gap-1 cursor-pointer transition.all"
              title="Download spreadsheet EXCEL"
            >
              <Download size={12} />
              Export ke Excel
            </button>
            <button
              onClick={handlePrintPDF}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-lg shadow-indigo-600/10 transition"
              title="Cetak langsung ke PDF"
            >
              <Printer size={12} />
              Cetak PDF (Sistem)
            </button>
          </div>
        </div>

        {/* Dynamic Filters Forms render */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          
          {/* LHS Panel: Core parameters */}
          <div>
            {/* TAB 1: Per Pelanggan Filter */}
            {activeReportTab === "pelanggan" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase text-slate-500 font-semibold block flex items-center justify-between">
                    <span>1. Tulis Nama / ID Pelanggan untuk mencari</span>
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")} 
                        className="text-[10px] text-indigo-600 hover:underline font-semibold font-sans normal-case"
                      >
                        Reset Cari
                      </button>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">
                      <Search size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="Ketik Nama, ID, atau No ID Meter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600 text-slate-800 bg-white shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">2. Pilih Pelanggan Terfilter</label>
                  <select
                    value={filterPelangganId}
                    onChange={(e) => setFilterPelangganId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-250 rounded-lg text-slate-800 bg-white font-medium focus:border-indigo-500"
                  >
                    <option value="">
                      {filteredPelangganList.length === 0 
                        ? "-- Pelanggan Tidak Ditemukan --" 
                        : `-- Pilih dari ${filteredPelangganList.length} Nama --`}
                    </option>
                    {filteredPelangganList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.layanan} - {p.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* TAB 2: Per Jenis Layanan Filter */}
            {activeReportTab === "jenis" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Jenis Layanan Digital</label>
                <div className="flex flex-wrap gap-2">
                  {(["PLN", "PDAM", "WIFI"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setFilterLayanan(l)}
                      className={`px-4 py-2 border text-xs font-bold rounded-lg transition overflow-hidden cursor-pointer ${
                        filterLayanan === l
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {l === "PLN" ? "PLN (Listrik)" : 
                       l === "PDAM" ? "PDAM (Air)" : 
                       "WIFI (Internet)"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Per Bulan Filter */}
            {activeReportTab === "bulan" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Pilih Bulan Buku</label>
                <select
                  value={filterBulan}
                  onChange={(e) => setFilterBulan(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-250 rounded-lg text-slate-800 bg-white focus:border-indigo-500"
                >
                  {BULAN_LIST.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* TAB 4: Per Tahun Filter */}
            {activeReportTab === "tahun" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Pilih Tahun Pembukuan</label>
                <select
                  value={filterTahun}
                  onChange={(e) => setFilterTahun(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-250 rounded-lg text-slate-800 bg-white font-mono focus:border-indigo-500"
                >
                  {TAHUN_LIST.map((y) => (
                    <option key={y} value={y}>
                      Tahun Pembukuan {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* TAB 5: Tunggakan Info Indicator */}
            {activeReportTab === "tunggakan" && (
              <div className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                Saringan otomatis aktif menampilkan semua tunggakan belum lunas periode bulan ini (Juni 2026).
              </div>
            )}
          </div>

          {/* RHS Panel: Global search filter by Client Name/ID for aggregate charts & lists */}
          {activeReportTab !== "pelanggan" && (
            <div className="space-y-1.5 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <label className="text-[10px] font-mono uppercase text-slate-500 font-semibold block flex items-center justify-between">
                <span>Cari / Saring Nama Pelanggan</span>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")} 
                    className="text-[10px] text-indigo-600 hover:underline font-semibold font-sans normal-case"
                  >
                    Bersihkan
                  </button>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Ketik Nama atau ID Pelanggan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600 focus:bg-white text-slate-850 bg-white shadow-xs"
                />
              </div>
            </div>
          )}

        </div>

      </div>

      {/* KPI Stats Quick Overview during Report check */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
        
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[9px] font-mono uppercase text-slate-400 font-semibold block">Jumlah Rekor Terpilih</span>
            <span className="text-lg font-bold text-slate-800 font-mono">{activeReportTotals.count} Transaksi</span>
          </div>
          <div className="p-2 bg-slate-50 text-slate-500 rounded-lg"><FileText size={20} /></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[9px] font-mono uppercase text-slate-400 font-semibold block">
              {activeReportTab === "tunggakan" ? "Total Beban Tunggakan" : "Total Kas Masuk Terpilih"}
            </span>
            <span className={`text-lg font-bold font-mono ${activeReportTab === "tunggakan" ? "text-rose-600" : "text-emerald-600"}`}>
              {formatRupiah(activeReportTotals.money)}
            </span>
          </div>
          <div className={`p-2 rounded-lg ${activeReportTab === "tunggakan" ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-550"}`}>
            <DollarSign size={20} />
          </div>
        </div>

      </div>

      {/* ==========================================
          REPORTS TABLES VIEWER AREA - PRINT SAFE
          ========================================== */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 md:p-8 space-y-6" id="printable-report-card">
        
        {/* Printable generic header */}
        <div className="hidden print:block text-center space-y-2 border-b-2 border-dashed border-slate-300 pb-6 mb-6">
          <h2 className="text-2xl font-bold tracking-tight">LAPORAN KAS PEMBAYARAN DIGITAL</h2>
          <p className="text-xs font-mono text-slate-500 uppercase">Aplikasi Pengelola Tagihan PLN, PDAM, dan WIFI</p>
          <p className="text-sm font-semibold text-slate-700">
            Kategori Laporan: Per {activeReportTab.toUpperCase()} ({new Date().toLocaleDateString("id-ID")})
          </p>
        </div>

        {/* CONDITIONAL RENDER BY REPORT TAB */}

        {/* TAB 1: PER PELANGGAN REPORT TABLE */}
        {activeReportTab === "pelanggan" && (
          <div className="space-y-6">
            
            {!filterPelangganId ? (
              <div className="p-12 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-150 print:hidden">
                Silakan pilih pelanggan terlebih dahulu pada menu saringan di atas untuk menerbitkan laporan.
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Profile detail */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-650 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">NAMA PELANGGAN</span>
                    <strong className="text-slate-800 text-sm font-bold">{pelangganList.find(p => p.id === filterPelangganId)?.nama}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">JENIS LAYANAN</span>
                    <strong className="text-slate-800 font-bold uppercase">{pelangganList.find(p => p.id === filterPelangganId)?.layanan}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">METER ID / MODEM ID</span>
                    <strong className="text-slate-800 font-bold font-mono">{pelangganList.find(p => p.id === filterPelangganId)?.noMeter}</strong>
                  </div>
                </div>

                {/* Sub title details */}
                <h5 className="text-xs font-bold text-slate-800 uppercase font-mono border-b border-slate-100 pb-2 flex items-center gap-1.5 pt-2">
                  <CheckCircle size={14} className="text-emerald-500" />
                  Daftar Transaksi Tertulis Lunas (Terbayar)
                </h5>

                {/* Paid history */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-mono text-slate-450 uppercase border-b border-slate-100 font-bold">
                        <th className="p-3">KODE EXPEDI</th>
                        <th className="p-3">REFERENSI</th>
                        <th className="p-3">PERIODE BULAN</th>
                        <th className="p-3">TANGGAL BAYAR</th>
                        <th className="p-3">METODE</th>
                        <th className="p-3 text-right">TOTAL NOMINAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerReportData.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-900">{item.id}</td>
                          <td className="p-3 font-mono text-slate-600">{item.noReff || "-"}</td>
                          <td className="p-3 font-semibold text-slate-705">
                            {getMonthLabel(item.periode.split("-")[1])} {item.periode.split("-")[0]}
                          </td>
                          <td className="p-3 font-mono text-slate-500">{item.tanggalBayar}</td>
                          <td className="p-3 font-medium text-slate-600">{item.metodePembayaran}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">{formatRupiah(item.jumlahBayar)}</td>
                        </tr>
                      ))}
                      {customerReportData.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 font-mono">
                            Belum ada catatan riwayat lunas pembayaran untuk pelanggan ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Tunggakan outstanding detail */}
                <h5 className="text-xs font-bold text-rose-700 uppercase font-mono border-b border-slate-100 pb-2 flex items-center gap-1.5 pt-4">
                  <AlertCircle size={14} className="text-rose-500" />
                  Tagihan Belum Dilunasi (Outstanding Arrears)
                </h5>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-rose-50/35 text-[10px] font-mono text-rose-700 uppercase border-b border-rose-100 font-bold">
                        <th className="p-3">PERIODE BULAN</th>
                        <th className="p-3">NOMINAL TAGIHAN</th>
                        <th className="p-3 text-right">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-50/50">
                      {customerDuesData.map((due, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/10 text-rose-900">
                          <td className="p-3 font-mono font-bold">{due.period}</td>
                          <td className="p-3 font-mono font-bold">{formatRupiah(due.billingAmount)}</td>
                          <td className="p-3 text-right font-bold tracking-wide uppercase text-[9px]">Belum Lunas - Menunggak</td>
                        </tr>
                      ))}
                      {customerDuesData.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-emerald-600 font-bold bg-emerald-50/10 rounded-xl">
                            Seluruh tagihan pelanggan ini tercatat Lunas Bersih untuk periode berjalan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 2 / 3 / 4 / 5: GENERIC TABULAR RENDER */}
        {activeReportTab !== "pelanggan" && (
          <div className="space-y-6">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h5 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
                {activeReportTab === "jenis" && `DAFTAR TRANSAKSI LAYANAN - ${filterLayanan}`}
                {activeReportTab === "bulan" && `DAFTAR TRANSAKSI DI BULAN - ${getMonthLabel(filterBulan).toUpperCase()}`}
                {activeReportTab === "tahun" && `DAFTAR TRANSAKSI DI TAHUN - ${filterTahun}`}
                {activeReportTab === "tunggakan" && "DAFTAR TUNGGAKAN AKTIF PELANGGAN"}
              </h5>
              
              <span className="font-mono text-[10px] text-slate-400 font-bold">
                Mata Uang: IDR (Rupiah)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-mono text-slate-450 uppercase border-b border-slate-100 font-bold">
                    {activeReportTab !== "tunggakan" ? (
                      <>
                        <th className="p-3 pl-4">INVOICE</th>
                        <th className="p-3">NAMA PELANGGAN</th>
                        <th className="p-3">LAYANAN</th>
                        <th className="p-3">PERIODE</th>
                        <th className="p-3">TANGGAL BAYAR</th>
                        <th className="p-3">METODE</th>
                        <th className="p-3 pr-4 text-right">NOMINAL BAYAR</th>
                      </>
                    ) : (
                      <>
                        <th className="p-3 pl-4">ID CLIENT</th>
                        <th className="p-3">NAMA PELANGGAN</th>
                        <th className="p-3">LAYANAN</th>
                        <th className="p-3">PERIODE TUNGGAKAN</th>
                        <th className="p-3">BATAS TEMPO</th>
                        <th className="p-3 pr-4 text-right">JUMLAH TUNGGAKAN</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  
                  {/* DATA ROWS FOR TRANSACTIONS */}
                  {activeReportTab !== "tunggakan" && (
                    (activeReportTab === "jenis" ? filteredServiceReportData :
                     activeReportTab === "bulan" ? filteredMonthReportData :
                     filteredYearReportData).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="p-3 pl-4 font-mono font-bold text-slate-900">{tx.id}</td>
                        <td className="p-3">
                          <div>
                            <span className="font-bold text-slate-800 block">{tx.namaPelanggan}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{tx.idPelanggan}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
                            {tx.layanan}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">
                          {getMonthLabel(tx.periode.split("-")[1])} {tx.periode.split("-")[0]}
                        </td>
                        <td className="p-3 font-mono text-slate-500">{tx.tanggalBayar}</td>
                        <td className="p-3 font-medium text-slate-650">{tx.metodePembayaran}</td>
                        <td className="p-3 pr-4 text-right font-mono font-bold text-slate-800">
                          {formatRupiah(tx.jumlahBayar)}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* DATA ROWS FOR ARREARS TUNGGAKAN SPP */}
                  {activeReportTab === "tunggakan" && (
                    filteredArrearsReportData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/15">
                        <td className="p-3 pl-4 font-mono font-bold text-slate-900">{item.pelangganId}</td>
                        <td className="p-3 font-bold text-slate-800">{item.nama}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.layanan === "PLN" ? "bg-amber-50 text-amber-600" :
                            item.layanan === "PDAM" ? "bg-blue-50 text-blue-600" :
                            "bg-purple-50 text-purple-600"
                          }`}>
                            {item.layanan}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 font-bold rounded">
                            {getMonthLabel(item.periode.split("-")[1])} {item.periode.split("-")[0]}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-450 tracking-wide">
                          {item.jatuhTempo}
                        </td>
                        <td className="p-3 pr-4 text-right font-mono font-bold text-rose-600">
                          {formatRupiah(item.nominal)}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Empty warning states */}
                  {((activeReportTab === "jenis" ? serviceReportData :
                     activeReportTab === "bulan" ? monthReportData :
                     activeReportTab === "tahun" ? yearReportData :
                     arrearsReportData).length === 0) && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 font-mono">
                        Belum ada data laporan yang cocok untuk diterbitkan.
                      </td>
                    </tr>
                  )}

                  {/* Search mismatch empty state */}
                  {((activeReportTab === "jenis" ? serviceReportData :
                     activeReportTab === "bulan" ? monthReportData :
                     activeReportTab === "tahun" ? yearReportData :
                     arrearsReportData).length > 0) &&
                   ((activeReportTab === "jenis" ? filteredServiceReportData :
                     activeReportTab === "bulan" ? filteredMonthReportData :
                     activeReportTab === "tahun" ? filteredYearReportData :
                     filteredArrearsReportData).length === 0) && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 text-xs italic bg-slate-50/40">
                        Tidak ada data yang cocok dengan pencarian "{searchQuery}"
                      </td>
                    </tr>
                  )}

                  {/* Summary Totals Row at the bottom of the table */}
                  {((activeReportTab === "jenis" ? filteredServiceReportData :
                     activeReportTab === "bulan" ? filteredMonthReportData :
                     activeReportTab === "tahun" ? filteredYearReportData :
                     filteredArrearsReportData).length > 0) && (
                    <tr className="bg-slate-900 text-white font-mono font-bold border-t border-slate-100">
                      <td colSpan={activeReportTab !== "tunggakan" ? 6 : 5} className="p-4 pl-6 text-sm text-slate-300">
                        TOTAL REKAPITULASI LAPORAN:
                      </td>
                      <td className={`p-4 pr-6 text-right text-sm ${activeReportTab === "tunggakan" ? "text-rose-400" : "text-emerald-400"}`}>
                        {formatRupiah(activeReportTotals.money)}
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>

            {/* Printable Footnote for physical PDF signature */}
            <div className="hidden print:grid grid-cols-2 pt-12 text-[10px] font-mono text-center gap-12 text-slate-500">
              <div>
                <p className="pb-16 text-slate-400">Diperiksa Oleh,</p>
                <p className="font-bold text-slate-800 underline">Direktur Keuangan / Spv Kantor</p>
                <p>NIP: .......................................</p>
              </div>
              <div>
                <p className="pb-16 text-slate-400">Dibuat Oleh,</p>
                <p className="font-bold text-slate-800 underline">E-Payment Kasir Portal</p>
                <p>Tanggal: {new Date().toLocaleDateString("id-ID")}</p>
              </div>
            </div>

            {/* Print Note banner */}
            <div className="text-center font-mono text-[9px] text-slate-400 pt-4 border-t border-slate-100 border-dashed print:hidden">
              Informasi ini dihasilkan secara transparan melalui sistem pencatatan loket E-Payment.
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
