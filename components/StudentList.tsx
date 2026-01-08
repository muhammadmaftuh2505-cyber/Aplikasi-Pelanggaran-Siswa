import React, { useState, useMemo } from 'react';
import { Student, Violation } from '../types';
import { Search, Filter, Trophy, AlertCircle, ChevronDown } from 'lucide-react';
import Modal from './ui/Modal';

// --- HELPER FUNCTIONS ---

// Normalize class string to a strict ID for comparison
// Removes all non-alphanumeric characters to prevent issues with spaces, dashes, etc.
const normalizeClass = (cls: any) => {
  if (!cls) return '';
  // Only allow A-Z and 0-9. This prevents "7 A" and "7-A" from being treated differently
  // and ensures "7B" doesn't partially match "7 A" via regex errors
  return String(cls).toUpperCase().replace(/[^A-Z0-9]/g, '');
};

// Helper to extract numeric value from class string for sorting
// Handles "7A" -> 7, "VIIA" -> 7
const getClassRank = (clsLabel: string): number => {
  const normalized = normalizeClass(clsLabel);
  
  // Match Roman numerals or Arabic numbers at the start
  // Example: "VIIA" -> match "VII", "7A" -> match "7"
  const match = normalized.match(/^((?:X{0,3})(?:IX|IV|V?I{0,3})|\d+)/);
  
  if (!match) return 999; 
  
  const prefix = match[0];
  
  // Roman Map
  const romans: Record<string, number> = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6,
    'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12
  };

  if (romans[prefix]) return romans[prefix];
  
  const num = parseInt(prefix);
  return isNaN(num) ? 999 : num;
};

// Format normalized ID to readable label
// Tries to insert space between Grade and Suffix (e.g. "7A" -> "7 A") for better readability
const formatClassLabel = (id: string) => {
  // Roman Numerals
  const romanMatch = id.match(/^((?:X{0,3})(?:IX|IV|V?I{0,3}))(.+)$/);
  if (romanMatch) {
    return `${romanMatch[1]} ${romanMatch[2]}`;
  }

  // Numeric
  const numMatch = id.match(/^(\d+)(.+)$/);
  if (numMatch) {
    return `${numMatch[1]} ${numMatch[2]}`;
  }

  return id;
};

// Comparator function for sorting classes
const compareClasses = (classA: string, classB: string) => {
  const normA = normalizeClass(classA);
  const normB = normalizeClass(classB);

  // 1. Compare by Rank (Grade Level)
  const rankA = getClassRank(normA);
  const rankB = getClassRank(normB);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  // 2. If Grade Level is same, Natural Sort the rest of the string
  // This handles "7A" vs "7B" correctly
  return normA.localeCompare(normB, 'en', { numeric: true });
};

interface StudentListProps {
  students: Student[];
  violations: Violation[];
}

export default function StudentList({ students, violations }: StudentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [selectedStudentNis, setSelectedStudentNis] = useState<string | null>(null);

  // Calculate points map
  const studentPoints = useMemo(() => {
    const points: Record<string, { total: number, count: number, violations: Violation[] }> = {};
    
    // Initialize all students with 0
    students.forEach(s => {
      points[s.nis] = { total: 0, count: 0, violations: [] };
    });

    // Accumulate violations
    violations.forEach(v => {
      if (!points[v.nis]) {
         points[v.nis] = { total: 0, count: 0, violations: [] };
      }
      points[v.nis].total += v.poin_pelanggaran;
      points[v.nis].count += 1;
      points[v.nis].violations.push(v);
    });

    return points;
  }, [students, violations]);

  // Generate Dropdown Options
  const classOptions = useMemo(() => {
    const uniqueIDs = new Set<string>();
    const labelMap = new Map<string, string>();
    
    students.forEach(s => {
      const id = normalizeClass(s.kelas);
      // Only add if valid class string exists
      if (id) {
        uniqueIDs.add(id);
        // Store the most readable version found, or format it
        if (!labelMap.has(id)) {
           // Try to use original class if it's clean, otherwise format the ID
           const original = s.kelas?.trim();
           labelMap.set(id, (original && original.length < 10) ? original : formatClassLabel(id));
        }
      }
    });

    return Array.from(uniqueIDs)
      .map(id => ({
        value: id,
        label: labelMap.get(id) || id
      }))
      .sort((a, b) => compareClasses(a.value, b.value)); // Sort options using class comparator
  }, [students]);

  // Filter and Sort logic
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // 1. Class Filter (Strict Normalized Comparison)
      if (filterClass) {
        const sClassNorm = normalizeClass(s.kelas);
        // STRICT check: normalized ID must match exactly
        if (sClassNorm !== filterClass) {
          return false;
        }
      }

      // 2. Search Filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const sName = (s.nama_lengkap || '').toLowerCase();
        const sNis = (s.nis || '').toLowerCase();
        
        if (!sName.includes(term) && !sNis.includes(term)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Priority 1: Class Sort
      const classComparison = compareClasses(a.kelas, b.kelas);
      if (classComparison !== 0) {
        return classComparison;
      }
      
      // Priority 2: Name Sort (Ascending)
      return a.nama_lengkap.localeCompare(b.nama_lengkap);
    });
  }, [students, searchTerm, filterClass]);

  const selectedStudentData = selectedStudentNis ? students.find(s => s.nis === selectedStudentNis) : null;
  const selectedStudentStats = selectedStudentNis ? studentPoints[selectedStudentNis] : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">👥 Data Siswa & Poin</h2>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Cari nama siswa atau NIS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        </div>
        <div className="md:w-56 relative">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none appearance-none cursor-pointer font-medium text-slate-700"
          >
            <option value="">Semua Kelas</option>
            {classOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2 text-sm text-slate-500">
          <span>Menampilkan {filteredStudents.length} siswa</span>
          {filterClass && <span className="font-medium text-cyan-600">Filter: {classOptions.find(c => c.value === filterClass)?.label || filterClass}</span>}
        </div>

        {filteredStudents.map((s, index) => {
          const stats = studentPoints[s.nis] || { total: 0, count: 0, violations: [] };
          const isSafe = stats.total === 0;
          const isWarning = stats.total > 0 && stats.total <= 50;
          const isDanger = stats.total > 50;
          
          // Display Class Label cleanly - use original if avail or fallback to formatted
          const displayClass = s.kelas || formatClassLabel(normalizeClass(s.kelas));
          
          // Composite key to ensure uniqueness if NIS is duplicated in CSV or across renders
          const uniqueKey = `student-${s.nis}-${index}`;

          return (
            <div key={uniqueKey} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 flex items-center justify-between transition-all hover:-translate-y-0.5 hover:shadow-md ${
              isSafe ? 'border-l-emerald-500' : isWarning ? 'border-l-amber-500' : 'border-l-rose-500'
            }`}>
              <div className="flex items-center gap-4 overflow-hidden flex-1">
                <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-sm ${
                  isSafe ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-rose-500'
                }`}>
                  {s.nama_lengkap.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 truncate">{s.nama_lengkap}</h4>
                  <p className="text-xs text-slate-500 truncate">
                    <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded mr-1">{displayClass}</span> 
                    • {s.nis}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-8 shrink-0 ml-2">
                <div className="text-center hidden xs:block">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kasus</p>
                  <p className="font-bold text-slate-700">{stats.count}</p>
                </div>
                <div className="text-center min-w-[60px]">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">Total Poin</p>
                  <p className={`text-xl font-black ${
                    isSafe ? 'text-emerald-600' : isWarning ? 'text-amber-600' : 'text-rose-600'
                  }`}>{stats.total}</p>
                </div>
                <button 
                  onClick={() => setSelectedStudentNis(s.nis)}
                  className="p-2 hover:bg-cyan-50 rounded-lg text-slate-400 hover:text-cyan-600 transition-colors"
                  title="Lihat Detail"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
        
        {filteredStudents.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-700">Tidak ada siswa ditemukan</h3>
            <p className="text-slate-400 text-sm mt-1">Coba ubah kata kunci pencarian atau filter kelas</p>
            {filterClass && (
              <button 
                onClick={() => setFilterClass('')}
                className="mt-4 px-4 py-2 text-sm text-cyan-600 font-medium hover:bg-cyan-50 rounded-lg transition-colors"
              >
                Hapus Filter Kelas
              </button>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedStudentData && (
        <Modal
          isOpen={!!selectedStudentNis}
          onClose={() => setSelectedStudentNis(null)}
          title="📋 Detail Siswa"
        >
          <div className="space-y-6">
            <div className="text-center bg-gradient-to-r from-cyan-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl"></div>
              
              <div className="relative">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-3 shadow-inner border border-white/30">
                  {selectedStudentData.nama_lengkap.charAt(0)}
                </div>
                <h3 className="text-xl font-bold">{selectedStudentData.nama_lengkap}</h3>
                <p className="text-cyan-100 opacity-90 font-medium">{selectedStudentData.kelas} • {selectedStudentData.nis}</p>
                
                <div className="flex justify-center gap-8 mt-6">
                  <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                    <p className="text-[10px] uppercase tracking-wider opacity-80 font-bold">Total Poin</p>
                    <p className="text-2xl font-black">{selectedStudentStats?.total || 0}</p>
                  </div>
                  <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                    <p className="text-[10px] uppercase tracking-wider opacity-80 font-bold">Kasus</p>
                    <p className="text-2xl font-black">{selectedStudentStats?.count || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
               <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                 <AlertCircle className="w-4 h-4 text-rose-500" /> Riwayat Pelanggaran
               </h4>
               <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                 {(!selectedStudentStats || selectedStudentStats.violations.length === 0) ? (
                   <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                     <Trophy className="w-10 h-10 mx-auto mb-3 text-amber-400 opacity-50" />
                     <p className="font-medium text-slate-600">Siswa Teladan!</p>
                     <p className="text-xs">Tidak ada catatan pelanggaran.</p>
                   </div>
                 ) : (
                   selectedStudentStats.violations
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(v => (
                     <div key={v.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow text-sm group">
                       <div className="flex justify-between items-start mb-2">
                         <span className="font-bold text-slate-800 group-hover:text-cyan-700 transition-colors">{v.jenis_pelanggaran}</span>
                         <span className={`font-bold px-2 py-1 rounded text-xs ${
                           v.kategori_pelanggaran === 'Berat' ? 'bg-rose-100 text-rose-700' : 
                           v.kategori_pelanggaran === 'Sedang' ? 'bg-amber-100 text-amber-700' : 
                           'bg-emerald-100 text-emerald-700'
                         }`}>+{v.poin_pelanggaran}</span>
                       </div>
                       <p className="text-slate-400 text-xs mb-3 flex items-center gap-2 flex-wrap">
                         <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">{v.kode_pelanggaran}</span>
                         <span>{new Date(v.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                         <span>•</span>
                         <span>{v.lokasi_kejadian}</span>
                         {v.pelapor && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 font-medium">Oleh: {v.pelapor}</span>
                            </>
                         )}
                       </p>
                       <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                         <p className="text-slate-600 text-xs italic leading-relaxed">"{v.deskripsi}"</p>
                         {v.status_tindak_lanjut === 'Sudah Ditindak Lanjut' && (
                           <div className="mt-2 pt-2 border-t border-slate-200">
                             <p className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                               ✅ Tindak Lanjut Selesai
                             </p>
                             {v.hasil_tindak_lanjut && (
                               <p className="text-slate-500 text-xs mt-1">{v.hasil_tindak_lanjut}</p>
                             )}
                           </div>
                         )}
                       </div>
                     </div>
                   ))
                 )}
               </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Wali Kelas</p>
                <p className="font-medium text-slate-700">{selectedStudentData.nama_wali_kelas}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Kontak Ortu</p>
                <p className="font-medium text-slate-700">{selectedStudentData.kontak_ortu}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}