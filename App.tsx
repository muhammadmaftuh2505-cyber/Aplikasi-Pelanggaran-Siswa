import React, { useState, useEffect, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);

    try {
      const timestamp = Date.now();
      
      // 1. Fetch Students
      // Removed custom headers (cache: 'no-store') to avoid CORS preflight issues with Google Sheets
      const resStudents = await fetch(`${GOOGLE_SHEET_STUDENTS}&t=${timestamp}`);
      if (!resStudents.ok) throw new Error(`Gagal mengambil data siswa (${resStudents.status})`);
      const textStudents = await resStudents.text();
      const parsedStudents = parseStudentsCSV(textStudents);
      setStudents(parsedStudents);

      // 2. Fetch Violations
      const resViolations = await fetch(`${GOOGLE_SHEET_VIOLATIONS}&t=${timestamp}`);
      if (!resViolations.ok) throw new Error(`Gagal mengambil data pelanggaran (${resViolations.status})`);
      const textViolations = await resViolations.text();
      // Parsing logic ensures we start from 2nd row (index 1)
      const parsedViolations = parseViolationsCSV(textViolations);
      
      // 3. Merge with local storage (Optimistic updates)
      const localViolationsStr = localStorage.getItem('simpas_local_violations');
      const localViolations: Violation[] = localViolationsStr ? JSON.parse(localViolationsStr) : [];
      
      const violationMap = new Map<string, Violation>();
      parsedViolations.forEach(v => violationMap.set(v.kode_pelanggaran, v));

      const mergedViolations = [...parsedViolations];

      localViolations.forEach(localV => {
        if (!violationMap.has(localV.kode_pelanggaran)) {
          mergedViolations.push(localV);
        } else {
          const sheetV = violationMap.get(localV.kode_pelanggaran);
          if (sheetV && sheetV.status_tindak_lanjut !== localV.status_tindak_lanjut) {
            const idx = mergedViolations.findIndex(v => v.kode_pelanggaran === localV.kode_pelanggaran);
            if (idx !== -1) mergedViolations[idx] = localV;
          }
        }
      });
      
      setViolations(mergedViolations);
      
      if (isManual) {
        toast.success("Data berhasil diperbarui");
      }
      
    } catch (error) {
      console.error("Failed to fetch data from Google Sheets", error);
      if (error instanceof Error) {
        // More user-friendly error message
        if (error.message.includes('Failed to fetch')) {
           toast.error("Gagal koneksi ke Google Sheets. Periksa internet anda.");
        } else {
           toast.error("Gagal mengambil data: " + error.message);
        }
      } else {
        toast.error("Gagal koneksi ke Google Sheets");
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
      intervalId = setInterval(() => fetchData(), 30000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoggedIn, fetchData]);

  const handleAddViolation = (newViolation: Violation) => {
    setViolations(prev => [newViolation, ...prev]);
    const localViolationsStr = localStorage.getItem('simpas_local_violations');
    const localViolations: Violation[] = localViolationsStr ? JSON.parse(localViolationsStr) : [];
    localStorage.setItem('simpas_local_violations', JSON.stringify([...localViolations, newViolation]));
  };

  const handleUpdateViolation = (updatedViolation: Violation) => {
    setViolations(prev => prev.map(v => v.id === updatedViolation.id ? updatedViolation : v));
    const localViolationsStr = localStorage.getItem('simpas_local_violations');
    if (localViolationsStr) {
       const localViolations: Violation[] = JSON.parse(localViolationsStr);
       const idx = localViolations.findIndex(v => v.id === updatedViolation.id);
       if (idx !== -1) localViolations[idx] = updatedViolation;
       else localViolations.push(updatedViolation);
       localStorage.setItem('simpas_local_violations', JSON.stringify(localViolations));
    }
  };

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
        onRefresh={() => fetchData(true)}
        isRefreshing={isRefreshing}
      >
        {activeTab === 'dashboard' && (
          <Dashboard 
            violations={violations} 
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
            violations={violations} 
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