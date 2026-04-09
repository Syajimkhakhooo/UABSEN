import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const adminClient = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        {
          error:
            'Konfigurasi Edge Function belum lengkap. SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak tersedia di server.',
        },
        { status: 500, headers: corsHeaders },
      );
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return Response.json({ error: 'Token otorisasi tidak ditemukan.' }, { status: 401, headers: corsHeaders });
    }

    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(token);

    if (authError || !user) {
      return Response.json({ error: 'Sesi admin tidak valid.' }, { status: 401, headers: corsHeaders });
    }

    const { data: requesterProfile, error: requesterProfileError } = await adminClient
      .from('profiles')
      .select('role, active')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (requesterProfileError) {
      return Response.json({ error: requesterProfileError.message }, { status: 400, headers: corsHeaders });
    }

    if (!requesterProfile || requesterProfile.role !== 'admin' || requesterProfile.active === false) {
      return Response.json({ error: 'Hanya admin yang dapat mereset password siswa.' }, { status: 403, headers: corsHeaders });
    }

    const payload = await request.json();
    const { student_id, password } = payload ?? {};
    const normalizedPassword = typeof password === 'string' ? password.trim() : '';

    if (!student_id || !normalizedPassword) {
      return Response.json({ error: 'student_id dan password wajib diisi.' }, { status: 400, headers: corsHeaders });
    }

    if (normalizedPassword.length < 6) {
      return Response.json({ error: 'Password baru minimal 6 karakter.' }, { status: 400, headers: corsHeaders });
    }

    const { data: studentProfile, error: studentProfileError } = await adminClient
      .from('profiles')
      .select('auth_user_id, student_id, role, students(name)')
      .eq('student_id', student_id)
      .eq('role', 'student')
      .maybeSingle();

    if (studentProfileError) {
      return Response.json({ error: studentProfileError.message }, { status: 400, headers: corsHeaders });
    }

    if (!studentProfile?.auth_user_id) {
      return Response.json({ error: 'Siswa ini belum memiliki akun login tertaut.' }, { status: 404, headers: corsHeaders });
    }

    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      studentProfile.auth_user_id,
      {
        password: normalizedPassword,
      },
    );

    if (updateError || !updatedUser.user) {
      return Response.json(
        { error: updateError?.message ?? 'Gagal memperbarui password akun siswa.' },
        { status: 400, headers: corsHeaders },
      );
    }

    await adminClient.from('notifications').insert({
      recipient_auth_user_id: studentProfile.auth_user_id,
      title: 'Password akun direset admin',
      message: 'Admin telah mereset password akun Anda. Gunakan password terbaru saat login, lalu segera ubah lagi dari halaman profil.',
      event_type: 'admin_announcement',
      created_by_auth_user_id: user.id,
    });

    await adminClient.from('audit_logs').insert({
      actor_auth_user_id: user.id,
      action: 'student_password_reset',
      description: 'Admin mereset password akun siswa.',
      metadata: {
        student_id,
        auth_user_id: studentProfile.auth_user_id,
        student_name: studentProfile.students?.name ?? null,
      },
    });

    return Response.json(
      {
        message: 'Password akun siswa berhasil direset.',
        auth_user_id: updatedUser.user.id,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json({ error: error.message ?? 'Terjadi kesalahan.' }, { status: 500, headers: corsHeaders });
  }
});
