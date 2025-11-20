import { Student, Violation } from '../types';

// Helper for robust CSV parsing that handles quotes and trimming
const parseCSVLine = (text: string): string[] => {
  const values: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    }
    
    // If it's a comma and we're NOT inside quotes, it's a separator
    if (char === ',' && !inQuotes) {
      values.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  // Push the last value
  values.push(currentValue);

  // Post-process values: trim whitespace and handle quotes
  return values.map(val => {
    let cleaned = val.trim();
    
    // If the value starts and ends with a quote, strip them
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
      // Handle escaped quotes: in CSV, double double-quotes ("") mean a single quote (")
      cleaned = cleaned.replace(/""/g, '"');
    }
    
    return cleaned;
  });
};

export const parseStudentsCSV = (csvText: string): Student[] => {
  const lines = csvText.split('\n');
  const students: Student[] = [];
  
  // Skip header row (index 0) and start reading from row 2 (index 1) as requested
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    
    if (values.length >= 6 && values[0] && values[1]) {
      students.push({
        nis: values[0],
        nama_lengkap: values[1],
        jenis_kelamin: values[2],
        kelas: values[3],
        nama_wali_kelas: values[4],
        kontak_ortu: values[5]
      });
    }
  }
  return students;
};

export const parseViolationsCSV = (csvText: string): Violation[] => {
  const lines = csvText.split('\n');
  const violations: Violation[] = [];
  
  // Start loop at 1 to skip the Header row (Row 0)
  // This fulfills the requirement "tampilkan datanya mulai dari baris ke2"
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    
    // Mapping based on Google Sheet Columns:
    // 0:nis, 1:nama, 2:jk, 3:kelas, 4:wali, 5:kontak, 
    // 6:kode_pelanggaran, 7:tanggal, 8:jenis, 9:kategori, 
    // 10:lokasi, 11:deskripsi, 12:status, 13:hasil, 14:poin
    
    if (values.length >= 10 && values[0]) {
      const kode = values[6] || `SHEET-${i}`;
      const tanggal = values[7];
      
      // ORDERING LOGIC:
      // Google Sheet CSV usually comes in order of entry (top to bottom).
      // To ensure "Recent Violations" shows the bottom-most rows first in a timestamp sort,
      // we add the row index (i) as seconds to the base date.
      const dateBase = tanggal && !isNaN(Date.parse(tanggal)) ? new Date(tanggal).getTime() : Date.now();
      const stableDate = new Date(dateBase + i * 1000).toISOString();

      violations.push({
        id: kode, // Stable ID from sheet
        nis: values[0],
        nama_lengkap: values[1],
        jenis_kelamin: values[2],
        kelas: values[3],
        nama_wali_kelas: values[4],
        kontak_ortu: values[5],
        kode_pelanggaran: kode,
        tanggal_pelanggaran: tanggal,
        jenis_pelanggaran: values[8],
        kategori_pelanggaran: (values[9] as any) || 'Ringan',
        lokasi_kejadian: values[10],
        deskripsi: values[11],
        status_tindak_lanjut: (values[12] as any) || 'Menunggu Tindak Lanjut',
        hasil_tindak_lanjut: values[13] || '',
        poin_pelanggaran: parseInt(values[14]) || 0,
        created_at: stableDate // Used for sorting
      });
    }
  }
  return violations;
};