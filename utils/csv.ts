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
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    
    // Mapping based on Google Sheet Columns:
    // 0:nis, 1:nama, 2:jk, 3:kelas, 4:wali, 5:kontak, 
    // 6:kode_pelanggaran, 7:tanggal, 8:jenis, 9:kategori, 
    // 10:lokasi, 11:deskripsi, 12:status, 13:hasil, 14:poin
    // 15: pelapor (Column P)
    
    if (values.length >= 10 && values[0]) {
      const kode = values[6] || `SHEET-${i}`;
      const tanggal = values[7];
      
      let dateBase = Date.now();
      
      // Robust Date Parsing
      if (tanggal) {
          const standardParse = Date.parse(tanggal);
          if (!isNaN(standardParse)) {
              dateBase = standardParse;
          } else {
              const parts = tanggal.split(/[/-]/);
              if (parts.length === 3) {
                  const p1 = parseInt(parts[0]);
                  const p2 = parseInt(parts[1]);
                  const p3 = parseInt(parts[2]);
                  
                  if (p1 <= 31 && p2 <= 12 && p3 > 1000) {
                      dateBase = new Date(p3, p2 - 1, p1).getTime();
                  } 
                  else if (p1 > 1000 && p2 <= 12 && p3 <= 31) {
                      dateBase = new Date(p1, p2 - 1, p3).getTime();
                  }
              }
          }
      }
      
      const stableDate = new Date(dateBase + i * 1000).toISOString();

      violations.push({
        id: kode, 
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
        pelapor: values[15] || '', // Reading from column 15 (P)
        created_at: stableDate 
      });
    }
  }
  return violations;
};