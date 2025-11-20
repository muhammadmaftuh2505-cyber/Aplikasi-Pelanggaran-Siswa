import React, { useState } from 'react';
import { Violation } from '../types';
import Modal from './ui/Modal';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock, MapPin, AlertTriangle } from 'lucide-react';

interface FollowUpProps {
  violations: Violation[];
  onUpdateViolation: (v: Violation) => void;
}

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx5RJHID-0QupEh0q3nT3-leg45UEntgvtmqAyLm8PnAN5-kbdYcnoixsILQTWbCLDy/exec";

export default function FollowUp({ violations, onUpdateViolation }: FollowUpProps) {
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [resultText, setResultText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const pendingViolations = violations.filter(v => v.status_tindak_lanjut === 'Menunggu Tindak Lanjut');

  const handleSave = async () => {
    if (!selectedViolation) return;
    if (!resultText.trim()) {
      toast.error("Isi hasil tindak lanjut");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Mengupdate data...");

    const payload = {
      action: "update_tindak_lanjut",
      kode_pelanggaran: selectedViolation.kode_pelanggaran,
      status_tindak_lanjut: "Sudah Ditindak Lanjut",
      hasil_tindak_lanjut: resultText
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });

      const updated = {
        ...selectedViolation,
        status_tindak_lanjut: 'Sudah Ditindak Lanjut' as const,
        hasil_tindak_lanjut: resultText
      };

      onUpdateViolation(updated);
      toast.success("Tindak lanjut berhasil disimpan", { id: loadingToast });
      setSelectedViolation(null);
      setResultText('');
    } catch (error) {
       console.error(error);
       toast.error("Gagal update tindak lanjut (Tersimpan Lokal)", { id: loadingToast });
       
       // Still update locally in case of network error, so UI reflects change
       const updated = {
        ...selectedViolation,
        status_tindak_lanjut: 'Sudah Ditindak Lanjut' as const,
        hasil_tindak_lanjut: resultText
      };
      onUpdateViolation(updated);
      setSelectedViolation(null);
      setResultText('');
    } finally {
       setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">✅ Tindak Lanjut Pelanggaran</h2>
        <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-bold text-sm">
          {pendingViolations.length} Menunggu
        </div>
      </div>

      {pendingViolations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
             <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-700">Kerja Bagus!</h3>
          <p className="text-slate-500 mt-2">Semua pelanggaran telah ditindaklanjuti.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingViolations.map(v => (
            <div key={v.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400"></div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded">{v.kode_pelanggaran}</span>
                  <span className="text-xs text-slate-400">{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {v.nama_lengkap.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{v.nama_lengkap}</h4>
                    <p className="text-xs text-slate-500">{v.kelas} • {v.nis}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Pelanggaran</p>
                    <p className="font-medium text-slate-700">{v.jenis_pelanggaran}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Lokasi</p>
                    <p className="font-medium text-slate-700 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {v.lokasi_kejadian}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end justify-center gap-2 min-w-[140px] border-l pl-6 border-slate-50">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                   v.kategori_pelanggaran === 'Ringan' ? 'bg-emerald-100 text-emerald-700' :
                   v.kategori_pelanggaran === 'Sedang' ? 'bg-amber-100 text-amber-700' :
                   'bg-rose-100 text-rose-700'
                }`}>
                  {v.kategori_pelanggaran}
                </span>
                <span className="text-sm font-bold text-slate-600">{v.poin_pelanggaran} Poin</span>
                <button 
                  onClick={() => {
                    setSelectedViolation(v);
                    setResultText('');
                  }}
                  className="mt-2 w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Proses
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={!!selectedViolation} 
        onClose={() => !isSubmitting && setSelectedViolation(null)}
        title="📝 Form Tindak Lanjut"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
            <p><span className="font-semibold text-slate-600">Siswa:</span> {selectedViolation?.nama_lengkap}</p>
            <p><span className="font-semibold text-slate-600">Pelanggaran:</span> {selectedViolation?.jenis_pelanggaran}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Hasil Tindak Lanjut</label>
            <textarea
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none min-h-[120px]"
              placeholder="Tuliskan detail penanganan yang dilakukan..."
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              autoFocus
              disabled={isSubmitting}
            />
          </div>
          
          <div className="flex gap-3 justify-end pt-2">
            <button 
              onClick={() => setSelectedViolation(null)}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button 
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan & Selesai'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}