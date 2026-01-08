import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import InputViolation from './components/InputViolation';
import FollowUp from './components/FollowUp';
import StudentList from './components/StudentList';
import { Student, Violation } from './types';
import { parseStudentsCSV, parseViolationsCSV } from './utils/csv';
import { Toaster, toast } from 'react-hot-toast';

// URLs updated with timestamp to prevent caching
const GOOGLE_SHEET_STUDENTS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQE3K6fsKmQLDCuYJajLi1P0NGJgOlIjCG20M5HbmpF_HNYcdMxIzMV6WSOHT4pncvpg2DXoJL8lcM4/pub?gid=0&single=true&output=csv';
const GOOGLE_SHEET_VIOLATIONS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjjjQTJbDSEngCSmo_tE7pbXLHUcZK385u010_UE-WL5QwfBNMVS4iW4Nu6OWR3Kxvr0KdYkhBj9gq/pub?gid=0&single=true&output=csv';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  // Store IDs that definitively exist in the Google Sheet
  const [sheetViolationIds, setSheetViolationIds] = useState<Set<string>>(new Set());
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Robust fetch function with Fallback to Cache
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    
    // UX: If manual refresh, ensure spinner shows for at least 1s so user feels it "worked"
    const minLoadingTime = isManual ? new Promise(resolve => setTimeout(resolve, 1000)) : Promise.resolve();
    
    const fetchWithFallback = async <T,>(
      url: string, 
      cacheKey: string, 
      parser: (text: string) => T[]
    ): Promise<{ data: T[], fromCache: boolean }> => {
      try {
        const timestamp = Date.now();
        // Force Network: Add strict anti-caching headers and unique timestamp
        const response = await fetch(`${url}&nocache=${timestamp}`, {
          method: 'GET',
          credentials: 'omit',
          cache: 'no-store', // Important: Ignore browser cache
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const text = await response.text();
        
        // Security Check: If response is HTML (e.g. Google Login page), throw error
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          throw new Error("Gagal membaca data (Format HTML). Cek izin akses Google Sheet.");
        }

        const data = parser(text);
        
        // Save to cache on success
        localStorage.setItem(cacheKey, JSON.stringify(data));
        return { data, fromCache: false };
      } catch (error) {
        console.warn(`Fetch failed for ${cacheKey}, attempting cache fallback...`, error);
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            return { data: JSON.parse(cached), fromCache: true };
          } catch (e) {
            console.error("Cache corrupted", e);
            return { data: [], fromCache: true };
          }
        }
        throw error;
      }
    };

    try {
      // Wait for both the fetch and the UX delay (if manual)
      const [studentsResult, violationsResult] = await Promise.all([
        fetchWithFallback(GOOGLE_SHEET_STUDENTS, 'simpas_cache_students', parseStudentsCSV),
        fetchWithFallback(GOOGLE_SHEET_VIOLATIONS, 'simpas_cache_violations', parseViolationsCSV),
        minLoadingTime 
      ]);

      setStudents(studentsResult.data);

      // Capture IDs strictly from the Sheet
      const parsedViolations = violationsResult.data;
      const validSheetIds = new Set(parsedViolations.map(v => v.id));
      setSheetViolationIds(validSheetIds);

      // Merge with local storage (Optimistic updates)
      let localViolations: any[] = [];
      try {
        const localViolationsStr = localStorage.getItem('simpas_local_violations');
        localViolations = localViolationsStr ? JSON.parse(localViolationsStr) : [];
        if (!Array.isArray(localViolations)) localViolations = [];
      } catch (e) {
        console.error("Error parsing local violations", e);
        localViolations = [];
      }

      const validLocalViolations: any[] = []; // Used to rewrite clean local storage
      
      const violationMap = new Map<string, Violation>();
      parsedViolations.forEach(v => violationMap.set(v.kode_pelanggaran, v));

      const mergedViolations = [...parsedViolations];

      localViolations.forEach(localV => {
        if (!localV || !localV.kode_pelanggaran) return;
        
        // Check if local edit is recent (within 10 mins)
        const isRecent = localV._localTimestamp && (Date.now() - localV._localTimestamp < 10 * 60 * 1000);
        
        const sheetV = violationMap.get(localV.kode_pelanggaran);

        if (!sheetV) {
           // CASE: ID NOT FOUND IN SHEET
           // Perform Fuzzy Deduplication
           const isDuplicate = parsedViolations.some(p => 
             p.nis === localV.nis &&
             p.jenis_pelanggaran === localV.jenis_pelanggaran &&
             p.poin_pelanggaran === localV.poin_pelanggaran &&
             (p.deskripsi || '').trim() === (localV.deskripsi || '').trim()
           );

           if (!isDuplicate) {
             // Truly new item (Pending Sync)
             mergedViolations.push(localV);
             validLocalViolations.push(localV);
           }
        } else {
           // CASE: ID FOUND IN SHEET
           // Check if data matches
           if (sheetV.status_tindak_lanjut !== localV.status_tindak_lanjut) {
              // Conflict found.
              if (isRecent) {
                 // Local is fresher, override Sheet momentarily
                 const idx = mergedViolations.findIndex(v => v.kode_pelanggaran === localV.kode_pelanggaran);
                 if (idx !== -1) mergedViolations[idx] = localV;
                 validLocalViolations.push(localV);
              }
           }
        }
      });
      
      // Update persistent local storage
      localStorage.setItem('simpas_local_violations', JSON.stringify(validLocalViolations));
      setViolations(mergedViolations);
      
      // Notifications
      if (isManual) {
        if (studentsResult.fromCache || violationsResult.fromCache) {
           toast("Koneksi tidak stabil. Menggunakan data offline.", { icon: '⚠️' });
        } else {
           toast.success("Data berhasil diperbarui!");
        }
      }

    } catch (error) {
      console.error("Critical error fetching data:", error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
           toast.error("Gagal koneksi internet. Menggunakan data offline.");
        } else {
           toast.error("Gagal mengambil data: " + error.message);
        }
      } else {
        toast.error("Terjadi kesalahan saat memuat data");
      }
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (isLoggedIn) {
      fetchData(); // Initial fetch
      // Auto refresh every 30 seconds
      intervalId = setInterval(() => fetchData(false), 30000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoggedIn, fetchData]);

  const handleAddViolation = (newViolation: Violation) => {
    setViolations(prev => [newViolation, ...prev]);
    
    try {
      const localViolationsStr = localStorage.getItem('simpas_local_violations');
      let localViolations: any[] = localViolationsStr ? JSON.parse(localViolationsStr) : [];
      if (!Array.isArray(localViolations)) localViolations = [];
      
      const entry = { ...newViolation, _localTimestamp: Date.now() };
      localStorage.setItem('simpas_local_violations', JSON.stringify([...localViolations, entry]));
    } catch (e) {
      console.error("Failed to save to local storage", e);
    }
  };

  const handleUpdateViolation = (updatedViolation: Violation) => {
    setViolations(prev => prev.map(v => v.id === updatedViolation.id ? updatedViolation : v));
    
    try {
      const localViolationsStr = localStorage.getItem('simpas_local_violations');
      let localViolations: any[] = localViolationsStr ? JSON.parse(localViolationsStr) : [];
      if (!Array.isArray(localViolations)) localViolations = [];
      
      const entry = { ...updatedViolation, _localTimestamp: Date.now() };
      
      const idx = localViolations.findIndex((v: any) => v.id === updatedViolation.id);
      if (idx !== -1) {
          localViolations[idx] = entry;
      } else {
          localViolations.push(entry);
      }
      
      localStorage.setItem('simpas_local_violations', JSON.stringify(localViolations));
    } catch (e) {
      console.error("Failed to update local storage", e);
    }
  };

  // Derived state: Only violations that exist in the sheet (by ID)
  const sheetOnlyViolations = useMemo(() => {
    return violations.filter(v => sheetViolationIds.has(v.id));
  }, [violations, sheetViolationIds]);

  if (!isLoggedIn) {
    return (
      <>
        <Toaster position="bottom-right" />
        <Login onLogin={() => setIsLoggedIn(true)} />
      </>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" />
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={() => setIsLoggedIn(false)}
        onRefresh={() => {
          toast.dismiss();
          toast.loading("Sedang memuat data terbaru...", { duration: 1000 });
          fetchData(true);
        }}
        isRefreshing={isRefreshing}
      >
        {activeTab === 'dashboard' && (
          <Dashboard 
            violations={sheetOnlyViolations} 
            students={students} 
            onViewDetail={(id) => {
              // Placeholder for detailed view
            }}
          />
        )}
        {activeTab === 'input' && (
          <InputViolation 
            students={students} 
            violationsCount={violations.length}
            onAddViolation={handleAddViolation}
            onSuccess={() => setActiveTab('dashboard')}
          />
        )}
        {activeTab === 'tindak-lanjut' && (
          <FollowUp 
            violations={sheetOnlyViolations} 
            onUpdateViolation={handleUpdateViolation}
          />
        )}
        {activeTab === 'siswa' && (
          <StudentList 
            students={students} 
            violations={violations} 
          />
        )}
      </Layout>
    </>
  );
}