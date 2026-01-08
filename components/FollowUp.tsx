import React, { useState, useMemo } from 'react';
import { Violation } from '../types';
import Modal from './ui/Modal';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock, MapPin, ListTodo, Send } from 'lucide-react';

interface FollowUpProps {
  violations: Violation[];
  onUpdateViolation: (v: Violation) => void;
}

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx5RJHID-0QupEh0q3nT3-leg45UEntgvtmqAyLm8PnAN5-kbdYcnoixsILQTWbCLDy/exec";

export default function FollowUp({ violations, onUpdateViolation }: FollowUpProps) {
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [resultText, setResultText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Strict filtering for "Menunggu Tindak Lanjut"
  // Using trim() to handle potential whitespace issues from CSV
  const pendingViolations = useMemo(() => {
    return violations.filter(v => {
      const status = (v.status_tindak_lanjut || '').trim();
      return status === 'Menunggu Tindak Lanjut';
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [violations]);

  const handleSave = async () => {
    if (!selectedViolation) return;
    if (!resultText.trim()) {
      toast.error("Isi hasil tindak lanjut");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Mengirim data ke Google Sheet...");

    const payload = {
      action: "update_tindak_lanjut",
      kode_pelanggaran: selectedViolation.kode_pelanggaran,
      status_tindak_lanjut: "Sudah Ditindak Lanjut",
      hasil_tindak_lanjut: resultText
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", // Standard for Google Apps Script Web App without proxy
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });

      const updated = {
        ...selectedViolation,
        status_tindak_lanjut: 'Sudah Ditindak Lanjut' as const,
        hasil_tindak_lanjut: resultText
      };

      onUpdateViolation(updated);
      toast.success("Data berhasil dikirim & diperbarui!", { id: loadingToast });
      setSelectedViolation(null);
      setResultText('');
    } catch (error) {
       console.error(error);
       toast.error("Gagal koneksi ke Google Sheet (Disimpan Lokal)", { id: loadingToast });
       
       // Still update locally in case of network error so user can continue working
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
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ListTodo className="w-7 h-7 text-cyan-600" />
            Antrian Tindak Lanjut
          </h2>
          <p className="text-slate-500 text-sm mt-1">Daftar siswa yang menunggu proses bimbingan/konseling.</p>
        </div>
        <div className="bg-orange-100 text-orange-800 px-5 py-3 rounded-xl font-bold flex flex-col items-center border border-orange-200">
          <span className="text-2xl leading-none">{pendingViolations.length}</span>
          <span className="text-[10px] uppercase tracking-wider">Menunggu</span>
        </div>
      </div>

      {pendingViolations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
             <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-700">Semua Beres!</h3>
          <p className="text-slate-500 mt-2 max-w-md">Tidak ada pelanggaran yang menunggu tindak lanjut saat ini.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingViolations.map(v => (
            <div key={v.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col md:flex-row gap-6 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-400 group-hover:bg-orange-500 transition-colors"></div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded font-mono">{v.kode_pelanggaran}</span>
                  <span className="flex items-center gap-1 text-xs text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                    <Clock className="w-3 h-3" /> Menunggu Penanganan
                  </span>
                  <span className="text-xs text-slate-400 ml-auto md:ml-0">{new Date(v.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                    {v.nama_lengkap.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800 leading-tight">{v.nama_lengkap}</h4>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">{v.kelas} • {v.nis}</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Jenis Pelanggaran</p>
                    <p className="font-medium text-slate-700">{v.jenis_pelanggaran}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Lokasi</p>
                    <p className="font-medium text-slate-700 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {v.lokasi_kejadian}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4 min-w-[160px] border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-slate-100">
                <div className="flex items-center justify-between md:justify-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                     v.kategori_pelanggaran === 'Ringan' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                     v.kategori_pelanggaran === 'Sedang' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                     'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {v.kategori_pelanggaran}
                  </span>
                  <span className="text-sm font-bold text-slate-600">{v.poin_pelanggaran} Poin</span>
                </div>
                
                <button 
                  onClick={() => {
                    setSelectedViolation(v);
                    setResultText('');
                  }}
                  className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" /> Proses Tindak Lanjut
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
        <div className="space-y-5">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm flex items-start gap-3">
            <div className="bg-white p-2 rounded-full shadow-sm text-indigo-600">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-indigo-900 mb-1">{selectedViolation?.nama_lengkap}</h4>
              <p className="text-indigo-700 mb-1">{selectedViolation?.jenis_pelanggaran}</p>
              <p className="text-indigo-500 text-xs">{selectedViolation?.deskripsi}</p>
              {selectedViolation?.pelapor && (
                <p className="text-indigo-500 text-xs mt-1 font-medium">Pelapor: {selectedViolation.pelapor}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Hasil & Dokumentasi Tindak Lanjut</label>
            <textarea
              className="w-full p-4 bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none min-h-[120px] shadow-sm"
              placeholder="Contoh: Siswa telah diberikan teguran lisan dan berjanji tidak mengulangi. Orang tua sudah dihubungi."
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              autoFocus
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-400 mt-2 text-right">Minimal 5 karakter</p>
          </div>
          
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <button 
              onClick={() => setSelectedViolation(null)}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button 
              onClick={handleSave}
              disabled={isSubmitting || resultText.length < 5}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Kirim Data
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}