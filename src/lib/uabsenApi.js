import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

const AUTH_TIMEOUT_MS = 5000;
const AUTH_MUTATION_TIMEOUT_MS = 15000;
const CREATE_ACCOUNT_TIMEOUT_MS = 7000;
const EDGE_FUNCTION_TIMEOUT_MS = 15000;

let lastEnsuredDailyAbsencesKey = '';

function normalizeError(error, fallbackMessage) {
  if (!error) {
    return new Error(fallbackMessage);
  }

  return error instanceof Error ? error : new Error(error.message ?? fallbackMessage);
}

async function readEdgeFunctionErrorBody(error) {
  const response = error?.context ?? error?.response;

  if (!response || typeof response.clone !== 'function') {
    return '';
  }

  try {
    const clonedResponse = response.clone();
    const contentType = clonedResponse.headers?.get?.('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const payload = await clonedResponse.json();
      return payload?.error ?? payload?.message ?? '';
    }

    return (await clonedResponse.text())?.trim() ?? '';
  } catch {
    return '';
  }
}

async function normalizeEdgeFunctionError(error, fallbackMessage) {
  if (!error) {
    return new Error(fallbackMessage);
  }

  const response = error?.context ?? error?.response;
  const bodyMessage = await readEdgeFunctionErrorBody(error);
  const status = response?.status;

  if (bodyMessage) {
    return new Error(bodyMessage);
  }

  if (status === 401) {
    return new Error('Sesi admin tidak valid. Silakan login ulang lalu coba lagi.');
  }

  if (status === 403) {
    return new Error('Akses ditolak. Hanya admin aktif yang dapat menjalankan aksi ini.');
  }

  if (status === 404) {
    return new Error('Resource Edge Function tidak ditemukan atau data akun siswa belum tersedia.');
  }

  return normalizeError(error, fallbackMessage);
}

function getJakartaDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
  }).format(new Date());
}

function isMissingEdgeFunctionError(error) {
  const name = error?.name ?? '';
  const message = error?.message ?? '';

  return (
    name === 'FunctionsFetchError' ||
    name === 'FunctionsRelayError' ||
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('edge function') ||
    message.includes('404')
  );
}

function createTransientAuthClient() {
  return createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `uabsen-temp-student-${Date.now()}`,
    },
  });
}

async function ensureSuccess(promise, fallbackMessage) {
  const { data, error } = await promise;
  if (error) {
    throw normalizeError(error, fallbackMessage);
  }
  return data;
}

async function withTimeout(promise, timeoutMs, fallbackMessage) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(fallbackMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function ensureDailyAbsencesIfPossible() {
  if (!supabase) {
    return;
  }

  const todayKey = getJakartaDateKey();
  if (lastEnsuredDailyAbsencesKey === todayKey) {
    return;
  }

  const { error } = await supabase.rpc('ensure_daily_absences');

  if (error) {
    console.warn('Gagal atau belum tersedia generate alpa otomatis.', error.message ?? error);
    return;
  }

  lastEnsuredDailyAbsencesKey = todayKey;
}

export async function fetchProfile(authUser) {
  // Ambil profil dulu untuk dapatkan student_id
  const profile = await ensureSuccess(
    supabase
      .from('profiles')
      .select('id, auth_user_id, student_id, role, active')
      .eq('auth_user_id', authUser.id)
      .maybeSingle(),
    'Data profile tidak ditemukan.',
  );

  // Jika ada student_id, ambil data siswa — sudah diketahui saat ambil profile
  // Kalau tidak ada student_id, skip query siswa sama sekali
  const student = profile?.student_id
    ? await ensureSuccess(
        supabase.from('students').select('*').eq('id', profile.student_id).maybeSingle(),
        'Data siswa tidak ditemukan.',
      )
    : null;

  return {
    id: profile?.id ?? authUser?.id ?? null,
    auth_user_id: authUser?.id ?? null,
    role: profile?.role ?? null,
    active:
      (profile?.active ?? true) &&
      (profile?.role === 'student' ? (student?.active ?? true) : true),
    student_id: profile?.student_id ?? student?.id ?? null,
    students: student ?? null,
  };
}

export async function logAudit(action, description, metadata = {}) {
  try {
    const {
      data: { user },
    } = await withTimeout(
      supabase.auth.getUser(),
      AUTH_TIMEOUT_MS,
      '[Timeout] Verifikasi user untuk audit log terlalu lama.',
    );

    if (!user) return;

    const { error } = await supabase.from('audit_logs').insert({
      actor_auth_user_id: user.id,
      action,
      description,
      metadata,
    });
    if (error) {
      console.error('Gagal menyimpan audit log', error);
    }
  } catch (error) {
    console.error('Gagal menyiapkan audit log', error);
  }
}

export async function getAdminDashboardData() {
  const today = new Date().toISOString().slice(0, 10);
  await ensureDailyAbsencesIfPossible();
  const [students, todayAttendance, pendingRequests, recentAudit] = await Promise.all([
    ensureSuccess(
      supabase.from('students').select('id, active, created_at', { count: 'exact' }),
      'Gagal memuat data siswa.',
    ),
    ensureSuccess(
      supabase
        .from('attendances')
        .select('id, attendance_status, attendance_date, students(name, student_number)')
        .eq('attendance_date', today)
        .order('created_at', { ascending: false })
        .limit(8),
      'Gagal memuat absensi hari ini.',
    ),
    ensureSuccess(
      supabase.from('leave_requests').select('id', { count: 'exact' }).eq('review_status', 'pending'),
      'Gagal memuat pengajuan izin/sakit.',
    ),
    ensureSuccess(
      supabase
        .from('audit_logs')
        .select('id, action, description, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
      'Gagal memuat audit log.',
    ),
  ]);

  return {
    stats: {
      totalStudents: students.length,
      activeStudents: students.filter((student) => student.active).length,
      presentCount: todayAttendance.filter((item) =>
        ['present', 'late', 'corrected'].includes(item.attendance_status),
      ).length,
      pendingRequests: pendingRequests.length,
    },
    todayAttendance,
    recentAudit,
  };
}

export async function getStudentDashboardData(studentId) {
  const today = new Date().toISOString().slice(0, 10);
  await ensureDailyAbsencesIfPossible();
  const [todayAttendance, recentHistory, recentRequests] = await Promise.all([
    ensureSuccess(
      supabase
        .from('attendances')
        .select('*')
        .eq('student_id', studentId)
        .eq('attendance_date', today)
        .maybeSingle(),
      'Gagal memuat absensi hari ini.',
    ),
    ensureSuccess(
      supabase
        .from('attendances')
        .select('*')
        .eq('student_id', studentId)
        .order('attendance_date', { ascending: false })
        .limit(6),
      'Gagal memuat riwayat absensi.',
    ),
    ensureSuccess(
      supabase
        .from('leave_requests')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5),
      'Gagal memuat pengajuan terakhir.',
    ),
  ]);

  return { todayAttendance, recentHistory, recentRequests };
}

export async function listStudents(search = '') {
  let query = supabase
    .from('students')
    .select('id, student_number, name, phone, address, training_program, active, created_at')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,student_number.ilike.%${search}%,training_program.ilike.%${search}%`,
    );
  }

  const students = await ensureSuccess(query, 'Gagal memuat data siswa.');

  if (!students.length) {
    return [];
  }

  const profileRows = await ensureSuccess(
    supabase
      .from('profiles')
      .select('id, auth_user_id, student_id, role, active')
      .in(
        'student_id',
        students.map((student) => student.id),
      ),
    'Gagal memuat relasi akun siswa.',
  );

  const profileMap = new Map(profileRows.map((profile) => [profile.student_id, profile]));

  return students.map((student) => {
    const linkedProfile = profileMap.get(student.id);
    return {
      ...student,
      auth_user_id: linkedProfile?.auth_user_id ?? null,
      profile_id: linkedProfile?.id ?? null,
    };
  });
}

export async function saveStudent(student) {
  const payload = {
    student_number: student.student_number,
    name: student.name,
    phone: student.phone,
    address: student.address,
    training_program: student.training_program,
    active: student.active,
  };

  if (student.id) {
    return ensureSuccess(
      supabase.from('students').update(payload).eq('id', student.id).select().single(),
      'Gagal memperbarui data siswa.',
    );
  }

  return ensureSuccess(
    supabase.from('students').insert(payload).select().single(),
    'Gagal membuat data siswa.',
  );
}

export async function createStudentAccount(payload) {
  const { data: { user: adminUser } } = await withTimeout(
    supabase.auth.getUser(),
    AUTH_TIMEOUT_MS,
    '[Timeout] Supabase getUser (Verifikasi Sesi Admin) tidak merespons.'
  );
  if (!adminUser) throw new Error('Sesi/akun admin tidak ditemukan.');

  const adminUserId = adminUser.id;

  // Get student data first
  const student = await withTimeout(
    ensureSuccess(
      supabase.from('students').select('id, name, active').eq('id', payload.student_id).single(),
      'Gagal memuat data siswa.'
    ),
    AUTH_TIMEOUT_MS,
    '[Timeout] Load data siswa tertahan.'
  );

  if (!student) throw new Error('Data siswa tidak ditemukan.');

  const normalizedPayload = {
    ...payload,
    email: payload.email.trim().toLowerCase(),
  };

  let newUserId = null;

  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('create-student-account', {
        body: normalizedPayload,
      }),
      EDGE_FUNCTION_TIMEOUT_MS,
      '[Timeout] Edge Function create-student-account tidak merespons.',
    );

    if (error) {
      throw await normalizeEdgeFunctionError(error, 'Gagal membuat akun login siswa.');
    }

    if (!data?.auth_user_id) {
      throw new Error('Edge Function tidak mengembalikan auth_user_id.');
    }

    return {
      message: data.message ?? 'Akun siswa berhasil dibuat dan ditautkan.',
      auth_user_id: data.auth_user_id,
    };
  } catch (error) {
    if (!isMissingEdgeFunctionError(error)) {
      throw error;
    }
  }

  const authClient = createTransientAuthClient();
  const {
    data: signUpData,
    error: signUpError,
  } = await withTimeout(
    authClient.auth.signUp({
      email: normalizedPayload.email,
      password: normalizedPayload.password,
    }),
    CREATE_ACCOUNT_TIMEOUT_MS,
    '[Timeout] Pembuatan akun di Auth server tertahan.',
  );

  if (signUpError) {
    throw normalizeError(signUpError, 'Gagal membuat akun login siswa.');
  }

  if (!signUpData?.user || signUpData.user.identities?.length === 0) {
    throw new Error('Gagal membuat akun login siswa. Email mungkin sudah terdaftar.');
  }

  newUserId = signUpData.user.id;

  // Kembali menggunakan client utama (sebagai admin) untuk memanipulasi database
  await withTimeout(
    ensureSuccess(
      supabase.from('profiles').upsert(
        {
          auth_user_id: newUserId,
          student_id: payload.student_id,
          role: 'student',
          active: student.active,
        },
        { onConflict: 'auth_user_id' }
      ),
      'Gagal menautkan akun login ke profil siswa.'
    ),
    AUTH_TIMEOUT_MS,
    '[Timeout] Proses penautan profil tertahan di database.'
  );

  // Kirim notifikasi sambutan ke siswa
  await withTimeout(
    ensureSuccess(
      supabase.from('notifications').insert({
        recipient_auth_user_id: newUserId,
        title: 'Akun UABSEN dibuat',
        message: `Admin telah membuat akun login UABSEN untuk ${student.name}.`,
        event_type: 'admin_announcement',
        created_by_auth_user_id: adminUserId,
      }),
      'Gagal mengirim notifikasi pembuatan akun.'
    ),
    AUTH_TIMEOUT_MS,
    '[Timeout] Proses pengiriman notifikasi tertahan.'
  );

  return {
    message: 'Akun siswa berhasil dibuat dan ditautkan.',
    auth_user_id: newUserId,
  };
}

export async function changeOwnPassword(nextPassword) {
  const { data, error } = await withTimeout(
    supabase.auth.updateUser({ password: nextPassword }),
    AUTH_MUTATION_TIMEOUT_MS,
    '[Timeout] Proses ganti password terlalu lama. Coba tunggu beberapa detik lalu ulangi.',
  );

  if (error) {
    throw normalizeError(error, 'Gagal memperbarui password.');
  }

  await logAudit('password_change', 'Pengguna memperbarui password akunnya sendiri.');
  return data;
}

export async function resetStudentPassword(payload) {
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('reset-student-password', {
        body: {
          student_id: payload.student_id,
          password: payload.password,
        },
      }),
      EDGE_FUNCTION_TIMEOUT_MS,
      '[Timeout] Reset password siswa tertahan.',
    );

    if (error) {
      throw await normalizeEdgeFunctionError(error, 'Gagal mereset password siswa.');
    }

    return data;
  } catch (error) {
    if (isMissingEdgeFunctionError(error)) {
      throw new Error(
        'Edge Function `reset-student-password` belum dideploy di Supabase. Deploy function itu dulu, lalu coba lagi.',
      );
    }

    throw error;
  }
}

export async function deleteStudent(studentId) {
  const { error } = await supabase.rpc('delete_student_and_account', {
    target_student_id: studentId,
  });

  if (error) {
    if ((error.message ?? '').includes('Could not find the function public.delete_student_and_account')) {
      throw new Error(
        'Fungsi hapus siswa belum ada di database Supabase. Jalankan SQL file `supabase/delete-student-account-function.sql` dulu di SQL Editor, lalu coba hapus lagi.',
      );
    }

    throw new Error(error.message ?? 'Gagal menghapus siswa. Pastikan Anda sudah menjalankan SQL fungsi hapusnya di Supabase.');
  }

  return true;
}

export async function listAttendance(filters = {}) {
  await ensureDailyAbsencesIfPossible();

  let query = supabase
    .from('attendances')
    .select(
      'id, student_id, attendance_date, attendance_status, check_in_at, check_out_at, correction_note, students(name, student_number)',
    )
    .order('attendance_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.studentId) query = query.eq('student_id', filters.studentId);
  if (filters.status) query = query.eq('attendance_status', filters.status);
  if (filters.dateFrom) query = query.gte('attendance_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('attendance_date', filters.dateTo);

  return ensureSuccess(query, 'Gagal memuat data absensi.');
}

export async function performAttendanceAction(action, latitude, longitude, accuracy) {
  return ensureSuccess(
    supabase.rpc('perform_attendance_action', {
      action_name: action,
      input_latitude: latitude,
      input_longitude: longitude,
      input_accuracy: accuracy ?? null,
    }),
    'Gagal memproses absensi.',
  );
}

export async function manualCorrectAttendance(payload) {
  return ensureSuccess(
    supabase.rpc('manual_correct_attendance', {
      attendance_id_input: payload.attendance_id,
      new_status: payload.attendance_status,
      new_check_in_at: payload.check_in_at || null,
      new_check_out_at: payload.check_out_at || null,
      correction_note_input: payload.correction_note,
    }),
    'Gagal melakukan koreksi absensi.',
  );
}

export async function listLeaveRequests(filters = {}) {
  let query = supabase
    .from('leave_requests')
    .select('*, students(name, student_number)')
    .order('created_at', { ascending: false });

  if (filters.studentId) query = query.eq('student_id', filters.studentId);
  if (filters.reviewStatus) query = query.eq('review_status', filters.reviewStatus);

  return ensureSuccess(query, 'Gagal memuat pengajuan izin/sakit.');
}

export async function submitLeaveRequest(payload) {
  return withTimeout(
    ensureSuccess(
      supabase.rpc('submit_leave_request', {
        request_type_input: payload.request_type,
        start_date_input: payload.start_date,
        end_date_input: payload.end_date,
        reason_input: payload.reason,
      }),
      'Gagal mengirim pengajuan izin/sakit.',
    ),
    15000,
    'Pengajuan terlalu lama diproses. Coba lagi sebentar lagi.',
  );
}

export async function reviewLeaveRequest(payload) {
  return ensureSuccess(
    supabase.rpc('review_leave_request', {
      leave_request_id_input: payload.id,
      review_status_input: payload.review_status,
      review_note_input: payload.review_note || null,
    }),
    'Gagal memproses pengajuan izin/sakit.',
  );
}

export async function listNotifications(filters = {}) {
  let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });

  // Baik admin maupun siswa: filter berdasarkan recipient_auth_user_id
  // Admin akan menerima notif yang dikirim notifyAdmins (recipient = auth_user_id admin)
  if (filters.authUserId) {
    query = query.eq('recipient_auth_user_id', filters.authUserId);
  }

  return ensureSuccess(query, 'Gagal memuat notifikasi.');
}

/**
 * Kirim notifikasi ke semua admin.
 * Cara kerja: ambil semua auth_user_id yang punya role='admin' dari tabel profiles,
 * lalu insert satu baris notif per admin dengan recipient_auth_user_id yang benar.
 * Ini RLS-safe karena recipient_auth_user_id selalu terisi (tidak null).
 */
export async function notifyAdmins(title, message, eventType = 'admin_alert') {
  // 1. Ambil semua admin
  const { data: adminProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('auth_user_id')
    .eq('role', 'admin');

  if (profileError || !adminProfiles?.length) {
    console.warn('Tidak ada admin ditemukan atau gagal query:', profileError?.message);
    return;
  }

  // 2. Buat satu baris notif per admin
  const rows = adminProfiles.map((admin) => ({
    title,
    message,
    event_type: eventType,
    recipient_auth_user_id: admin.auth_user_id,
    is_read: false,
  }));

  const { error: insertError } = await supabase.from('notifications').insert(rows);

  if (insertError) {
    console.error('Gagal mengirim notifikasi ke admin:', insertError.message);
  }
}

export async function markNotificationRead(notificationId) {
  return ensureSuccess(
    supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId),
    'Gagal menandai notifikasi.',
  );
}

export async function markAllNotificationsRead(authUserId) {
  return ensureSuccess(
    supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('recipient_auth_user_id', authUserId)
      .eq('is_read', false),
    'Gagal menandai semua notifikasi.',
  );
}

export async function sendAnnouncement(payload) {
  if (payload.broadcast) {
    return ensureSuccess(
      supabase.rpc('broadcast_notification', {
        notification_title: payload.title,
        notification_message: payload.message,
      }),
      'Gagal mengirim broadcast.',
    );
  }

  return ensureSuccess(
    supabase
      .from('notifications')
      .insert({
        title: payload.title,
        message: payload.message,
        event_type: 'admin_announcement',
        recipient_auth_user_id: payload.recipient_auth_user_id,
      })
      .select()
      .single(),
    'Gagal mengirim notifikasi.',
  );
}

export async function listAuditLogs(filters = {}) {
  let query = supabase
    .from('audit_logs')
    .select('id, action, description, metadata, created_at')
    .order('created_at', { ascending: false });

  if (filters.action) query = query.eq('action', filters.action);
  if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00`);
  if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59`);

  return ensureSuccess(query, 'Gagal memuat audit log.');
}

export async function getAttendanceSettings() {
  const [settings, attendancePoint] = await Promise.all([
    ensureSuccess(
      supabase.from('attendance_settings').select('*').limit(1).maybeSingle(),
      'Gagal memuat pengaturan absensi.',
    ),
    ensureSuccess(
      supabase.from('attendance_points').select('*').eq('is_active', true).limit(1).maybeSingle(),
      'Gagal memuat titik absensi aktif.',
    ),
  ]);

  return { settings, attendancePoint };
}

export async function saveAttendanceSettings(payload) {
  const settingsPromise = supabase.from('attendance_settings').upsert(
    {
      id: payload.settings_id ?? undefined,
      check_in_start: payload.check_in_start,
      present_cutoff: payload.present_cutoff,
      late_cutoff: payload.late_cutoff,
      check_in_end: payload.check_in_end,
      check_out_start: payload.check_out_start,
      check_out_end: payload.check_out_end,
      gps_accuracy_threshold: payload.gps_accuracy_threshold,
    },
    { onConflict: 'id' },
  );

  const pointPromise = supabase.from('attendance_points').upsert(
    {
      id: payload.point_id ?? undefined,
      name: payload.location_name,
      latitude: payload.latitude,
      longitude: payload.longitude,
      radius_meters: payload.radius_meters,
      is_active: true,
    },
    { onConflict: 'id' },
  );

  const [{ error: settingsError }, { error: pointError }] = await Promise.all([
    settingsPromise,
    pointPromise,
  ]);

  if (settingsError || pointError) {
    throw normalizeError(settingsError ?? pointError, 'Gagal menyimpan pengaturan absensi.');
  }

  return true;
}
