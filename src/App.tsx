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
  AlertTriangle,
  Shield,
  LogIn,
  LogOut,
  Lock,
  FileSpreadsheet
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
import PengaturanAkses from "./components/PengaturanAkses";
import { exportDataToSpreadsheet, getAccessToken } from "./lib/googleSheets";

export default function App() {
  
  // Real-time synchronization state
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [tanggalList, setTanggalList] = useState<TanggalPembayaran[]>([]);
  const [biayaList, setBiayaList] = useState<BiayaTarif[]>([]);
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [isInitialLoadFinished, setIsInitialLoadFinished] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Clear syncError when auth changes
  useEffect(() => {
    const handleAuthChanged = () => {
      setSyncError(null);
    };
    window.addEventListener("tagihanpay_google_auth_changed", handleAuthChanged);
    return () => {
      window.removeEventListener("tagihanpay_google_auth_changed", handleAuthChanged);
    };
  }, []);

  // Navigation: active main view tab state
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // User Authenticated Role Session
  const [userRole, setUserRole] = useState<"administrator" | "kasir" | null>(() => {
    const saved = localStorage.getItem("tagihanpay_role");
    return (saved as "administrator" | "kasir" | null) || null;
  });
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [adminUserCred, setAdminUserCred] = useState(() => {
    return localStorage.getItem("tagihanpay_admin_user") || "admin";
  });
  const [adminPassCred, setAdminPassCred] = useState(() => {
    return localStorage.getItem("tagihanpay_admin_pass") || "admin";
  });
  const [kasirUserCred, setKasirUserCred] = useState(() => {
    return localStorage.getItem("tagihanpay_kasir_user") || "kasir";
  });
  const [kasirPassCred, setKasirPassCred] = useState(() => {
    return localStorage.getItem("tagihanpay_kasir_pass") || "kasir";
  });

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError("");

    const trimmedUser = loginUsername.trim().toLowerCase();
    const trimmedPass = loginPassword;

    if (trimmedUser === adminUserCred.toLowerCase() && trimmedPass === adminPassCred) {
      setUserRole("administrator");
      localStorage.setItem("tagihanpay_role", "administrator");
      setActiveTab("dashboard");
    } else if (trimmedUser === kasirUserCred.toLowerCase() && trimmedPass === kasirPassCred) {
      setUserRole("kasir");
      localStorage.setItem("tagihanpay_role", "kasir");
      setActiveTab("dashboard");
    } else {
      setLoginError("Maaf, kombinasi Username atau Password salah.");
    }
  };

  const handleBypassLogin = (role: "administrator" | "kasir") => {
    setUserRole(role);
    localStorage.setItem("tagihanpay_role", role);
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    setUserRole(null);
    localStorage.removeItem("tagihanpay_role");
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
  };

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
    setIsInitialLoadFinished(true);
  }, []);

  // Auto-sync effect to run in background whenever database is changed
  useEffect(() => {
    if (!isInitialLoadFinished) return;

    const activeToken = getAccessToken();
    const spreadSheetId = localStorage.getItem("tagihanpay_sheet_id");
    if (activeToken && spreadSheetId) {
      exportDataToSpreadsheet(spreadSheetId, activeToken, pelangganList, transaksiList)
        .then(() => {
          const nowStr = new Date().toLocaleString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          });
          localStorage.setItem("tagihanpay_last_sync", nowStr);
          setSyncError(null);
          // Let settings component learn about new sync instantly
          window.dispatchEvent(new Event("tagihanrun_sync_completed"));
        })
        .catch(err => {
          console.error("Auto sheet sync triggered, background error: ", err);
          setSyncError(err.message || String(err));
        });
    }
  }, [pelangganList, transaksiList, isInitialLoadFinished]);

  // --- CRUD DISPATCHERS SYNCS ---

  // Google Sheets import mergers
  const handleImportPelanggan = (imported: Pelanggan[]) => {
    setPelangganList(prev => {
      const merged = [...prev];
      imported.forEach(newItem => {
        const index = merged.findIndex(p => p.id === newItem.id);
        if (index > -1) {
          merged[index] = newItem;
        } else {
          merged.push(newItem);
        }
      });
      localStorage.setItem("pembayaran_pelanggan", JSON.stringify(merged));
      return merged;
    });
  };

  const handleImportTransaksi = (imported: Transaksi[]) => {
    setTransaksiList(prev => {
      const merged = [...prev];
      imported.forEach(newItem => {
        const index = merged.findIndex(t => t.id === newItem.id);
        if (index > -1) {
          merged[index] = newItem;
        } else {
          merged.push(newItem);
        }
      });
      localStorage.setItem("pembayaran_transaksi", JSON.stringify(merged));
      return merged;
    });
  };

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

  if (userRole === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden" id="login-screen-root">
        
        {/* Decorative Grid / Ornaments */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-slate-900 to-slate-950 -z-10"></div>
        <div className="absolute -top-1/4 -left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md space-y-6 relative z-10">
          
          {/* Logo Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/30 animate-pulse">
              <CreditCard size={32} />
            </div>
            <h1 className="text-xl font-mono font-black uppercase tracking-widest text-white leading-none">
              TagihanPay
            </h1>
            <p className="text-[11px] font-sans font-bold text-slate-400">Digital Billing & Loket Pembayaran</p>
          </div>

          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-200/50 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-slate-800">Silakan Masuk ke Loket</h2>
              <p className="text-xs text-slate-400 font-medium">Gunakan kredensial yang valid atau tombol masuk cepat di bawah</p>
            </div>

            {loginError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider font-semibold text-slate-500 uppercase block">Username</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Users size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: admin atau kasir"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-hidden focus:border-indigo-600 text-slate-800 transition placeholder-slate-400 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider font-semibold text-slate-500 uppercase block">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock size={14} />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="Ketikan password..."
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-hidden focus:border-indigo-600 text-slate-800 transition placeholder-slate-400 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn size={14} />
                Masuk ke Aplikasi
              </button>
            </form>

            {/* Separator */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 font-mono">TOMBOL BYPASS CEPAT</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Preset Bypass Access Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleBypassLogin("administrator")}
                className="p-3 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-100 rounded-xl text-center group transition cursor-pointer flex flex-col items-center justify-center gap-1"
              >
                <Shield size={16} className="text-indigo-600 group-hover:scale-110 transition" />
                <span className="text-[10px] font-extrabold text-indigo-950 block leading-tight">ADMINISTRATOR</span>
                <span className="text-[8px] font-semibold text-indigo-600/75 block font-mono">Akses Semua Fitur</span>
              </button>

              <button
                type="button"
                onClick={() => handleBypassLogin("kasir")}
                className="p-3 bg-amber-50/70 hover:bg-amber-100 border border-amber-100 rounded-xl text-center group transition cursor-pointer flex flex-col items-center justify-center gap-1"
              >
                <Users size={16} className="text-amber-600 group-hover:scale-110 transition" />
                <span className="text-[10px] font-extrabold text-amber-950 block leading-tight">KASIR LOKET</span>
                <span className="text-[8px] font-semibold text-amber-600/75 block font-mono">Akses Pembayaran</span>
              </button>
            </div>

          </div>

          {/* Help Banner Details */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-center text-[10px] text-slate-400 font-mono tracking-wide">
            💡 <span className="font-bold text-slate-300">Informasi Akun Demo:</span><br/>
            • Administrator: user <code className="text-indigo-300 font-bold bg-slate-900 px-1 rounded-sm">{adminUserCred}</code> sandi <code className="text-indigo-300 font-bold bg-slate-900 px-1 rounded-sm">{adminPassCred}</code><br/>
            • Kasir Loket: user <code className="text-amber-300 font-bold bg-slate-900 px-1 rounded-sm">{kasirUserCred}</code> sandi <code className="text-amber-300 font-bold bg-slate-900 px-1 rounded-sm">{kasirPassCred}</code>
          </div>

        </div>
      </div>
    );
  }

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

            {/* Master Data Subsection (Only for Administrator) */}
            {userRole === "administrator" && (
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
            )}

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

            {/* Account Settings Subsection */}
            <div className="space-y-1.5">
              <span className="px-3 text-[9px] uppercase font-mono tracking-wider text-slate-500 font-bold">AKSES & INTEGRASI</span>
              
              <button
                onClick={() => setActiveTab("pengaturan")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  activeTab === "pengaturan"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Lock size={15} />
                Pengaturan & Integrasi
              </button>
            </div>

            {/* Danger Zone Utilities (Only for Administrator) */}
            {userRole === "administrator" && (
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
            )}

          </div>

        </div>

        {/* Workspace Footer Signature */}
        <div className="p-4 border-t border-slate-800 space-y-3.5 text-[10px] text-slate-500 font-mono">
          <div>
            <p className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Role: <span className="text-slate-200 font-bold uppercase">{userRole}</span>
            </p>
            <p className="mt-0.5">Petugas: <span className="text-slate-350">{userRole === "administrator" ? "Admin Utama" : "Asrudin (Kasir)"}</span></p>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-white rounded-xl transition cursor-pointer text-[10.5px] font-bold"
          >
            <LogOut size={12} />
            Keluar Loket
          </button>
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

              {userRole === "administrator" && (
                <>
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
                </>
              )}

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
                onClick={() => { setActiveTab("pengaturan"); setIsMobileMenuOpen(false); }}
                className={`py-2 px-3 text-xs font-bold rounded-lg text-left flex items-center gap-2.5 ${
                  activeTab === "pengaturan" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-850"
                }`}
              >
                <Lock size={15} /> Pengaturan & Integrasi
              </button>

              {userRole === "administrator" && (
                <button
                  onClick={() => { setIsResetModalOpen(true); setIsMobileMenuOpen(false); }}
                  className="py-2 px-3 text-xs font-bold rounded-lg text-left flex items-center gap-2.5 text-rose-450 hover:bg-rose-955/20 border-t border-slate-800/85 pt-3 mt-1"
                >
                  <RotateCcw size={15} className="text-rose-500 animate-pulse" /> Reset & Hapus Data
                </button>
              )}

              <button
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                className="py-2 px-3 text-xs font-black rounded-lg text-left flex items-center gap-2.5 text-rose-400 hover:bg-rose-950/40 border-t border-slate-800/80 pt-3 mt-1 uppercase font-mono"
              >
                <LogOut size={15} className="text-rose-400" /> Keluar Loket ({userRole === "administrator" ? "ADMIN" : "KASIR"})
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

          <div className="flex items-center gap-3 md:gap-4 text-xs">
            {/* Active User Session Badge */}
            <div className={`p-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1.5 ${
              userRole === "administrator" 
                ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                : "bg-amber-50 text-amber-700 border border-amber-100"
            }`}>
              <Shield size={11} className={userRole === "administrator" ? "text-indigo-600" : "text-amber-600"} />
              {userRole}
            </div>

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
          {syncError && (
            <div className="mb-6 p-4 rounded-xl border border-rose-100 bg-rose-50 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn" id="google-sheets-sync-error-banner">
              <div className="flex items-start gap-3 text-left">
                <AlertTriangle className="text-rose-600 shrink-0 mt-0.5 animate-bounce" size={18} />
                <div>
                  <p className="text-xs font-bold">Sinkronisasi Google Sheets Terhenti</p>
                  <p className="text-[11px] opacity-90 mt-0.5">{syncError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("pengaturan");
                  setSyncError(null);
                }}
                className="px-3.5 py-1.5 bg-rose-650 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition shrink-0 select-none cursor-pointer self-start sm:self-center"
              >
                Otorisasi Ulang Akun
              </button>
            </div>
          )}

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

              {/* RENDER VIEW: PENGATURAN AKSES & INTEGRASI */}
              {activeTab === "pengaturan" && (
                <PengaturanAkses 
                  userRole={userRole!}
                  adminUser={adminUserCred}
                  adminPass={adminPassCred}
                  kasirUser={kasirUserCred}
                  kasirPass={kasirPassCred}
                  onUpdateAdmin={(u, p) => {
                    setAdminUserCred(u);
                    setAdminPassCred(p);
                  }}
                  onUpdateKasir={(u, p) => {
                    setKasirUserCred(u);
                    setKasirPassCred(p);
                  }}
                  pelangganList={pelangganList}
                  transaksiList={transaksiList}
                  onImportPelanggan={handleImportPelanggan}
                  onImportTransaksi={handleImportTransaksi}
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
