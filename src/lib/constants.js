import {
  Bell,
  ClipboardList,
  FileText,
  History,
  Home,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Layers,
} from 'lucide-react';

export const ROLE = {
  ADMIN: 'admin',
  SENSEI: 'sensei',
  STUDENT: 'student',
};

export const ATTENDANCE_STATUS_LABELS = {
  present: 'Hadir',
  late: 'Terlambat',
  leave: 'Izin',
  sick: 'Sakit',
  absent: 'Alpa',
  corrected: 'Dikoreksi',
};

export const REQUEST_STATUS_LABELS = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

export const ADMIN_NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: Home },
  { to: '/admin/students', label: 'Data Siswa', icon: Users },
  { to: '/admin/classes', label: 'Pengaturan Kelas', icon: Layers },
  { to: '/admin/attendance', label: 'Data Absensi', icon: ClipboardList },
  { to: '/admin/leave-requests', label: 'Izin & Sakit', icon: FileText },
  { to: '/admin/notifications', label: 'Notifikasi', icon: Bell },
  { to: '/admin/audit-logs', label: 'Audit Log', icon: ShieldCheck },
  { to: '/admin/reports', label: 'Laporan', icon: History },
  { to: '/admin/staff', label: 'Manajemen Staf', icon: ShieldCheck },
  { to: '/admin/settings', label: 'Pengaturan', icon: Settings },
];

export const SENSEI_NAV_ITEMS = [
  { to: '/admin/students', label: 'Data Siswa', icon: Users },
  { to: '/admin/attendance', label: 'Data Absensi', icon: ClipboardList },
  { to: '/admin/leave-requests', label: 'Izin & Sakit', icon: FileText },
  { to: '/admin/notifications', label: 'Notifikasi', icon: Bell },
];

export const STUDENT_NAV_ITEMS = [
  { to: '/student', label: 'Dashboard', icon: Home },
  { to: '/student/history', label: 'Riwayat', icon: History },
  { to: '/student/leave-request', label: 'Izin/Sakit', icon: FileText },
  { to: '/student/notifications', label: 'Notifikasi', icon: Bell },
  { to: '/student/profile', label: 'Profil', icon: UserRound },
];

export const DEFAULT_SETTINGS = {
  location_name: 'Kampus Utama',
  latitude: -6.2,
  longitude: 106.816666,
  radius_meters: 150,
  check_in_start: '07:00',
  present_cutoff: '08:00',
  late_cutoff: '08:30',
  check_in_end: '09:00',
  check_out_start: '16:00',
  check_out_end: '18:00',
  gps_accuracy_threshold: 100,
};

export const AUDIT_ACTION_OPTIONS = [
  'login',
  'logout',
  'student_create',
  'student_update',
  'student_account_create',
  'student_password_reset',
  'student_delete',
  'student_account_link',
  'attendance_check_in',
  'attendance_check_out',
  'attendance_reject_radius',
  'attendance_reject_time',
  'leave_request_submit',
  'leave_request_review',
  'attendance_manual_correction',
  'settings_update',
  'notification_create',
  'report_export',
  'password_change',
];

export const ATTENDANCE_TYPES = [
  { value: 'present', label: 'Hadir' },
  { value: 'late', label: 'Terlambat' },
  { value: 'leave', label: 'Izin' },
  { value: 'sick', label: 'Sakit' },
  { value: 'absent', label: 'Alpa' },
  { value: 'corrected', label: 'Dikoreksi' },
];

export const LEAVE_TYPE_OPTIONS = [
  { value: 'leave', label: 'Izin' },
  { value: 'sick', label: 'Sakit' },
];

export const SETTINGS_HELP_TEXT =
  'Koordinat, radius, dan jam absensi pada halaman ini menjadi aturan utama validasi absen masuk dan absen keluar. Setelah batas akhir absen masuk terlewati, siswa aktif yang belum mengisi absensi akan dianggap alpa.';
