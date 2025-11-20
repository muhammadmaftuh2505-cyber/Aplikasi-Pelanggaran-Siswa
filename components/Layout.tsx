import React, { ReactNode } from 'react';
import { LogOut, User } from 'lucide-react';

interface LayoutProps {
  children?: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Layout({ children, activeTab, setActiveTab, onLogout }: LayoutProps) {
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'input', label: '📝 Input Pelanggaran' },
    { id: 'tindak-lanjut', label: '✅ Tindak Lanjut' },
    { id: 'siswa', label: '👥 Data Siswa' },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-500 to-cyan-700 p-6 shadow-lg shrink-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-5">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md overflow-hidden p-2">
            <img 
              src="https://iili.io/f9SELRp.png" 
              alt="Logo SIMPAS" 
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="flex-1 text-white">
            <h1 className="text-2xl font-bold leading-tight">SIMPAS DIGITAL</h1>
            <p className="text-cyan-100 text-sm">SMP Yamis Jakarta</p>
          </div>

          <div className="flex items-center gap-4 bg-white/20 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10">
            <div className="text-right">
              <p className="text-xs text-cyan-100">Guru BK</p>
              <p className="text-sm font-bold text-white">Admin</p>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-7xl mx-auto w-full p-6">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6 p-1 flex overflow-x-auto shrink-0 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-6 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-cyan-50 text-cyan-700 shadow-sm ring-1 ring-cyan-200'
                  : 'text-slate-500 hover:text-cyan-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 pb-20">
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}