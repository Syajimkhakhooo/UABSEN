drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.audit_logs cascade;
drop table if exists public.notifications cascade;
drop table if exists public.leave_requests cascade;
drop table if exists public.attendances cascade;
drop table if exists public.attendance_settings cascade;
drop table if exists public.attendance_points cascade;
drop table if exists public.profiles cascade;
drop table if exists public.students cascade;

drop function if exists public.handle_new_auth_user() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.current_profile_id() cascade;
drop function if exists public.current_role() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.haversine_distance_meters(double precision, double precision, double precision, double precision) cascade;

drop type if exists public.review_status cascade;
drop type if exists public.leave_request_type cascade;
drop type if exists public.attendance_status cascade;
drop type if exists public.user_role cascade;
