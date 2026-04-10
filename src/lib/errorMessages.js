export function toUserMessage(error, fallbackMessage = 'Terjadi kendala pada sistem. Coba lagi sebentar.') {
  const rawMessage = String(error?.message ?? '').trim();
  const message = rawMessage.replace(/^\[timeout\]\s*/i, '').trim();
  const normalized = message.toLowerCase();

  if (!message) {
    return fallbackMessage;
  }

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid_credentials') ||
    normalized.includes('invalid email or password')
  ) {
    return 'Email atau kata sandi salah. Cek kembali lalu coba login lagi.';
  }

  if (normalized.includes('too many requests')) {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('fetch')
  ) {
    return 'Koneksi ke server sedang bermasalah. Periksa internet Anda lalu coba lagi.';
  }

  if (normalized.includes('profiles.role')) {
    return 'Peran akun ini belum diatur. Silakan hubungi admin untuk melengkapi akses akun.';
  }

  if (normalized.includes('profiles.student_id')) {
    return 'Akun ini belum terhubung ke data siswa. Silakan hubungi admin untuk melengkapi akses akun.';
  }

  if (
    normalized.includes('schema cache') ||
    normalized.includes('could not find the function') ||
    normalized.includes('edge function') ||
    normalized.includes('row-level security') ||
    normalized.includes('permission denied') ||
    normalized.includes('jwt') ||
    normalized.includes('public.') ||
    normalized.includes('supabase') ||
    normalized.includes('postgres') ||
    normalized.includes('relation ') ||
    normalized.includes('column ')
  ) {
    return 'Sistem sedang dalam penyesuaian. Coba lagi sebentar atau hubungi admin jika masalah berlanjut.';
  }

  return message || fallbackMessage;
}
