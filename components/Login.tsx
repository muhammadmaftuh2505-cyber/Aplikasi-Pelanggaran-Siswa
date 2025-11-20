import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      if (username === 'admin' && password === 'admin') {
        toast.success('Login Berhasil!');
        onLogin();
      } else {
        toast.error('Username atau password salah!');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-700 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[10%] right-[10%] w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="w-[90%] max-w-md bg-white/95 backdrop-blur-xl rounded-3xl p-10 shadow-2xl z-10 border border-white/50">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 p-3 overflow-hidden">
            <img 
              src="https://iili.io/f9SELRp.png" 
              alt="Logo SIMPAS" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
            SIMPAS DIGITAL
          </h1>
          <p className="text-slate-500 text-sm font-medium">Sistem Monitoring Pelanggaran Siswa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-0 transition-colors bg-slate-50/50 outline-none text-sm"
                placeholder="Masukkan username"
                required
              />
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-0 transition-colors bg-slate-50/50 outline-none text-sm"
                placeholder="Masukkan password"
                required
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              '🚀 Masuk ke Sistem'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">© 2024 SIMPAS Digital • SMP Yamis Jakarta</p>
        </div>
      </div>
    </div>
  );
}