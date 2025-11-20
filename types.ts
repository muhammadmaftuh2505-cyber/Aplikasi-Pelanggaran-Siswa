export interface Student {
  nis: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  kelas: string;
  nama_wali_kelas: string;
  kontak_ortu: string;
}

export interface Violation {
  id: string; // Internal ID
  nis: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  kelas: string;
  nama_wali_kelas: string;
  kontak_ortu: string;
  kode_pelanggaran: string;
  tanggal_pelanggaran: string;
  jenis_pelanggaran: string;
  kategori_pelanggaran: 'Ringan' | 'Sedang' | 'Berat';
  poin_pelanggaran: number;
  lokasi_kejadian: string;
  deskripsi: string;
  status_tindak_lanjut: 'Menunggu Tindak Lanjut' | 'Sudah Ditindak Lanjut';
  hasil_tindak_lanjut: string;
  created_at: string;
}

export type ViolationCategory = Violation['kategori_pelanggaran'];

export interface ViolationTypeOption {
  label: string;
  kategori: ViolationCategory;
  poin: number;
}

export const VIOLATION_TYPES: ViolationTypeOption[] = [
  // Ringan
  { label: "Terlambat masuk kelas", kategori: "Ringan", poin: 5 },
  { label: "Tidak mengerjakan PR", kategori: "Ringan", poin: 5 },
  { label: "Tidak membawa buku pelajaran", kategori: "Ringan", poin: 3 },
  { label: "Ribut di kelas", kategori: "Ringan", poin: 5 },
  { label: "Tidak memakai atribut lengkap", kategori: "Ringan", poin: 5 },
  { label: "Membuang sampah sembarangan", kategori: "Ringan", poin: 5 },
  // Sedang
  { label: "Tidak masuk tanpa keterangan", kategori: "Sedang", poin: 15 },
  { label: "Keluar kelas tanpa izin", kategori: "Sedang", poin: 10 },
  { label: "Menyontek saat ujian", kategori: "Sedang", poin: 20 },
  { label: "Berbohong kepada guru", kategori: "Sedang", poin: 15 },
  { label: "Merusak fasilitas sekolah", kategori: "Sedang", poin: 20 },
  { label: "Membawa HP tanpa izin", kategori: "Sedang", poin: 15 },
  { label: "Tidak mengikuti upacara", kategori: "Sedang", poin: 10 },
  // Berat
  { label: "Berkelahi dengan teman", kategori: "Berat", poin: 50 },
  { label: "Membully teman", kategori: "Berat", poin: 40 },
  { label: "Merokok di area sekolah", kategori: "Berat", poin: 50 },
  { label: "Membawa barang terlarang", kategori: "Berat", poin: 75 },
  { label: "Memalsukan tanda tangan", kategori: "Berat", poin: 30 },
  { label: "Mencuri", kategori: "Berat", poin: 75 },
  { label: "Melawan/Kasar kepada guru", kategori: "Berat", poin: 100 },
];
