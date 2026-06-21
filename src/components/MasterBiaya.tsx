/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  DollarSign, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Zap,
  Droplet,
  Wifi,
  Tag
} from "lucide-react";
import { BiayaTarif, formatRupiah } from "../types";

interface MasterBiayaProps {
  biayaList: BiayaTarif[];
  onAddBiaya: (biaya: BiayaTarif) => void;
  onUpdateBiaya: (biaya: BiayaTarif) => void;
  onDeleteBiaya: (id: string) => void;
}

export default function MasterBiaya({
  biayaList,
  onAddBiaya,
  onUpdateBiaya,
  onDeleteBiaya
}: MasterBiayaProps) {

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBiaya, setEditingBiaya] = useState<BiayaTarif | null>(null);

  // Form states
  const [layanan, setLayanan] = useState<'PLN' | 'PDAM' | 'WIFI'>("PLN");
  const [namaPaket, setNamaPaket] = useState("");
  const [biayaPerBulan, setBiayaPerBulan] = useState<number>(100000);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleOpenCreate = () => {
    setEditingBiaya(null);
    setLayanan("PLN");
    setNamaPaket("");
    setBiayaPerBulan(150000);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (b: BiayaTarif) => {
    setEditingBiaya(b);
    setLayanan(b.layanan);
    setNamaPaket(b.namaPaket);
    setBiayaPerBulan(b.biayaPerBulan);
    setErrors({});
    setIsFormOpen(true);
  };

  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!namaPaket.trim()) tempErrors.namaPaket = "Nama paket/tarif bulanan wajib diisi";
    if (biayaPerBulan <= 0) tempErrors.biayaPerBulan = "Besaran biaya bulanan harus lebih besar dari Rp 0";
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const data: BiayaTarif = {
      id: editingBiaya ? editingBiaya.id : `TRF-${Math.floor(100 + Math.random() * 900)}`,
      layanan,
      namaPaket: namaPaket.trim(),
      biayaPerBulan
    };

    if (editingBiaya) {
      onUpdateBiaya(data);
    } else {
      onAddBiaya(data);
    }

    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-650 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Master Biaya & Tarif Tagihan</h3>
            <p className="text-xs text-slate-500">Urus nominal besaran biaya per bulan untuk penawaran paket layanan</p>
          </div>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-medium text-xs text-white rounded-xl flex items-center gap-2"
          id="add-biaya-btn"
        >
          <Plus size={16} /> Tambah Tarif Baru
        </button>
      </div>

      {/* Tariffs List Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="biaya-list-grid">
        {biayaList.map((b) => (
          <div 
            key={b.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transitionduration-300 relative group overflow-hidden"
          >
            {/* Background Accent Lines */}
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 -mr-6 -mt-6 ${
              b.layanan === "PLN" ? "bg-amber-500" :
              b.layanan === "PDAM" ? "bg-blue-500" :
              "bg-purple-500"
            }`}></div>

            <div className="space-y-4 z-10">
              {/* Badge & ID */}
              <div className="flex justify-between items-center">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase ${
                  b.layanan === "PLN" ? "bg-amber-50 text-amber-600" :
                  b.layanan === "PDAM" ? "bg-blue-50 text-blue-600" :
                  "bg-purple-50 text-purple-600"
                }`}>
                  {b.layanan === "PLN" && <Zap size={10} fill="currentColor" />}
                  {b.layanan === "PDAM" && <Droplet size={10} />}
                  {b.layanan === "WIFI" && <Wifi size={10} />}
                  {b.layanan}
                </span>

                <span className="font-mono text-[9px] text-slate-400 font-bold uppercase">{b.id}</span>
              </div>

              {/* Package name details */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1">
                  <Tag size={12} /> Paket / Tarif
                </h4>
                <p className="text-sm font-bold text-slate-800 leading-tight pr-4">{b.namaPaket}</p>
              </div>

              {/* Price Tag line */}
              <div className="border-t border-slate-50 pt-4 flex justify-between items-end">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-450 uppercase font-mono tracking-wider font-semibold block">Besaran Bulanan</span>
                  <p className="text-lg font-bold text-slate-800 font-mono tracking-tight">{formatRupiah(b.biayaPerBulan)}</p>
                </div>

                {/* Edit & Delete Action Block */}
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleOpenEdit(b)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border border-slate-100 rounded-lg transition"
                    title="Ubah Tarif"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm(`Apakah Anda yakin ingin menghapus tarif "${b.namaPaket}"?`)) {
                        onDeleteBiaya(b.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 border border-slate-100 rounded-lg transition"
                    title="Hapus Tarif"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {biayaList.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-slate-200 p-12 text-center rounded-2xl bg-white text-slate-400 text-xs">
            Belum ada data tarif bulanan tercatat. Tambahkan tarif baru untuk memulai.
          </div>
        )}
      </div>

      {/* Form CRUD Overlay Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all" id="biaya-modal">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h4 className="text-xs font-bold font-mono tracking-wider uppercase">
                {editingBiaya ? "Ubah Data Tarif Bulanan" : "Tambah Tarif Bulanan Baru"}
              </h4>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Jenis Layanan */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">Jenis Layanan</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["PLN", "PDAM", "WIFI"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLayanan(l)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition flex justify-center items-center gap-1.5 cursor-pointer ${
                        layanan === l 
                          ? "bg-slate-900 text-white border-slate-900" 
                          : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {l === "PLN" && <Zap size={12} />}
                      {l === "PDAM" && <Droplet size={12} />}
                      {l === "WIFI" && <Wifi size={12} />}
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nama Paket */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold">Nama Paket / Tarif</label>
                <input 
                  type="text"
                  placeholder="Contoh: Unlimited Fiber Home - 50 Mbps"
                  value={namaPaket}
                  onChange={(e) => setNamaPaket(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white"
                />
                {errors.namaPaket && <p className="text-[10px] text-rose-500 mt-1">{errors.namaPaket}</p>}
              </div>

              {/* Besaran tarif */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold">Nominal Biaya per Bulan (Rupiah)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">Rp</span>
                  <input 
                    type="number"
                    placeholder="Contoh: 275000"
                    value={biayaPerBulan === 0 ? "" : biayaPerBulan}
                    onChange={(e) => setBiayaPerBulan(parseInt(e.target.value) || 0)}
                    className="w-full text-xs pl-8 pr-4 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-750 font-bold font-mono bg-white"
                  />
                </div>
                {errors.biayaPerBulan && <p className="text-[10px] text-rose-500 mt-1">{errors.biayaPerBulan}</p>}
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  <Check size={14} /> Simpan Tarif
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
