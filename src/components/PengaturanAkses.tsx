import React, { useState } from "react";
import { 
  Lock, 
  Shield, 
  User, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Save, 
  RefreshCw 
} from "lucide-react";

interface PengaturanAksesProps {
  userRole: "administrator" | "kasir";
  adminUser: string;
  adminPass: string;
  kasirUser: string;
  kasirPass: string;
  onUpdateAdmin: (user: string, pass: string) => void;
  onUpdateKasir: (user: string, pass: string) => void;
}

export default function PengaturanAkses({
  userRole,
  adminUser,
  adminPass,
  kasirUser,
  kasirPass,
  onUpdateAdmin,
  onUpdateKasir
}: PengaturanAksesProps) {
  // Input states
  const [newAdminUser, setNewAdminUser] = useState(adminUser);
  const [newAdminPass, setNewAdminPass] = useState(adminPass);
  const [newKasirUser, setNewKasirUser] = useState(kasirUser);
  const [newKasirPass, setNewKasirPass] = useState(kasirPass);

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
