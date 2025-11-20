import React from 'react';
import { Violation, Student } from '../types';
import { AlertTriangle, Users, Clock, CheckCircle2, ArrowRight, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  violations: Violation[];
  students: Student[];
  onViewDetail: (id: string) => void;
}

export default function Dashboard({ violations, students, onViewDetail }: DashboardProps) {
  const total = violations.length;
  const uniqueStudents = new Set(violations.map(v => v.nis)).size;
  const pending = violations.filter(v => v.status_tindak_lanjut === 'Menunggu Tindak Lanjut').length;
  const completed = violations.filter(v => v.status_tindak_lanjut === 'Sudah Ditindak Lanjut').length;

  // Sort by created_at descending (newest first). 
  // Since CSV parsing adds time based on row number, this puts the bottom rows of the sheet first.
  const recentViolations = [...violations]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Chart Data: Violations by Category
  const chartData = [
    { name: 'Ringan', count: violations.filter(v => v.kategori_pelanggaran === 'Ringan').length, color: '#10b981' },
    { name: 'Sedang', count: violations.filter(v => v.kategori_pelanggaran === 'Sedang').length, color: '#f59e0b' },
    { name: 'Berat', count: violations.filter(v => v.kategori_pelanggaran === 'Berat').length, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Pelanggaran"
          value={total}
          icon={<AlertTriangle className="w-8 h-8 text-white" />}
          gradient="from-cyan-500 to-cyan-700"
        />
        <StatCard
          title="Siswa Terlibat"
          value={uniqueStudents}
          icon={<Users className="w-8 h-8 text-white" />}
          gradient="from-violet-500 to-violet-700"
        />
        <StatCard
          title="Menunggu Tindak Lanjut"
          value={pending}
          icon={<Clock className="w-8 h-8 text-white" />}
          gradient="from-amber-400 to-amber-600"
        />
        <StatCard
          title="Selesai"
          value={completed}
          icon={<CheckCircle2 className="w-8 h-8 text-white" />}
          gradient="from-emerald-400 to-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Violations */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-800">🔔 Pelanggaran Terbaru</h3>
              <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Live Data
              </span>
            </div>
            <span className="text-xs font-medium text-slate-400">5 Terakhir dari Google Sheet</span>
          </div>
          
          <div className="space-y-3">
            {recentViolations.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Database className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Belum ada data pelanggaran</p>
                <p className="text-xs mt-1">Data otomatis diambil dari Google Sheet</p>
              </div>
            ) : (
              recentViolations.map(v => (
                <div 
                  key={v.id} 
                  onClick={() => onViewDetail(v.id)}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/50 transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
                    {v.nama_lengkap.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{v.kode_pelanggaran}</span>
                      <h4 className="text-sm font-bold text-slate-800 truncate">{v.nama_lengkap}</h4>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      <span className="font-medium text-slate-700">{v.jenis_pelanggaran}</span> • {new Date(v.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                      v.kategori_pelanggaran === 'Ringan' ? 'bg-emerald-100 text-emerald-700' :
                      v.kategori_pelanggaran === 'Sedang' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {v.kategori_pelanggaran}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6">📊 Statistik Kategori</h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-2">
            {chartData.map(item => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}} />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-800">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, gradient }: { title: string, value: number, icon: React.ReactNode, gradient: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${gradient} shadow-lg`}>
      <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-white/90 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-4xl font-extrabold text-white">{value}</h3>
        </div>
        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-inner">
          {icon}
        </div>
      </div>
    </div>
  );
}