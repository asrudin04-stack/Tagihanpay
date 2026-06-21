/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SyncSheetsView React Component to sync data with Google Sheets
 */

import React, { useState, useEffect } from "react";
import { 
  googleSignIn, 
  googleLogOut, 
  initAuth, 
  createSyncSpreadsheet, 
  exportDataToSpreadsheet, 
  importDataFromSpreadsheet,
  getAccessToken
} from "../lib/googleSheets";
import { 
  FileSpreadsheet, 
  RefreshCw, 
  ArrowUpFromLine, 
  ArrowDownToLine, 
  LogOut, 
  Database,
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ShieldAlert,
  Loader2,
  Copy,
  Info
} from "lucide-react";
import { Pelanggan, Transaksi, formatRupiah } from "../types";

interface SyncSheetsViewProps {
  pelangganList: Pelanggan[];
  transaksiList: Transaksi[];
  onImportPelanggan: (newList: Pelanggan[]) => void;
  onImportTransaksi: (newList: Transaksi[]) => void;
}

export default function SyncSheetsView({
  pelangganList,
  transaksiList,
  onImportPelanggan,
  onImportTransaksi
}: SyncSheetsViewProps) {
  
  // State indicators
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Spreadsheet integration state
  const [spreadSheetId, setSpreadSheetId] = useState(() => {
    return localStorage.getItem("tagihanpay_sheet_id") || "";
  });
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem("tagihanpay_last_sync") || null;
  });

  // Notifications
  const [notif, setNotif] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Load auth state
  useEffect(() => {
    const unsub = initAuth(
      (user, retrievedToken) => {
        setIsAuthenticated(true);
        setUserEmail(user.email);
        setDisplayName(user.displayName);
        setToken(retrievedToken);
        setIsLoadingAuth(false);
      },
      () => {
        setIsAuthenticated(false);
        setUserEmail(null);
        setDisplayName(null);
        setToken(null);
        setIsLoadingAuth(false);
      }
    );
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    setIsProcessing(true);
    setNotif(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setIsAuthenticated(true);
        setUserEmail(res.user.email);
        setDisplayName(res.user.displayName);
        setToken(res.accessToken);
        setNotif({ type: "success", message: "Koneksi Google akun berhasil diotorisasi!" });
      }
    } catch (err: any) {
      setNotif({ type: "error", message: "Gagal menghubungkan ke Google: " + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    setIsProcessing(true);
    try {
      await googleLogOut();
      setIsAuthenticated(false);
      setToken(null);
      setNotif({ type: "info", message: "Google account disconnected successfully." });
    } catch (err: any) {
      setNotif({ type: "error", message: "Logout failed: " + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNewSheet = async () => {
    const activeToken = token || getAccessToken();
    if (!activeToken) {
      setNotif({ type: "error", message: "Silakan masuk ke Akun Google Anda terlebih dahulu." });
      return;
    }

    setIsProcessing(true);
    setNotif(null);
    try {
      const newId = await createSyncSpreadsheet(activeToken, "TagihanPay MultiBilling Data Sync");
      setSpreadSheetId(newId);
      localStorage.setItem("tagihanpay_sheet_id", newId);
      setNotif({ type: "success", message: "Spreadsheet baru berhasil dibuat di Google Drive Anda!" });
    } catch (err: any) {
      setNotif({ type: "error", message: "Gagal membuat spreadsheet: " + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportData = async () => {
    const activeToken = token || getAccessToken();
    if (!activeToken) {
      setNotif({ type: "error", message: "Sesi otorisasi Google telah berakhir. Silakan masuk kembali." });
      return;
    }
    if (!spreadSheetId.trim()) {
      setNotif({ type: "error", message: "Masukkan ID Spreadsheet atau buat Spreadsheet baru terlebih dahulu!" });
      return;
    }

    setIsProcessing(true);
    setNotif(null);
    try {
      await exportDataToSpreadsheet(spreadSheetId.trim(), activeToken, pelangganList, transaksiList);
      
      const nowStr = new Date().toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      setLastSyncTime(nowStr);
      localStorage.setItem("tagihanpay_last_sync", nowStr);
      
      setNotif({ 
        type: "success", 
        message: `Sinkronisasi berhasil! ${pelangganList.length} pelanggan dan ${transaksiList.length} riwayat transaksi telah dikirim ke Spreadsheet.` 
      });
    } catch (err: any) {
      setNotif({ type: "error", message: "Gagal mentransfer data ke Google Sheets: " + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportData = async () => {
    const activeToken = token || getAccessToken();
    if (!activeToken) {
      setNotif({ type: "error", message: "Otorisasi Google diperlukan sebelum mengimpor spreadsheets." });
      return;
    }
    if (!spreadSheetId.trim()) {
      setNotif({ type: "error", message: "ID Google Spreadsheet tujuan belum disetel!" });
      return;
    }

    const confirmImport = window.confirm(
      "Apakah Anda yakin ingin MENGIMPOR data dari Google Sheets?\n\nData pelanggan dan tagihan pembayaran yang baru akan digabungkan, dan data dengan ID yang cocok akan ditimpa."
    );
    if (!confirmImport) return;

    setIsProcessing(true);
    setNotif(null);
    try {
      const result = await importDataFromSpreadsheet(spreadSheetId.trim(), activeToken);
      
      if (result.pelanggan.length === 0 && result.transaksi.length === 0) {
        setNotif({ type: "info", message: "Impor dibatalkan: Sheet kosong atau tidak memiliki data baris yang valid." });
        return;
      }

      // Update Parent State
      onImportPelanggan(result.pelanggan);
      onImportTransaksi(result.transaksi);

      const nowStr = new Date().toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      setLastSyncTime(nowStr);
      localStorage.setItem("tagihanpay_last_sync", nowStr);

      setNotif({
        type: "success",
        message: `Berhasil mengimpor ${result.pelanggan.length} data pelanggan dan ${result.transaksi.length} riwayat transaksi baru dari Google Sheets!`
      });
    } catch (err: any) {
      setNotif({ type: "error", message: "Kesalahan saat mengurai Google Sheets: " + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper copy to clipboard
  const handleCopyId = () => {
    if (!spreadSheetId) return;
    navigator.clipboard.writeText(spreadSheetId);
    alert("ID Spreadsheet disalin ke clipboard!");
  };

  // Generate Google Sheets URL
  const sheetUrl = spreadSheetId ? `https://docs.google.com/spreadsheets/d/${spreadSheetId}/edit` : null;

  if (isLoadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4" id="google-sync-loading">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 font-mono">Menghubungkan autentikasi Google Workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl" id="google-sheets-sync-panel">
      
      {/* 1. View Header Layout */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            Integrasi Google cloud
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-2 flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-500" size={22} />
            Sinkronisasi Google Sheets
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Edit dan kelola seluruh riwayat pelanggan serta tagihan digital Anda langsung di spreadsheet cloud.</p>
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 px-3.5 rounded-xl border border-slate-150 self-start md:self-center">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wide">AKUN OTORISASI</p>
              <p className="text-xs font-bold text-slate-800">{displayName || "User Google"}</p>
              <p className="text-[10px] text-slate-500 font-mono leading-none">{userEmail}</p>
            </div>
            
            <button
              onClick={handleLogout}
              disabled={isProcessing}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition flex items-center gap-1.5 text-xs font-bold shrink-0 border border-transparent hover:border-rose-100"
              title="Putuskan Hubungan Akun"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {notif && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 transition animate-fadeIn ${
          notif.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-950" :
          notif.type === "error" ? "bg-rose-50 border-rose-200 text-rose-950" :
          "bg-blue-50 border-blue-200 text-blue-950"
        }`}>
          {notif.type === "success" && <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />}
          {notif.type === "error" && <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />}
          {notif.type === "info" && <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />}
          <div>
            <p className="text-xs font-bold">
              {notif.type === "success" ? "Berhasil" : notif.type === "error" ? "Kesalahan" : "Informasi"}
            </p>
            <p className="text-[11px] opacity-95 mt-0.5 whitespace-pre-line">{notif.message}</p>
          </div>
        </div>
      )}

      {!isAuthenticated ? (
        /* 2. AUTH REQUISITION CARD - Beautiful premium visual block with official-like sign-in */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-8 text-center max-w-xl mx-auto space-y-6" id="g-login-card">
          <div className="inline-flex p-4 bg-indigo-50 text-indigo-650 rounded-full border border-indigo-100">
            <FileSpreadsheet size={32} className="animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-800">Otorisasi Akun Google Sheets</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Untuk mengunggah dan mengimpor data loket, silakan hubungkan sistem dengan akun Google Anda dengan aman. Hak akses terbatas pada scope spreadsheet buatan aplikasi saja.
            </p>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleLogin}
              disabled={isProcessing}
              className="gsi-material-button w-full sm:w-auto relative flex items-center justify-center gap-3 px-6 py-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold tracking-normal transition shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
            >
              <div className="gsi-material-button-icon shrink-0">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-[18px] h-[18px] block">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">Sign in with Google Account</span>
            </button>
          </div>
        </div>
      ) : (
        /* 3. CORE SYNCING MANAGER CONTAINER (Authorized) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="sync-manager-content">
          
          <div className="md:col-span-2 space-y-6">
            
            {/* Spreadsheet bindings setup */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <h3 className="text-xs font-mono font-black uppercase text-indigo-900 tracking-wider">Identitas Google Spreadsheet</h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase block">ID Spreadsheet Terhubung</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={spreadSheetId}
                      onChange={(e) => {
                        setSpreadSheetId(e.target.value);
                        localStorage.setItem("tagihanpay_sheet_id", e.target.value);
                      }}
                      placeholder="Masukkan Google Spreadsheet ID Anda di sini"
                      className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600 text-slate-800 font-mono font-medium"
                    />
                    
                    {spreadSheetId && (
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="px-3.5 hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 cursor-pointer transition flex items-center justify-center shrink-0"
                        title="Salin ID"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 items-center justify-between">
                  <button
                    type="button"
                    onClick={handleCreateNewSheet}
                    disabled={isProcessing}
                    className="px-3.5 py-2 hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-300 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
                  >
                    <FileSpreadsheet size={13.5} />
                    Buat Spreadsheet Otomatis Baru
                  </button>

                  {sheetUrl && (
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
                    >
                      Buka Google Sheet <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Sync trigger button panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <h3 className="text-xs font-mono font-black uppercase text-indigo-900 tracking-wider">Aksi Penyinkronan Loket</h3>
                <span className="text-[10px] text-slate-400 font-bold font-mono">
                  SINKRONISASI 2 ARAH (BI-DIRECTIONAL)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* EXPORT PANEL */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ArrowUpFromLine size={14} className="text-indigo-650" />
                      Ekspor ke Google Sheets
                    </h4>
                    <p className="text-[10.5px] text-slate-500 mt-1 leading-normal">
                      Kirim seluruh data pelanggan ({pelangganList.length} baris) dan transaksi ({transaksiList.length} baris) dari memori lokal sistem loket Anda saat ini ke Spreadsheet.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleExportData}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {isProcessing ? (
                      <Loader2 size={13.5} className="animate-spin" />
                    ) : (
                      <ArrowUpFromLine size={13.5} />
                    )}
                    Sinkron & Ekspor Sekarang
                  </button>
                </div>

                {/* IMPORT PANEL */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ArrowDownToLine size={14} className="text-emerald-650" />
                      Impor dari Google Sheets
                    </h4>
                    <p className="text-[10.5px] text-slate-500 mt-1 leading-normal">
                      Unduh records dari file Spreadsheet terhubung, divalidasi, dan ditambahkan ke database lokal aplikasi. Data ID baris yang sama akan ditimpa.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleImportData}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {isProcessing ? (
                      <Loader2 size={13.5} className="animate-spin" />
                    ) : (
                      <ArrowDownToLine size={13.5} />
                    )}
                    Tarik & Impor Sekarang
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* Sync status and side instructions */}
          <div className="space-y-6">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
              <h4 className="text-xs font-mono font-black uppercase text-indigo-900 tracking-wider">Status Sinkronisasi</h4>
              
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Status Google:</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 text-[10px]">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    TERHUBUNG
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Tujuan File:</span>
                  <span className="font-bold text-slate-700 max-w-[130px] truncate">
                    {spreadSheetId ? "Sheets Ditautkan" : "Belum Ditautkan"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Terakhir Sync:</span>
                  <span className="font-mono text-slate-650 font-semibold text-[10.5px] text-right">
                    {lastSyncTime || "Belum Pernah"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-amber-600" />
                Panduan Kolom / Tata Aturan
              </h4>
              <p className="text-[10.5px] text-amber-900/90 leading-relaxed font-semibold">
                Jika Anda mengedit / menambahkan data langsung di spreadsheet Google, pastikan mengikuti format kolom berikut:
              </p>
              
              <div className="space-y-3 text-[10px] text-slate-600 font-sans">
                <div className="space-y-1">
                  <p className="font-bold text-amber-950">Tab: Pelanggan</p>
                  <p className="font-semibold bg-white p-1 rounded-md border border-slate-200/65 overflow-x-auto whitespace-nowrap font-mono text-[9px]">
                    ID Pelanggan | Nama Pelanggan | No Telepon | Alamat Rumah | Layanan (PLN/PDAM/WIFI) | No Meter
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-amber-950">Tab: Transaksi</p>
                  <p className="font-semibold bg-white p-1 rounded-md border border-slate-200/65 overflow-x-auto whitespace-nowrap font-mono text-[9px]">
                    ID Transaksi | ID Pelanggan | Nama Pelanggan | Layanan | Periode | Jumlah Bayar | Metode Pembayaran | Tanggal Bayar | Keterangan | Nomor Referensi
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
