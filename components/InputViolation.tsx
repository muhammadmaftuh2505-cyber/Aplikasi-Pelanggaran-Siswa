import React, { useState, useMemo } from 'react';
import { Student, Violation, VIOLATION_TYPES, ViolationCategory } from '../types';
import toast from 'react-hot-toast';
import { Search, UserCircle2 } from 'lucide-react';

interface InputViolationProps {
  students: Student[];
  violationsCount: number;
  onAddViolation: (violation: Violation) => void;
  onSuccess: () => void;
}

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx5RJHID-0QupEh0q3nT3-leg45UEntgvtmqAyLm8PnAN5-kbdYcnoixsILQTWbCLDy/exec";

export default function InputViolation({ students, violationsCount, onAddViolation, onSuccess }: InputViolationProps) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    tanggal_pelanggaran: new Date().toISOString().split('T')[0],
    jenis_pelanggaran: '',
    lokasi_kejadian: '',
    deskripsi: '',
    status_tindak_lanjut: 'Menunggu Tindak Lanjut',
    hasil_tindak_lanjut: ''
  });

  const classes = useMemo(() => {
    const s = new Set(students.map(stu => stu.kelas));
    return Array.from(s).sort();
  }, [students]);

  const studentsInClass = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.kelas === selectedClass).sort((a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap));
  }, [students, selectedClass]);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.nis === selectedStudentId);
  }, [students, selectedStudentId]);

  const selectedViolationType = useMemo(() => {
    return VIOLATION_TYPES.find(t => t.label === formData.jenis_pelanggaran);
  }, [formData.jenis_pelanggaran]);

  const generateCode = () => {
    const num = violationsCount + 1;
    return `CPS-${String(num).padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error("Pilih siswa terlebih dahulu");
      return;
    }
    if (!selectedViolationType) {
      toast.error("Pilih jenis pelanggaran");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Menyimpan ke Google Sheet...");

    const sheetPayload = {
      nis: selectedStudent.nis,
      nama: selectedStudent.nama_lengkap,
      jk: selectedStudent.jenis_kelamin,
      kelas: selectedStudent.kelas,
      wali_kelas: selectedStudent.nama_wali_kelas,
      kontak_ortu: selectedStudent.kontak_ortu,
      tanggal: formData.tanggal_pelanggaran,
      jenis_pelanggaran: formData.jenis_pelanggaran,
      kategori_pelanggaran: selectedViolationType.kategori,
      lokasi: formData.lokasi_kejadian,
      deskripsi: formData.deskripsi,
      status_tindak_lanjut: formData.status_tindak_lanjut,
      hasil_tindak_lanjut: formData.hasil_tindak_lanjut,
      poin_pelanggaran: selectedViolationType.poin
    };

    try {
      // Send to Google Apps Script
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(sheetPayload),
      });

      // Update Local State
      const newViolation: Violation = {
        id: crypto.randomUUID(),
        nis: selectedStudent.nis,
        nama_lengkap: selectedStudent.nama_lengkap,
        jenis_kelamin: selectedStudent.jenis_kelamin,
        kelas: selectedStudent.kelas,
        nama_wali_kelas: selectedStudent.nama_wali_kelas,
        kontak_ortu: selectedStudent.kontak_ortu,
        kode_pelanggaran: generateCode(),
        tanggal_pelanggaran: formData.tanggal_pelanggaran,
        jenis_pelanggaran: formData.jenis_pelanggaran,
        kategori_pelanggaran: selectedViolationType.kategori,
        poin_pelanggaran: selectedViolationType.poin,
        lokasi_kejadian: formData.lokasi_kejadian,
        deskripsi: formData.deskripsi,
        status_tindak_lanjut: formData.status_tindak_lanjut as any,
        hasil_tindak_lanjut: formData.hasil_tindak_lanjut,
        created_at: new Date().toISOString()
      };

      onAddViolation(newViolation);
      toast.success("Data berhasil disimpan!", { id: loadingToast });
      onSuccess();
    } catch (error) {
      console.error("Error saving violation:", error);
      toast.error("Gagal menyimpan ke Google Sheet", { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3">
          <div className="p-2 bg-cyan-100 rounded-lg text-cyan-600">
            📝
          </div>
          Input Data Pelanggaran
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Student Selection Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700 border-b pb-2 border-slate-100">1. Data Siswa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Kelas</label>
                <select
                  value={selectedClass}
                  onChange={(e) => { setSelectedClass(e.target.value); setSelectedStudentId(''); }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Siswa</label>
                <div className="relative">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-all appearance-none disabled:opacity-50"
                    disabled={!selectedClass || isSubmitting}
                    required
                  >
                    <option value="">-- Pilih Siswa --</option>
                    {studentsInClass.map(s => <option key={s.nis} value={s.nis}>{s.nama_lengkap}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Student Detail Card */}
            {selectedStudent && (
              <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl flex items-start gap-4 animate-fade-in">
                <div className="p-3 bg-white rounded-full shadow-sm text-indigo-600">
                  <UserCircle2 className="w-8 h-8" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 w-full">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Nama Lengkap</p>
                    <p className="font-bold text-slate-800">{selectedStudent.nama_lengkap}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">NIS</p>
                    <p className="font-bold text-slate-800">{selectedStudent.nis}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Kelas</p>
                    <p className="font-bold text-slate-800">{selectedStudent.kelas}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Wali Kelas</p>
                    <p className="font-bold text-slate-800">{selectedStudent.nama_wali_kelas}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Kontak Ortu</p>
                    <p className="font-bold text-slate-800">{selectedStudent.kontak_ortu}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Violation Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700 border-b pb-2 border-slate-100">2. Detail Pelanggaran</h3>
            
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-cyan-600 font-mono font-bold text-lg tracking-wider">
                  {generateCode()}
                </div>
                <span className="text-sm text-slate-500">Kode Otomatis (Estimasi)</span>
              </div>
              <div className="text-sm text-slate-400">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Kejadian</label>
                <input
                  type="date"
                  value={formData.tanggal_pelanggaran}
                  onChange={(e) => setFormData({...formData, tanggal_pelanggaran: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi Kejadian</label>
                <input
                  type="text"
                  value={formData.lokasi_kejadian}
                  onChange={(e) => setFormData({...formData, lokasi_kejadian: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                  placeholder="Contoh: Kantin, Kelas 9A"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Pelanggaran</label>
                <select
                  value={formData.jenis_pelanggaran}
                  onChange={(e) => setFormData({...formData, jenis_pelanggaran: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">-- Pilih Jenis Pelanggaran --</option>
                  {['Ringan', 'Sedang', 'Berat'].map(cat => (
                    <optgroup key={cat} label={`Kategori ${cat}`}>
                      {VIOLATION_TYPES.filter(t => t.kategori === cat).map(t => (
                        <option key={t.label} value={t.label}>{t.label} ({t.poin} poin)</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              
              {selectedViolationType && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                    <div className={`w-full p-3 rounded-xl border font-bold text-center ${
                      selectedViolationType.kategori === 'Ringan' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      selectedViolationType.kategori === 'Sedang' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {selectedViolationType.kategori}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Poin</label>
                    <div className="w-full p-3 rounded-xl border bg-slate-100 text-slate-700 border-slate-200 font-bold text-center">
                      {selectedViolationType.poin} Poin
                    </div>
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi & Catatan</label>
                <textarea
                  rows={3}
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                  placeholder="Ceritakan kronologi singkat..."
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700 border-b pb-2 border-slate-100">3. Status Tindak Lanjut</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status_tindak_lanjut}
                  onChange={(e) => setFormData({...formData, status_tindak_lanjut: e.target.value as any})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                  disabled={isSubmitting}
                >
                  <option value="Menunggu Tindak Lanjut">Menunggu Tindak Lanjut</option>
                  <option value="Sudah Ditindak Lanjut">Sudah Ditindak Lanjut</option>
                </select>
              </div>
              {formData.status_tindak_lanjut === 'Sudah Ditindak Lanjut' && (
                 <div className="md:col-span-2 animate-fade-in">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hasil Tindak Lanjut</label>
                  <textarea
                    rows={3}
                    value={formData.hasil_tindak_lanjut}
                    onChange={(e) => setFormData({...formData, hasil_tindak_lanjut: e.target.value})}
                    className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Jelaskan hasil penanganan..."
                    required
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                '💾 Simpan Data Pelanggaran'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}