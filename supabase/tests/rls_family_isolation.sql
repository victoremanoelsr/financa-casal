begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid', '', now(), '{}', '{}', now(), now());

insert into public.families (id, name, join_code, created_by) values
  ('a0000000-0000-0000-0000-000000000001', 'Família A', 'FAM-AAAAAA', '10000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', 'Família B', 'FAM-BBBBBB', '20000000-0000-0000-0000-000000000002');

insert into public.family_members (family_id, user_id, display_name, role) values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'USUÁRIO A', 'admin'),
  ('b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'USUÁRIO B', 'admin');

insert into public.financial_entries (family_id, kind, description, amount, competence_date, created_by) values
  ('a0000000-0000-0000-0000-000000000001', 'income', 'Receita A', 100, current_date, '10000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', 'income', 'Receita B', 200, current_date, '20000000-0000-0000-0000-000000000002');

set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';
select is((select count(*)::integer from public.financial_entries), 1, 'Família A enxerga somente seu lançamento');
select is((select count(*)::integer from public.financial_entries where family_id = 'b0000000-0000-0000-0000-000000000002'), 0, 'ID direto da Família B não contorna RLS');

set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}';
select is((select count(*)::integer from public.financial_entries), 1, 'Família B enxerga somente seu lançamento');
select is((select coalesce(sum(amount), 0)::integer from public.financial_entries), 200, 'Relatório da Família B não soma dados da Família A');

select * from finish();
rollback;
