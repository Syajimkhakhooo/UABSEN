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
      return Response.json({ error: 'Hanya admin yang dapat membuat akun siswa.' }, { status: 403, headers: corsHeaders });
    }

    const payload = await request.json();
    const { student_id, email, password } = payload;

    if (!student_id || !email || !password) {
      return Response.json({ error: 'student_id, email, dan password wajib diisi.' }, { status: 400, headers: corsHeaders });
    }

    const { data: student, error: studentError } = await adminClient
      .from('students')
      .select('id, name, active')
      .eq('id', student_id)
      .single();

    if (studentError || !student) {
      return Response.json({ error: 'Data siswa tidak ditemukan.' }, { status: 404, headers: corsHeaders });
    }

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('student_id', student_id)
      .eq('role', 'student')
      .maybeSingle();

    if (existingProfileError) {
      return Response.json({ error: existingProfileError.message }, { status: 400, headers: corsHeaders });
    }

    if (existingProfile) {
      return Response.json({ error: 'Siswa ini sudah memiliki akun login tertaut.' }, { status: 409, headers: corsHeaders });
    }

    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createUserError || !createdUser.user) {
      return Response.json(
        { error: createUserError?.message ?? 'Gagal membuat user auth.' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { error: profileUpsertError } = await adminClient.from('profiles').upsert(
      {
        auth_user_id: createdUser.user.id,
        student_id,
        role: 'student',
        active: student.active,
      },
      { onConflict: 'auth_user_id' },
    );

    if (profileUpsertError) {
      await adminClient.auth.admin.deleteUser(createdUser.user.id);
      return Response.json({ error: profileUpsertError.message }, { status: 400, headers: corsHeaders });
    }

    await adminClient.from('notifications').insert({
      recipient_auth_user_id: createdUser.user.id,
      title: 'Akun UABSEN dibuat',
      message: `Admin telah membuat akun login UABSEN untuk ${student.name}.`,
      event_type: 'admin_announcement',
      created_by_auth_user_id: user.id,
    });

    await adminClient.from('audit_logs').insert({
      actor_auth_user_id: user.id,
      action: 'student_account_link',
      description: 'Admin membuat akun auth dan menautkannya ke data siswa.',
      metadata: {
        student_id,
        auth_user_id: createdUser.user.id,
        email,
      },
    });

    return Response.json({
      message: 'Akun siswa berhasil dibuat dan ditautkan.',
      auth_user_id: createdUser.user.id,
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message ?? 'Terjadi kesalahan.' }, { status: 500, headers: corsHeaders });
  }
});
