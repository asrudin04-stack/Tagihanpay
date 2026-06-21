/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  LayoutDashboard, 
  Database, 
  Users, 
  Calendar, 
  DollarSign, 
  Receipt, 
  FileText, 
  Menu, 
  X, 
  Clock, 
  CheckCircle, 
  CreditCard,
  Building,
  Zap,
  Droplet,
  Wifi,
  BookmarkCheck,
  RotateCcw,
  Trash2,
  AlertTriangle
} from "lucide-react";

import { 
  Pelanggan, 
  TanggalPembayaran, 
  BiayaTarif, 
  Transaksi, 
  INITIAL_PELANGGAN, 
  INITIAL_TANGGAL_PEMBAYARAN, 
  INITIAL_BIAYA_TARIF, 
  INITIAL_TRANSAKSI 
} from "./types";

import Dashboard from "./components/Dashboard";
import MasterPelanggan from "./components/MasterPelanggan";
import MasterTanggal from "./components/MasterTanggal";
import MasterBiaya from "./components/MasterBiaya";
import TransaksiView from "./components/TransaksiView";
import LaporanView from "./components/LaporanView";

export default function App() {
  
  // Real-time synchronization state
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [tanggalList, setTanggalList] = useState<TanggalPembayaran[]>([]);
  const [biayaList, setBiayaList] = useState<BiayaTarif[]>([]);
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);

  // Navigation: active main view tab state
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Quick routing trigger state (e.g. paying from arrears lists)
  const [quickPaymentCustomerId, setQuickPaymentCustomerId] = useState<string | undefined>(undefined);

  // System State Recovery and Reset triggers
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleResetToDefault = () => {
    setPelangganList(INITIAL_PELANGGAN);
    localStorage.setItem("pembayaran_pelanggan", JSON.stringify(INITIAL_PELANGGAN));

    setTanggalList(INITIAL_TANGGAL_PEMBAYARAN);
    localStorage.setItem("pembayaran_tanggal", JSON.stringify(INITIAL_TANGGAL_PEMBAYARAN));

    setBiayaList(INITIAL_BIAYA_TARIF);
    localStorage.setItem("pembayaran_biaya", JSON.stringify(INITIAL_BIAYA_TARIF));

    setTransaksiList(INITIAL_TRANSAKSI);
    localStorage.setItem("pembayaran_transaksi", JSON.stringify(INITIAL_TRANSAKSI));

    setIsResetModalOpen(false);
    setActiveTab("dashboard");
  };

  const handleClearAllData = () => {
    setPelangganList([]);
    localStorage.setItem("pembayaran_pelanggan", JSON.stringify([]));

    setTanggalList([]);
    localStorage.setItem("pembayaran_tanggal", JSON.stringify([]));

    setBiayaList([]);
    localStorage.setItem("pembayaran_biaya", JSON.stringify([]));

    setTransaksiList([]);
    localStorage.setItem("pembayaran_transaksi", JSON.stringify([]));

    setIsResetModalOpen(false);
    setActiveTab("dashboard");
  };

  // Load initial dataset from localStorage or fallback to defaults
  useEffect(() => {
    const clients = localStorage.getItem("pembayaran_pelanggan");
    const dates = localStorage.getItem("pembayaran_tanggal");
    const tariffs = localStorage.getItem("pembayaran_biaya");
    const txs = localStorage.getItem("pembayaran_transaksi");

    if (clients) setPelangganList(JSON.parse(clients));
    else {
      setPelangganList(INITIAL_PELANGGAN);
      localStorage.setItem("pembayaran_pelanggan", JSON.stringify(INITIAL_PELANGGAN));
    }

    if (dates) setTanggalList(JSON.parse(dates));
    else {
      setTanggalList(INITIAL_TANGGAL_PEMBAYARAN);
      localStorage.setItem("pembayaran_tanggal", JSON.stringify(INITIAL_TANGGAL_PEMBAYARAN));
    }

    if (tariffs) setBiayaList(JSON.parse(tariffs));
    else {
      setBiayaList(INITIAL_BIAYA_TARIF);
      localStorage.setItem("pembayaran_biaya", JSON.stringify(INITIAL_BIAYA_TARIF));
    }

    if (txs) setTransaksiList(JSON.parse(txs));
    else {
      setTransaksiList(INITIAL_TRANSAKSI);
      localStorage.setItem("pembayaran_transaksi", JSON.stringify(INITIAL_TRANSAKSI));
    }
  }, []);

  // --- CRUD DISPATCHERS SYNCS ---

  // Pelanggan CRUD
  const handleAddPelanggan = (p: Pelanggan | Pelanggan[]) => {
    setPelangganList(prev => {
      const newItems = Array.isArray(p) ? p : [p];
      const updated = [...newItems, ...prev];
      localStorage.setItem("pembayaran_pelanggan", JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdatePelanggan = (p: Pelanggan) => {
    const updated = pelangganList.map(item => item.id === p.id ? p : item);
    setPelangganList(updated);
    localStorage.setItem("pembayaran_pelanggan", JSON.stringify(updated));
  };

  const handleDeletePelanggan = (id: string) => {
    const updated = pelangganList.filter(item => item.id !== id);
    setPelangganList(updated);
    localStorage.setItem("pembayaran_pelanggan", JSON.stringify(updated));
  };

  // Tanggal CRUD
  const handleAddTanggal = (t: TanggalPembayaran) => {
    const updated = [t, ...tanggalList];
    setTanggalList(updated);
    localStorage.setItem("pembayaran_tanggal", JSON.stringify(updated));
  };

  const handleUpdateTanggal = (t: TanggalPembayaran) => {
    const updated = tanggalList.map(item => item.id === t.id ? t : item);
    setTanggalList(updated);
    localStorage.setItem("pembayaran_tanggal", JSON.stringify(updated));
  };

  const handleDeleteTanggal = (id: string) => {
    const updated = tanggalList.filter(item => item.id !== id);
    setTanggalList(updated);
    localStorage.setItem("pembayaran_tanggal", JSON.stringify(updated));
  };

  // Biaya CRUD
  const handleAddBiaya = (b: BiayaTarif) => {
    const updated = [b, ...biayaList];
    setBiayaList(updated);
    localStorage.setItem("pembayaran_biaya", JSON.stringify(updated));
  };

  const handleUpdateBiaya = (b: BiayaTarif) => {
    const updated = biayaList.map(item => item.id === b.id ? b : item);
    setBiayaList(updated);
    localStorage.setItem("pembayaran_biaya", JSON.stringify(updated));
  };

  const handleDeleteBiaya = (id: string) => {
    const updated = biayaList.filter(item => item.id !== id);
    setBiayaList(updated);
    localStorage.setItem("pembayaran_biaya", JSON.stringify(updated));
  };

  // Transaksi Insert
  const handleAddTransaksi = (tx: Transaksi | Transaksi[]) => {
    setTransaksiList(prev => {
      const newItems = Array.isArray(tx) ? tx : [tx];
      const updated = [...newItems, ...prev];
      localStorage.setItem("pembayaran_transaksi", JSON.stringify(updated));
      return updated;
    });
  };

  // Trigger quick payment navigation helper
  const handleQuickPaymentRoute = (pelangganId: string) => {
    setQuickPaymentCustomerId(pelangganId);
    setActiveTab("transaksi");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans" id="app-root">
      
      {/* ==========================================
          SIDEBAR NAVIGATION (DESKTOP)
          ========================================== */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shrink-0 shadow-xl border-r border-slate-800 print:hidden justify-between">
        <div className="space-y-6">
          
          {/* Main Brand Logo Layout */}
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide font-mono uppercase bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                TagihanPay
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">Digital loket billing</p>
            </div>
          </div>

          {/* Navigation Links Group */}
          <div className="px-3.5 space-y-7">
            
            {/* Core Sections */}
            <div className="space-y-1.5">
              <span className="px-3 text-[9px] uppercase font-mono tracking-wider text-slate-500 font-bold">Utama</span>
              
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <LayoutDashboard size={15} />
                Beranda
              </button>
            </div>

            {/* Master Data Subsection */}
            <div className="space-y-1.5">
              <span className="px-3 text-[9px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
                <Database size={10} /> Master Data Config
              </span>

              <button
                onClick={() => setActiveTab("pelanggan")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  activeTab === "pelanggan"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Users size={15} />
                Data Pelanggan (CRUD)
              </button>

              <button
                onClick={() => setActiveTab("tanggal")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  activeTab === "tanggal"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Calendar size={15} />
                Tanggal Pembayaran
              </button>

              <button
                onClick={() => setActiveTab("biaya")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  activeTab === "biaya"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <DollarSign size={15} />
                Biaya & Tarif Tagihan
              </button>
            </div>

            {/* Transactional Subsection */}
            <div className="space-y-1.5">
              <span className="px-3 text-[9px] uppercase font-mono tracking-wider text-slate-500 font-bold">Layanan Loket</span>
              
              <button
                onClick={() => setActiveTab("transaksi")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  activeTab === "transaksi"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Receipt size={15} />
                Transaksi Pembayaran
              </button>
            </div>

            {/* Analytical Report Subsection */}
            <div className="space-y-1.5">
              <span className="px-3 text-[9px] uppercase font-mono tracking-wider text-slate-500 font-bold">OUTPUT DATA</span>
              
              <button
                onClick={() => setActiveTab("laporan")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  activeTab === "laporan"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <FileText size={15} />
                Menu Laporan Lengkap
              </button>
            </div>

            {/* Danger Zone Utilities */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <span className="px-3 text-[9.5px] uppercase font-mono tracking-wider text-rose-500 font-bold flex items-center gap-1">
                <AlertTriangle size={11} className="text-rose-500 animate-pulse" /> Danger Zone System
              </span>
              
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-lg text-rose-450 hover:text-rose-300 hover:bg-rose-955/20 transition cursor-pointer text-left"
              >
                <RotateCcw size={15} className="text-rose-500" />
                Hapus & Reset Data
              </button>
            </div>

          </div>

        </div>

        {/* Workspace Footer Signature */}
        <div className="p-5 border-t border-slate-800 space-y-1 text-[10px] text-slate-500 font-mono">
          <p>Operator: <span className="text-slate-350">Adrusin (Kasir)</span></p>
          <p className="flex items-center gap-1.5 text-emerald-500">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Server: Cloud Run Secure
          </p>
        </div>
      </aside>

      {/* ==========================================
          MOBILE NAVIGATION DRAWER
          ========================================== */}
      <nav className="md:hidden bg-slate-900 border-b border-slate-800 text-white p-4 flex justify-between items-center print:hidden z-30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
            <CreditCard size={16} />
          </div>
          <span className="font-bold text-xs font-mono uppercase">TagihanPay</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Drawer Menu Content Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-14 left-0 right-0 bg-slate-900 text-white z-40 border-b border-slate-800 shadow-2xl p-5 space-y-4 print:hidden"
          >
            <div className="grid grid-cols-1 gap-2.5">
              
              <button
                onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
                className={`py-2 px-3 text-xs font-bold rounded-lg text-left flex items-center gap-2.5 ${
                  activeTab === "dashboard" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-850"
                }`}
              >
                <LayoutDashboard size={15} /> Beranda
              </button>

              <button
                onClick={() => { setActiveTab("pelanggan"); setIsMobileMenuOpen(false); }}
                className={`py-2 px-3 text-xs font-bold rounded-lg text-left flex items-center gap-2.5 ${
                  activeTab === "pelanggan" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-850"
                }`}
              >
                <Users size={15} /> Data Pelanggan
              </button>

              <button
                onClick={() => { setActiveTab("tanggal"); setIsMobileMenuOpen(false); }}
                className={`py-2 px-3 text-xs font-bold rounded-lg text-left flex items-center gap-2.5 ${
                  activeTab === "tanggal" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-850"
                }`}
              >
                <Calendar size={15} /> Tanggal Pembayaran
              </button>

              <button
                onClick={() => { setActiveTab("biaya"); setIsMobileMenuOpen(false); }}
                className={`py-2 px-3 text-xs font-bold rounded-lg text-left flex items-center gap-2.5 ${
                  activeTab === "biaya" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-850"
                }`}
              >
                <DollarSign size={15} /> Biaya & Tarif Tagihan
              </button>

              <button
                onClick={() => { setActiveTab("transaksi"); setIsMobileMenuOpen(false); }}
                className={`py-2 px-3 text-xs font-bold rounded-lg text-left flex items-center gap-2.5 ${
                  activeTab === "transaksi" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-850"
                }`}
              >
                <Receipt size={15} /> Transaksi Pembayaran
              </button>

              <button
                onClick={() => { setActiveTab("laporan"); setIsMobileMenuOpen(false); }}
                className={`py-2 px-3 text-xs font-bold rounded-lg text-left flex items-center gap-2.5 ${
                  activeTab === "laporan" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-850"
                }`}
              >
                <FileText size={15} /> Menu Laporan Lengkap
              </button>

              <button
                onClick={() => { setIsResetModalOpen(true); setIsMobileMenuOpen(false); }}
                className="py-2 px-3 text-xs font-bold rounded-lg text-left flex items-center gap-2.5 text-rose-400 hover:bg-rose-955/20 border-t border-slate-800/80 pt-3.5 mt-1"
              >
                <RotateCcw size={15} className="text-rose-500 animate-pulse" /> Reset & Hapus Data
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MAIN CONTENT CLIENT PANEL WORKSPACE
          ========================================== */}
      <main className="flex-1 flex flex-col min-w-0" id="main-panel">
        
        {/* Top Operational Bar */}
        <header className="bg-white border-b border-slate-100 p-4 px-6 md:px-8 flex justify-between items-center print:hidden">
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-600 uppercase font-mono tracking-wider">Layanan Aktif</span>
            <div className="flex gap-1.5">
              <span className="p-1 px-1.5 rounded bg-amber-50 text-amber-600 text-[9px] font-bold flex items-center gap-0.5" title="Listrik">
                <Zap size={10} fill="currentColor" /> PLN
              </span>
              <span className="p-1 px-1.5 rounded bg-blue-50 text-blue-600 text-[9px] font-bold flex items-center gap-0.5" title="Air">
                <Droplet size={10} /> PDAM
              </span>
              <span className="p-1 px-1.5 rounded bg-purple-50 text-purple-600 text-[9px] font-bold flex items-center gap-0.5" title="Internet">
                <Wifi size={10} /> WIFI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-500 font-mono hidden sm:inline">
              {new Date().toLocaleDateString("id-ID", { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
            
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-bold text-slate-700">LOKET 1 ONLINE</span>
            </div>
          </div>
        </header>

        {/* Primary Page Canvas (View render switcher on activeTab) */}
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto" id="primary-content-canvas">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
            >
              
              {/* RENDER VIEW: BERANDA */}
              {activeTab === "dashboard" && (
                <Dashboard 
                  pelangganList={pelangganList}
                  transaksiList={transaksiList}
                  biayaList={biayaList}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onQuickPayment={handleQuickPaymentRoute}
                />
              )}

              {/* RENDER VIEW: DATA MASTER PELANGGAN */}
              {activeTab === "pelanggan" && (
                <MasterPelanggan 
                  pelangganList={pelangganList}
                  onAddPelanggan={handleAddPelanggan}
                  onUpdatePelanggan={handleUpdatePelanggan}
                  onDeletePelanggan={handleDeletePelanggan}
                />
              )}

              {/* RENDER VIEW: DATA TANGGAL DUE DATES */}
              {activeTab === "tanggal" && (
                <MasterTanggal 
                  tanggalList={tanggalList}
                  onAddTanggal={handleAddTanggal}
                  onUpdateTanggal={handleUpdateTanggal}
                  onDeleteTanggal={handleDeleteTanggal}
                />
              )}

              {/* RENDER VIEW: DATA BIAYA & TARIFS */}
              {activeTab === "biaya" && (
                <MasterBiaya 
                  biayaList={biayaList}
                  onAddBiaya={handleAddBiaya}
                  onUpdateBiaya={handleUpdateBiaya}
                  onDeleteBiaya={handleDeleteBiaya}
                />
              )}

              {/* RENDER VIEW: TRANSAKSI */}
              {activeTab === "transaksi" && (
                <TransaksiView 
                  pelangganList={pelangganList}
                  transaksiList={transaksiList}
                  biayaList={biayaList}
                  onAddTransaksi={handleAddTransaksi}
                  initialSelectedCustomerId={quickPaymentCustomerId}
                  clearInitialSelectedCustomerId={() => setQuickPaymentCustomerId(undefined)}
                />
              )}

              {/* RENDER VIEW: LAPORAN */}
              {activeTab === "laporan" && (
                <LaporanView 
                  pelangganList={pelangganList}
                  transaksiList={transaksiList}
                  biayaList={biayaList}
                />
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </main>

      {/* ==========================================
          SYSTEM RESET CONFIRMATION MODAL OVERLAY
          ========================================== */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 transition-all animate-fadeIn font-sans" id="delete-system-modal">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-rose-100 overflow-hidden transform scale-100 transition-all flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-rose-950 text-white flex justify-between items-center border-b border-rose-900 shrink-0">
              <div className="flex items-center gap-2.5 text-rose-450">
                <AlertTriangle size={20} className="text-rose-500 animate-bounce" />
                <h4 className="text-xs font-black font-mono tracking-wider uppercase">
                  Konfirmasi Tindakan Berbahaya
                </h4>
              </div>
              <button 
                onClick={() => setIsResetModalOpen(false)} 
                className="text-rose-350 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-800">
                  Anda akan menghapus/meriset data aplikasi TagihanPay
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tindakan ini akan mempengaruhi database lokal yang terdaftar pada browser saat ini. Perubahan ini bersifat instan dan permanen.
                </p>
              </div>

              {/* Scope warning list */}
              <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-rose-950 text-xs space-y-1.5">
                <p className="font-bold">Data yang akan terpengaruh:</p>
                <ul className="list-disc pl-5 font-mono text-[10.5px] text-rose-800 space-y-0.5">
                  <li>Data Master Pelanggan (PLN, PDAM, WIFI)</li>
                  <li>Konfigurasi Jatuh Tempo Tanggal Pembayaran</li>
                  <li>Rincian Biaya Tarif Standard / Rumah Tangga</li>
                  <li>Semua Riwayat Transaksi Lunas / Cetak Kwitansi</li>
                </ul>
              </div>

              {/* Options selection description */}
              <div className="grid grid-cols-1 gap-3 pt-1">
                
                {/* Method 1: Back to Default seed */}
                <button
                  onClick={handleResetToDefault}
                  className="p-3.5 border border-slate-200 hover:border-indigo-350 bg-slate-50 hover:bg-slate-100 text-left rounded-xl transition flex gap-3 items-start group cursor-pointer"
                >
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 shrink-0">
                    <RotateCcw size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-850">Metode A: Reset ke Data Demo (Rekomendasi)</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Mengembalikan database ke rincian pelanggan standard, jadwal tempo, & riwayat pembayaran sampel bawaan pabrik.
                    </p>
                  </div>
                </button>

                {/* Method 2: Purge everything clean */}
                <button
                  onClick={handleClearAllData}
                  className="p-3.5 border border-rose-200 hover:border-rose-400 bg-rose-50/10 hover:bg-rose-50/30 text-left rounded-xl transition flex gap-3 items-start group cursor-pointer"
                >
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-100 shrink-0">
                    <Trash2 size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-rose-950">Metode B: Bersihkan / Kosongkan Database (Hard Reset)</h5>
                    <p className="text-[11px] text-rose-600/80 mt-0.5">
                      Menghapus mutlak seluruh record data di dalam sistem. Aplikasi akan bernilai kosong (0 pelanggan, 0 riwayat transaksi).
                    </p>
                  </div>
                </button>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-205 rounded-xl transition cursor-pointer"
              >
                Batal (Simpan Data)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
