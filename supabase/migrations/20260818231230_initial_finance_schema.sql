-- Finança Familiar — schema inicial multifamília.
-- Valores monetários usam numeric(14,2). Datas de competência/vencimento usam date;
-- eventos e auditoria usam timestamptz em UTC.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.family_role as enum ('admin', 'member');
create type public.entry_kind as enum ('income', 'expense', 'initial_balance', 'goal_contribution');
create type public.entry_status as enum ('planned', 'posted', 'void');
create type public.bill_status as enum ('pending', 'paid', 'cancelled');
create type public.card_type as enum ('credit', 'debit');
create type public.payment_method as enum ('pix', 'card', 'cash', 'bank_transfer', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (full_name = upper(full_name) and char_length(full_name) between 3 and 160),
  phone text not null,
  contact_email text not null,
  cpf_lookup_hash char(64) not null unique,
  cpf_last4 char(4) not null check (cpf_last4 ~ '^[0-9]{4}$'),
  birth_date date not null,
  avatar_path text,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.cpf_lookup_hash is 'HMAC-SHA256 calculado no backend; o CPF em texto puro nunca é persistido.';

create table public.profile_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  country_code char(2) not null default 'BR',
  postal_code text not null,
  state_code varchar(3) not null,
  city text not null,
  district text,
  street text not null,
  number text not null,
  complement text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.login_aliases (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username) and username ~ '^[a-z0-9._-]{3,32}$'),
  auth_email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
revoke all on private.login_aliases from public, anon, authenticated;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  join_code varchar(10) not null unique check (join_code ~ '^FAM-[A-Z0-9]{6}$'),
  currency_code char(3) not null default 'BRL' check (currency_code = 'BRL'),
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  display_name text not null check (display_name = upper(display_name)),
  role public.family_role not null default 'member',
  status text not null default 'active' check (status in ('active', 'inactive')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create index family_members_user_active_idx on public.family_members (user_id, family_id) where status = 'active';

create function private.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = (select auth.uid())
      and fm.status = 'active'
  );
$$;

create function private.can_manage_family(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = (select auth.uid())
      and fm.status = 'active'
      and fm.role = 'admin'
  );
$$;

revoke all on function private.is_family_member(uuid) from public, anon;
revoke all on function private.can_manage_family(uuid) from public, anon;
grant execute on function private.is_family_member(uuid) to authenticated;
grant execute on function private.can_manage_family(uuid) to authenticated;

create function public.join_family_by_code(requested_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_family_id uuid;
  current_name text;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if upper(trim(requested_code)) !~ '^FAM-[A-Z0-9]{6}$' then
    raise exception 'invalid_family_code' using errcode = '22023';
  end if;

  select id into target_family_id
  from public.families
  where join_code = upper(trim(requested_code)) and status = 'active';

  if target_family_id is null then
    raise exception 'family_not_found' using errcode = 'P0002';
  end if;

  select full_name into current_name from public.profiles where id = current_user_id;
  if current_name is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  insert into public.family_members (family_id, user_id, display_name, role)
  values (target_family_id, current_user_id, current_name, 'member')
  on conflict (family_id, user_id) do update set status = 'active', updated_at = now();

  return target_family_id;
end;
$$;

revoke all on function public.join_family_by_code(text) from public, anon;
grant execute on function public.join_family_by_code(text) to authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete restrict,
  name text not null,
  kind text not null default 'both' check (kind in ('income', 'expense', 'both')),
  color char(7) not null default '#64748B' check (color ~ '^#[A-Fa-f0-9]{6}$'),
  icon text,
  is_system boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_system and family_id is null) or (not is_system and family_id is not null))
);
create unique index categories_system_name_idx on public.categories (lower(name)) where family_id is null;
create unique index categories_family_name_idx on public.categories (family_id, lower(name)) where family_id is not null and status = 'active';

create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete restrict,
  name text not null,
  account_type text not null default 'wallet' check (account_type in ('wallet', 'checking', 'savings', 'cash', 'other')),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete restrict,
  kind public.entry_kind not null,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  competence_date date not null,
  category_id uuid references public.categories(id) on delete restrict,
  responsible_member_id uuid references public.family_members(id) on delete restrict,
  status public.entry_status not null default 'posted',
  notes text,
  deduplication_key text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create unique index financial_entries_dedup_idx on public.financial_entries (family_id, deduplication_key) where deduplication_key is not null;
create index financial_entries_period_idx on public.financial_entries (family_id, competence_date desc, kind, status);

create table public.payment_obligations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete restrict,
  title text not null,
  origin_type text not null check (origin_type in ('manual', 'card_statement', 'store', 'subscription', 'fixed_expense')),
  due_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  status public.bill_status not null default 'pending',
  paid_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'paid' and paid_at is not null) or status <> 'paid')
);
create index payment_obligations_due_idx on public.payment_obligations (family_id, due_date, status);

create table public.obligation_entries (
  family_id uuid not null references public.families(id) on delete restrict,
  obligation_id uuid not null references public.payment_obligations(id) on delete restrict,
  entry_id uuid not null references public.financial_entries(id) on delete restrict,
  allocated_amount numeric(14,2) not null check (allocated_amount > 0),
  created_at timestamptz not null default now(),
  primary key (obligation_id, entry_id)
);

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete restrict,
  account_id uuid not null references public.financial_accounts(id) on delete restrict,
  entry_id uuid references public.financial_entries(id) on delete restrict,
  direction text not null check (direction in ('in', 'out')),
  amount numeric(14,2) not null check (amount > 0),
  occurred_at timestamptz not null,
  description text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (entry_id)
);
create index cash_movements_account_date_idx on public.cash_movements (family_id, account_id, occurred_at desc);

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete restrict,
  obligation_id uuid not null unique references public.payment_obligations(id) on delete restrict,
  cash_movement_id uuid not null unique references public.cash_movements(id) on delete restrict,
  paid_amount numeric(14,2) not null check (paid_amount > 0),
  paid_at timestamptz not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict,
  name text not null, institution text not null, holder_member_id uuid not null references public.family_members(id) on delete restrict,
  card_type public.card_type not null, credit_limit numeric(14,2) check (credit_limit > 0), closing_day smallint check (closing_day between 1 and 31), due_day smallint check (due_day between 1 and 31),
  last_four char(4), visual_key text, status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((card_type = 'credit' and credit_limit is not null and closing_day is not null and due_day is not null) or (card_type = 'debit' and credit_limit is null))
);

create table public.card_purchases (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict,
  card_id uuid not null references public.cards(id) on delete restrict, description text not null, total_amount numeric(14,2) not null check (total_amount > 0),
  purchase_date date not null, category_id uuid references public.categories(id) on delete restrict, installment_count smallint not null default 1 check (installment_count between 1 and 48),
  status text not null default 'active' check (status in ('active','cancelled')), created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.card_statements (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict,
  card_id uuid not null references public.cards(id) on delete restrict, reference_month date not null check (reference_month = date_trunc('month', reference_month)::date),
  closing_date date not null, due_date date not null, obligation_id uuid unique references public.payment_obligations(id) on delete restrict,
  status text not null default 'open' check (status in ('open','closed','paid','cancelled')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (card_id, reference_month)
);

create table public.card_installments (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict,
  purchase_id uuid not null references public.card_purchases(id) on delete restrict, statement_id uuid references public.card_statements(id) on delete restrict,
  entry_id uuid not null unique references public.financial_entries(id) on delete restrict, installment_number smallint not null, installment_count smallint not null,
  amount numeric(14,2) not null check (amount > 0), competence_date date not null,
  created_at timestamptz not null default now(), unique (purchase_id, installment_number), check (installment_number between 1 and installment_count)
);
create index card_installments_period_idx on public.card_installments (family_id, competence_date, statement_id);

create table public.stores (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict,
  name text not null, holder_member_id uuid not null references public.family_members(id) on delete restrict, credit_limit numeric(14,2) not null check (credit_limit > 0),
  status text not null default 'active' check (status in ('active','archived')), created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.store_purchases (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict, store_id uuid not null references public.stores(id) on delete restrict,
  purchase_date date not null, total_amount numeric(14,2) not null check (total_amount > 0), source text not null default 'manual' check (source in ('manual','nfce_qr')),
  nfce_access_key text, nfce_query_url text, status text not null default 'active' check (status in ('active','cancelled')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict, purchase_id uuid not null references public.store_purchases(id) on delete restrict,
  name text not null, quantity numeric(12,3) not null check (quantity > 0), unit_price numeric(14,4) not null check (unit_price >= 0), total_amount numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  created_at timestamptz not null default now()
);

create table public.store_installments (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict, purchase_id uuid not null references public.store_purchases(id) on delete restrict,
  entry_id uuid not null unique references public.financial_entries(id) on delete restrict, obligation_id uuid unique references public.payment_obligations(id) on delete restrict,
  installment_number smallint not null, installment_count smallint not null, amount numeric(14,2) not null check (amount > 0), due_date date not null,
  created_at timestamptz not null default now(), unique (purchase_id, installment_number), check (installment_number between 1 and installment_count)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict,
  name text not null, amount numeric(14,2) not null check (amount > 0), due_day smallint not null check (due_day between 1 and 31),
  frequency text not null default 'monthly' check (frequency in ('weekly','monthly','yearly')), category_id uuid references public.categories(id) on delete restrict,
  payment_method public.payment_method not null, card_id uuid references public.cards(id) on delete restrict,
  status text not null default 'active' check (status in ('active','paused','archived')), created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((payment_method = 'card' and card_id is not null) or payment_method <> 'card')
);

create table public.subscription_occurrences (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict, subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  reference_month date not null, entry_id uuid not null unique references public.financial_entries(id) on delete restrict, obligation_id uuid references public.payment_obligations(id) on delete restrict,
  card_installment_id uuid references public.card_installments(id) on delete restrict, amount numeric(14,2) not null check (amount > 0), due_date date not null,
  created_at timestamptz not null default now(), unique (subscription_id, reference_month)
);

create table public.fixed_expenses (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict,
  name text not null, category_id uuid references public.categories(id) on delete restrict, reference_amount numeric(14,2) check (reference_amount > 0),
  due_day smallint not null check (due_day between 1 and 31), frequency text not null default 'monthly' check (frequency in ('weekly','monthly','yearly')),
  responsible_member_id uuid references public.family_members(id) on delete restrict, notes text,
  status text not null default 'active' check (status in ('active','paused','archived')), created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.fixed_expense_occurrences (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict, fixed_expense_id uuid not null references public.fixed_expenses(id) on delete restrict,
  reference_month date not null, actual_amount numeric(14,2) not null check (actual_amount > 0), due_date date not null,
  entry_id uuid not null unique references public.financial_entries(id) on delete restrict, obligation_id uuid not null unique references public.payment_obligations(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (fixed_expense_id, reference_month)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict,
  name text not null, target_amount numeric(14,2) not null check (target_amount > 0), deadline date, description text, icon text, color char(7),
  status text not null default 'active' check (status in ('active','completed','archived')), created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.goal_deposits (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict, goal_id uuid not null references public.goals(id) on delete restrict,
  entry_id uuid not null unique references public.financial_entries(id) on delete restrict, amount numeric(14,2) not null check (amount > 0), deposited_at date not null, notes text,
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete restrict, user_id uuid references auth.users(id) on delete cascade,
  notification_type text not null, title text not null, message text not null, action_url text, scheduled_for timestamptz, read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key, family_id uuid not null references public.families(id) on delete restrict,
  actor_id uuid references auth.users(id), event_type text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_family_date_idx on public.audit_events (family_id, created_at desc);

create function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','profile_addresses','families','family_members','categories','financial_accounts','financial_entries',
    'payment_obligations','cards','card_purchases','card_statements','stores','store_purchases','subscriptions',
    'fixed_expenses','fixed_expense_occurrences','goals'
  ] loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.profile_addresses enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy addresses_select_own on public.profile_addresses for select to authenticated using ((select auth.uid()) = user_id);
create policy addresses_insert_own on public.profile_addresses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy addresses_update_own on public.profile_addresses for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy families_select_member on public.families for select to authenticated using ((select private.is_family_member(id)));
create policy families_update_admin on public.families for update to authenticated using ((select private.can_manage_family(id))) with check ((select private.can_manage_family(id)));
create policy members_select_family on public.family_members for select to authenticated using ((select private.is_family_member(family_id)));
create policy members_update_admin on public.family_members for update to authenticated using ((select private.can_manage_family(family_id))) with check ((select private.can_manage_family(family_id)));

alter table public.categories enable row level security;
create policy categories_select on public.categories for select to authenticated using (family_id is null or (select private.is_family_member(family_id)));
create policy categories_insert on public.categories for insert to authenticated with check (family_id is not null and (select private.is_family_member(family_id)) and not is_system);
create policy categories_update on public.categories for update to authenticated using (family_id is not null and (select private.is_family_member(family_id)) and not is_system) with check (family_id is not null and (select private.is_family_member(family_id)) and not is_system);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'financial_accounts','financial_entries','payment_obligations','obligation_entries','cash_movements','payment_records',
    'cards','card_purchases','card_statements','card_installments','stores','store_purchases','purchase_items','store_installments',
    'subscriptions','subscription_occurrences','fixed_expenses','fixed_expense_occurrences','goals','goal_deposits','notifications','audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.is_family_member(family_id)))', table_name || '_select_family', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_family_member(family_id)))', table_name || '_insert_family', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.is_family_member(family_id))) with check ((select private.is_family_member(family_id)))', table_name || '_update_family', table_name);
  end loop;
end $$;

create view public.family_monthly_summary
with (security_invoker = true)
as
select
  family_id,
  date_trunc('month', competence_date)::date as reference_month,
  coalesce(sum(amount) filter (where kind = 'income' and status = 'posted'), 0)::numeric(14,2) as income,
  coalesce(sum(amount) filter (where kind = 'expense' and status = 'posted'), 0)::numeric(14,2) as expenses
from public.financial_entries
where archived_at is null
group by family_id, date_trunc('month', competence_date)::date;

create view public.family_account_balances
with (security_invoker = true)
as
select
  family_id,
  account_id,
  coalesce(sum(case when direction = 'in' then amount else -amount end), 0)::numeric(14,2) as balance
from public.cash_movements
group by family_id, account_id;

create function private.generate_family_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare generated_code text;
begin
  loop
    generated_code := 'FAM-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 6));
    exit when not exists (select 1 from public.families where join_code = generated_code);
  end loop;
  return generated_code;
end;
$$;

create function public.finish_registration(
  p_user_id uuid,
  p_username text,
  p_auth_email text,
  p_full_name text,
  p_phone text,
  p_contact_email text,
  p_cpf_lookup_hash text,
  p_cpf_last4 text,
  p_birth_date date,
  p_country_code text,
  p_postal_code text,
  p_state_code text,
  p_city text,
  p_district text,
  p_street text,
  p_number text,
  p_complement text,
  p_family_mode text,
  p_family_name text default null,
  p_join_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_family_id uuid;
  member_role public.family_role;
begin
  if p_username <> lower(p_username) or p_username !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'invalid_username' using errcode = '22023';
  end if;

  insert into public.profiles (id, full_name, phone, contact_email, cpf_lookup_hash, cpf_last4, birth_date)
  values (p_user_id, upper(trim(p_full_name)), p_phone, lower(trim(p_contact_email)), p_cpf_lookup_hash, p_cpf_last4, p_birth_date);

  insert into public.profile_addresses (user_id, country_code, postal_code, state_code, city, district, street, number, complement)
  values (p_user_id, upper(p_country_code), p_postal_code, upper(p_state_code), p_city, p_district, p_street, p_number, p_complement);

  insert into private.login_aliases (user_id, username, auth_email)
  values (p_user_id, p_username, p_auth_email);

  if p_family_mode = 'join' then
    select id into target_family_id from public.families
    where join_code = upper(trim(p_join_code)) and status = 'active';
    if target_family_id is null then raise exception 'family_not_found' using errcode = 'P0002'; end if;
    member_role := 'member';
  elsif p_family_mode in ('solo', 'create') then
    insert into public.families (name, join_code, created_by)
    values (
      case when p_family_mode = 'solo' then 'Família de ' || upper(trim(p_full_name)) else trim(p_family_name) end,
      private.generate_family_code(),
      p_user_id
    ) returning id into target_family_id;
    member_role := 'admin';
  else
    raise exception 'invalid_family_mode' using errcode = '22023';
  end if;

  insert into public.family_members (family_id, user_id, display_name, role)
  values (target_family_id, p_user_id, upper(trim(p_full_name)), member_role);

  if member_role = 'admin' then
    insert into public.financial_accounts (family_id, name, account_type, created_by)
    values (target_family_id, 'Saldo da família', 'wallet', p_user_id);
  end if;

  return target_family_id;
end;
$$;

create function public.resolve_login_email(p_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select auth_email from private.login_aliases where username = lower(trim(p_username));
$$;

create function public.replace_login_username(p_user_id uuid, p_new_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_new_username <> lower(p_new_username) or p_new_username !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'invalid_username' using errcode = '22023';
  end if;
  update private.login_aliases set username = p_new_username, updated_at = now() where user_id = p_user_id;
  if not found then raise exception 'user_not_found' using errcode = 'P0002'; end if;
end;
$$;

revoke all on function private.generate_family_code() from public, anon, authenticated;
revoke all on function public.finish_registration(uuid,text,text,text,text,text,text,text,date,text,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.resolve_login_email(text) from public, anon, authenticated;
revoke all on function public.replace_login_username(uuid,text) from public, anon, authenticated;
grant execute on function public.finish_registration(uuid,text,text,text,text,text,text,text,date,text,text,text,text,text,text,text,text,text,text,text) to service_role;
grant execute on function public.resolve_login_email(text) to service_role;
grant execute on function public.replace_login_username(uuid,text) to service_role;

grant usage on schema public to authenticated;
grant select, insert, update on all tables in schema public to authenticated;
revoke delete on all tables in schema public from authenticated;
grant select on public.family_monthly_summary, public.family_account_balances to authenticated;

insert into public.categories (name, kind, color, is_system) values
  ('Alimentação','expense','#16A085',true), ('Moradia','expense','#0F4C5C',true), ('Aluguel','expense','#3B82F6',true),
  ('Energia','expense','#F59E0B',true), ('Água','expense','#38BDF8',true), ('Internet','expense','#8B5CF6',true),
  ('Celular','expense','#6366F1',true), ('Transporte','expense','#F97316',true), ('Saúde','expense','#EF4444',true),
  ('Educação','expense','#14B8A6',true), ('Lazer','expense','#EC4899',true), ('Assinaturas','expense','#A855F7',true),
  ('Compras','expense','#64748B',true), ('Comércio','expense','#0EA5E9',true), ('Investimentos','both','#22C55E',true),
  ('Salário','income','#22C55E',true), ('Renda Extra','income','#10B981',true), ('Outros','both','#94A3B8',true);
