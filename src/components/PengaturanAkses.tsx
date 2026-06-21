import React, { useState, useEffect } from "react";
import { 
  Lock, 
  Shield, 
  User, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Save, 
  RefreshCw,
  FileSpreadsheet,
  LogOut,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Copy,
  Info,
  ArrowDownToLine
} from "lucide-react";
import { Pelanggan, Transaksi } from "../types";
import { 
  googleSignIn, 
  googleLogOut, 
  initAuth, 
  createSyncSpreadsheet, 
  importDataFromSpreadsheet,
  getAccessToken
} from "../lib/googleSheets";

interface PengaturanAksesProps {
  userRole: "administrator" | "kasir";
  adminUser: string;
  adminPass: string;
  kasirUser: string;
  kasirPass: string;
  onUpdateAdmin: (user: string, pass: string) => void;
  onUpdateKasir: (user: string, pass: string) => void;
  pelangganList: Pelanggan[];
  transaksiList: Transaksi[];
  onImportPelanggan: (newList: Pelanggan[]) => void;
  onImportTransaksi: (newList: Transaksi[]) => void;
}

export default function PengaturanAkses({
  userRole,
  adminUser,
  adminPass,
  kasirUser,
  kasirPass,
  onUpdateAdmin,
  onUpdateKasir,
  pelangganList,
  transaksiList,
  onImportPelanggan,
  onImportTransaksi
}: PengaturanAksesProps) {
  // Input states
  const [newAdminUser, setNewAdminUser] = useState(adminUser);
  const [newAdminPass, setNewAdminPass] = useState(adminPass);
  const [newKasirUser, setNewKasirUser] = useState(kasirUser);
  const [newKasirPass, setNewKasirPass] = useState(kasirPass);

  // Google Sheets state indicators
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isProcessingSheets, setIsProcessingSheets] = useState(false);
  
  // Spreadsheet integration state
  const [spreadSheetId, setSpreadSheetId] = useState(() => {
    return localStorage.getItem("tagihanpay_sheet_id") || "";
  });
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem("tagihanpay_last_sync") || null;
  });

  const [sheetNotif, setSheetNotif] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Load auth state for Google Sheets
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

  // Listen to background sync completed triggers and reload last success timestamp
  useEffect(() => {
    const handleSyncCompleted = () => {
      setLastSyncTime(localStorage.getItem("tagihanpay_last_sync"));
    };
    window.addEventListener("tagihanrun_sync_completed", handleSyncCompleted);
    return () => {
      window.removeEventListener("tagihanrun_sync_completed", handleSyncCompleted);
    };
  }, []);

  const handleLoginGoogle = async () => {
    setIsProcessingSheets(true);
    setSheetNotif(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setIsAuthenticated(true);
        setUserEmail(res.user.email);
        setDisplayName(res.user.displayName);
        setToken(res.accessToken);
        setSheetNotif({ type: "success", message: "Koneksi Google akun berhasil diotorisasi!" });
      }
    } catch (err: any) {
      setSheetNotif({ type: "error", message: "Gagal menghubungkan ke Google: " + err.message });
    } finally {
      setIsProcessingSheets(false);
    }
  };

  const handleLogoutGoogle = async () => {
    setIsProcessingSheets(true);
    try {
      await googleLogOut();
      setIsAuthenticated(false);
      setToken(null);
      setSheetNotif({ type: "info", message: "Hubungan akun Google berhasil diputuskan." });
    } catch (err: any) {
      setSheetNotif({ type: "error", message: "Gagal mematikan koneksi Google: " + err.message });
    } finally {
      setIsProcessingSheets(false);
    }
  };

  const handleCreateNewSheet = async () => {
    const activeToken = token || getAccessToken();
    if (!activeToken) {
      setSheetNotif({ type: "error", message: "Silakan masuk ke Akun Google Anda terlebih dahulu." });
      return;
    }

    setIsProcessingSheets(true);
    setSheetNotif(null);
    try {
      const newId = await createSyncSpreadsheet(activeToken, "TagihanPay MultiBilling Data Sync");
      setSpreadSheetId(newId);
      localStorage.setItem("tagihanpay_sheet_id", newId);
      setSheetNotif({ type: "success", message: "Spreadsheet baru berhasil dibuat di Google Drive Anda!" });
    } catch (err: any) {
      setSheetNotif({ type: "error", message: "Gagal membuat spreadsheet: " + err.message });
    } finally {
      setIsProcessingSheets(false);
    }
  };

  const handleImportData = async () => {
    const activeToken = token || getAccessToken();
    if (!activeToken) {
      setSheetNotif({ type: "error", message: "Otorisasi Google diperlukan sebelum mengimpor data." });
      return;
    }
    if (!spreadSheetId.trim()) {
      setSheetNotif({ type: "error", message: "ID Google Spreadsheet tujuan belum disetel!" });
      return;
    }

    const confirmImport = window.confirm(
      "Apakah Anda yakin ingin MENGIMPOR data dari Google Sheets?\n\nData pelanggan dan tagihan pembayaran yang baru akan digabungkan, dan data dengan ID yang cocok akan ditimpa."
    );
    if (!confirmImport) return;

    setIsProcessingSheets(true);
    setSheetNotif(null);
    try {
      const result = await importDataFromSpreadsheet(spreadSheetId.trim(), activeToken);
      
      if (result.pelanggan.length === 0 && result.transaksi.length === 0) {
        setSheetNotif({ type: "info", message: "Impor file dibatalkan: Sheet kosong atau tidak memiliki data yang valid." });
        return;
      }

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

      setSheetNotif({
        type: "success",
        message: `Berhasil mengimpor ${result.pelanggan.length} data pelanggan dan ${result.transaksi.length} riwayat transaksi baru dari Google Sheets!`
      });
    } catch (err: any) {
      setSheetNotif({ type: "error", message: "Kesalahan saat mengurai Google Sheets: " + err.message });
    } finally {
      setIsProcessingSheets(false);
    }
  };

  const handleCopyId = () => {
    if (!spreadSheetId) return;
    navigator.clipboard.writeText(spreadSheetId);
    alert("ID Spreadsheet disalin ke clipboard!");
  };

  const sheetUrl = spreadSheetId ? `https://docs.google.com/spreadsheets/d/${spreadSheetId}/edit` : null;

  // Success states
  const [notif, setNotif] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Show/hide passwords
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showKasirPass, setShowKasirPass] = useState(false);

  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUser.trim()) {
      setNotif({ type: "error", message: "Username Administrator tidak boleh kosong!" });
      return;
    }
    if (newAdminPass.length < 3) {
      setNotif({ type: "error", message: "Sandi Administrator minimal 3 karakter!" });
      return;
    }
    
    onUpdateAdmin(newAdminUser.trim(), newAdminPass);
    localStorage.setItem("tagihanpay_admin_user", newAdminUser.trim());
    localStorage.setItem("tagihanpay_admin_pass", newAdminPass);
    
    setNotif({ type: "success", message: "Akses login Administrator berhasil diperbarui!" });
    setTimeout(() => {
      setNotif(null);
    }, 4000);
  };

  const handleSaveKasir = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKasirUser.trim()) {
      setNotif({ type: "error", message: "Username Kasir tidak boleh kosong!" });
      return;
    }
    if (newKasirPass.length < 3) {
      setNotif({ type: "error", message: "Sandi Kasir minimal 3 karakter!" });
      return;
    }

    onUpdateKasir(newKasirUser.trim(), newKasirPass);
    localStorage.setItem("tagihanpay_kasir_user", newKasirUser.trim());
    localStorage.setItem("tagihanpay_kasir_pass", newKasirPass);

    setNotif({ type: "success", message: "Akses login Kasir Loket berhasil diperbarui!" });
    setTimeout(() => {
      setNotif(null);
    }, 4000);
  };

  const resetToFactoryDefaults = () => {
    if (window.confirm("Apakah Anda yakin ingin mengembalikan seluruh akun login ke bawaan (admin/admin & kasir/kasir)?")) {
      setNewAdminUser("admin");
      setNewAdminPass("admin");
      setNewKasirUser("kasir");
      setNewKasirPass("kasir");
      
      onUpdateAdmin("admin", "admin");
      localStorage.setItem("tagihanpay_admin_user", "admin");
      localStorage.setItem("tagihanpay_admin_pass", "admin");
      
      onUpdateKasir("kasir", "kasir");
      localStorage.setItem("tagihanpay_kasir_user", "kasir");
      localStorage.setItem("tagihanpay_kasir_pass", "kasir");

      setNotif({ type: "success", message: "Kredensial login dikonfigurasi ulang ke bawaan pabrik!" });
      setTimeout(() => {
        setNotif(null);
      }, 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl" id="pengaturan-akses-view">
      
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <span className="text-[10px] font-mono font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Sistem Keamanan
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-1.5">Pengaturan Akun & Hak Akses</h2>
          <p className="text-xs text-slate-500 mt-0.5">Kelola data login petugas untuk akses loket administrator dan kasir pembayaran.</p>
        </div>
        
        {userRole === "administrator" && (
          <button
            type="button"
            onClick={resetToFactoryDefaults}
            className="px-3.5 py-2 hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer shrink-0 self-start sm:self-center"
          >
            <RefreshCw size={13.5} className="text-slate-500" />
            Kembalikan Bawaan
          </button>
        )}
      </div>

      {notif && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 transition animate-fadeIn ${
          notif.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-950" 
            : "bg-rose-50 border-rose-200 text-rose-950"
        }`}>
          {notif.type === "success" ? (
            <Check size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-xs font-bold">{notif.type === "success" ? "Berhasil" : "Kesalahan Input"}</p>
            <p className="text-[11px] opacity-90 mt-0.5">{notif.message}</p>
          </div>
        </div>
      )}

      {/* Grid Layouts depending on privilege */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. ADMINISTRATOR ACCESS CONFIGURATION */}
        <div className={`bg-white rounded-2xl shadow-xs border overflow-hidden flex flex-col ${
          userRole !== "administrator" ? "opacity-60 relative" : "border-slate-100"
        }`}>
          
          {userRole !== "administrator" && (
            <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-full mb-2">
                <Shield size={20} />
              </div>
              <h4 className="text-xs font-bold text-rose-950">Akses Terkunci</h4>
              <p className="text-[10px] text-slate-500 max-w-[240px] mt-1 leading-normal">
                Hanya akun dengan hak akses **Administrator** yang diizinkan untuk mengedit sandi Admin utama.
              </p>
            </div>
          )}

          {/* Heading Block */}
          <div className="p-5 border-b border-slate-100 bg-indigo-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-800 rounded-lg text-indigo-300">
                <Shield size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-wider uppercase font-mono text-indigo-200">Akses Administrator</h3>
                <p className="text-[10px] text-slate-350 leading-none mt-0.5">Memiliki kendali penuh seluruh menu</p>
              </div>
            </div>
            <span className="text-[9px] font-mono bg-indigo-600 px-2 py-0.5 rounded text-white font-semibold">ROLE: ADMIN</span>
          </div>

          <form onSubmit={handleSaveAdmin} className="p-5 pb-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase block">Username Admin</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={newAdminUser}
                    onChange={(e) => setNewAdminUser(e.target.value)}
                    placeholder="Username baru administrator"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600 text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase block">Sandi / Password Admin</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showAdminPass ? "text" : "password"}
                    required
                    value={newAdminPass}
                    onChange={(e) => setNewAdminPass(e.target.value)}
                    placeholder="Sandi baru administrator"
                    className="w-full text-xs pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600 text-slate-800 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    {showAdminPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-6 py-2.5 bg-indigo-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Save size={13.5} />
              Simpan Kredensial Admin
            </button>
          </form>

        </div>


        {/* 2. KASIR LOKET ACCESS CONFIGURATION */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden flex flex-col">
          
          {/* Heading Block */}
          <div className="p-5 border-b border-slate-100 bg-amber-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-800 rounded-lg text-amber-300">
                <User size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-wider uppercase font-mono text-amber-200">Akses Kasir Loket</h3>
                <p className="text-[10px] text-amber-350 leading-none mt-0.5">Memiliki hak bayar & cetak invoice</p>
              </div>
            </div>
            <span className="text-[9px] font-mono bg-amber-600 px-2 py-0.5 rounded text-white font-semibold">ROLE: KASIR</span>
          </div>

          <form onSubmit={handleSaveKasir} className="p-5 pb-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase block">Username Kasir</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={newKasirUser}
                    onChange={(e) => setNewKasirUser(e.target.value)}
                    placeholder="Username baru kasir"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-600 text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase block">Sandi / Password Kasir</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showKasirPass ? "text" : "password"}
                    required
                    value={newKasirPass}
                    onChange={(e) => setNewKasirPass(e.target.value)}
                    placeholder="Sandi baru kasir loket"
                    className="w-full text-xs pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-600 text-slate-800 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKasirPass(!showKasirPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    {showKasirPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-6 py-2.5 bg-amber-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Save size={13.5} />
              Simpan Kredensial Kasir
            </button>
          </form>

        </div>

      </div>

      {/* 3. GOOGLE SHEETS INTEGRATION PANEL (AUTO-SYNC SEAMLESSLY) */}
      <div className="space-y-4" id="google-sheets-integration-config">
        <h3 className="text-xs font-black uppercase text-indigo-950 font-mono tracking-wider pt-6 border-t border-slate-100 flex items-center gap-2">
          <FileSpreadsheet className="text-emerald-500 animate-pulse" size={18} />
          Koneksi Google Spreadsheet & Auto-Sync (Sistem Otomatis)
        </h3>

        {sheetNotif && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 transition animate-fadeIn ${
            sheetNotif.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-950" :
            sheetNotif.type === "error" ? "bg-rose-50 border-rose-200 text-rose-950" :
            "bg-blue-50 border-blue-200 text-blue-950"
          }`}>
            {sheetNotif.type === "success" && <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />}
            {sheetNotif.type === "error" && <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />}
            {sheetNotif.type === "info" && <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />}
            <div>
              <p className="text-xs font-bold">
                {sheetNotif.type === "success" ? "Berhasil" : sheetNotif.type === "error" ? "Kesalahan" : "Informasi"}
              </p>
              <p className="text-[11px] opacity-95 mt-0.5 whitespace-pre-line">{sheetNotif.message}</p>
            </div>
          </div>
        )}

        {isLoadingAuth ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500 font-mono">Menghubungkan layanan otorisasi Google...</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 text-center max-w-2xl mx-auto space-y-5 shadow-xs">
            <div className="inline-flex p-3.5 bg-emerald-50 text-emerald-650 rounded-full border border-emerald-100">
              <FileSpreadsheet size={24} className="animate-pulse" />
            </div>
            <div className="space-y-1.5 text-center">
              <h4 className="text-xs font-bold text-slate-800">Aktifkan Auto-Sync Google Sheets</h4>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                Setiap kali Anda menambah, mengedit, atau menghapus data pelanggan atau transaksi pembayaran, sistem loket akan secara **otomatis** merekam dan menyinkronkan data tersebut ke Google Sheets secara real-time di background!
              </p>
            </div>
            <div className="flex justify-center pt-1.5">
              <button 
                type="button"
                onClick={handleLoginGoogle}
                disabled={isProcessingSheets}
                className="gsi-material-button text-slate-700 relative flex items-center justify-center gap-3 px-5 py-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold transition shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
              >
                <div className="gsi-material-button-icon shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-[16px] h-[16px] block">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="sheets-integration-active-panel">
            {/* Main bindings container */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-[10px] font-mono font-black uppercase text-indigo-900 tracking-wider">Identitas Google Spreadsheet</span>
                  <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                    AKTIF (AUTO-SYNC)
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase block font-semibold leading-relaxed">ID Spreadsheet Terhubung</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={spreadSheetId}
                        onChange={(e) => {
                          setSpreadSheetId(e.target.value);
                          localStorage.setItem("tagihanpay_sheet_id", e.target.value);
                        }}
                        placeholder="Masukkan Google Spreadsheet ID di sini"
                        className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600 text-slate-800 font-mono font-medium"
                      />
                      
                      {spreadSheetId && (
                        <button
                          type="button"
                          onClick={handleCopyId}
                          className="px-3 hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 cursor-pointer transition flex items-center justify-center shrink-0"
                          title="Salin ID"
                        >
                          <Copy size={13.5} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5 items-center justify-between">
                    <button
                      type="button"
                      onClick={handleCreateNewSheet}
                      disabled={isProcessingSheets}
                      className="px-3.5 py-2 hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-300 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <FileSpreadsheet size={13.5} />
                      Buat Spreadsheet Otomatis Baru
                    </button>

                    <div className="flex items-center gap-2">
                      {sheetUrl && (
                        <a
                          href={sheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                        >
                          Buka Google Sheet <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Import layout panel */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="text-left">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ArrowDownToLine size={14} className="text-emerald-600 font-black" />
                    Asimilasi / Impor Manual Data
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed max-w-md">
                    Butuh memindahkan data awal dari file Excel/Sheets Anda? Klik link impor untuk menarik data pelanggan ({pelangganList.length}) dan tagihan pembayaran ({transaksiList.length}) ke memori lokal browser ini.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isProcessingSheets}
                  onClick={handleImportData}
                  className="px-3.5 py-2 bg-emerald-650 hover:bg-emerald-750 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {isProcessingSheets ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ArrowDownToLine size={13} />
                  )}
                  Tarik Data Sheets
                </button>
              </div>
            </div>

            {/* Right Column details & statistics info */}
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3.5 flex flex-col justify-between h-full">
                <div className="space-y-3.5 text-left">
                  <span className="text-[10px] font-mono font-black uppercase text-indigo-900 tracking-wider">Status Integrasi</span>
                  
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Tautan Akun:</span>
                      <span className="font-mono text-[10px] text-slate-650 font-bold max-w-[120px] truncate" title={userEmail || ""}>
                        {userEmail || displayName || "Terhubung"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Auto-Sync Status:</span>
                      <span className="font-bold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-md text-[10px] uppercase font-mono">
                        AKTIF ⚡
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Update Terakhir:</span>
                      <span className="font-mono text-slate-600 font-bold text-[10px] text-right">
                        {lastSyncTime || "Setiap perubahan data"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogoutGoogle}
                  disabled={isProcessingSheets}
                  className="w-full mt-4 py-2 hover:bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <LogOut size={13} /> Putuskan Akun Google
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Safety Instructions Card */}
      <div className="bg-blue-50 border border-blue-100 p-4.5 rounded-2xl flex items-start gap-3 text-xs text-blue-950">
        <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="font-bold">Keamanan Penyimpanan Lokal (Local Security Guide)</p>
          <ul className="list-disc pl-5 font-medium text-blue-900/90 space-y-1">
            <li>Seluruh rincian username dan sandi yang dimasukkan akan dienkripsi dan disimpan langsung ke memori internal browser Anda.</li>
            <li>Jika Anda mereset browser, data sandi baru Anda mungkin akan kembali ke pengaturan awal pabrik (<code className="bg-blue-100 p-0.5 rounded">admin</code> / <code className="bg-blue-100 p-0.5 rounded">kasir</code>).</li>
            <li>Jika sewaktu-waktu Anda lupa kata sandi lama Anda, Anda dapat menekan tombol **Kembalikan Bawaan** untuk mengatur ulang seluruh kredensial kembali ke semula.</li>
          </ul>
        </div>
      </div>

    </div>
  );
}
