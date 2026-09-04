-- Metas e assinaturas são módulos de controle. Nenhuma movimentação destas
-- tabelas representa entrada ou saída do caixa da família.

alter table public.subscriptions
  add column if not exists image_url text,
  add column if not exists starts_on date,
  add column if not exists ends_on date;

update public.subscriptions
set starts_on = created_at::date
where starts_on is null;

alter table public.subscriptions
  alter column starts_on set default current_date,
  alter column starts_on set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_period_check'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_period_check
      check (ends_on is null or ends_on >= starts_on);
  end if;
end $$;

create table if not exists public.subscription_price_history (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete restrict,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  valid_from date not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (subscription_id, valid_from)
);

insert into public.subscription_price_history
  (family_id, subscription_id, amount, valid_from, created_by)
select family_id, id, amount, starts_on, created_by
from public.subscriptions
on conflict (subscription_id, valid_from) do nothing;

create index if not exists subscription_price_history_period_idx
  on public.subscription_price_history (family_id, subscription_id, valid_from desc);

create table if not exists public.subscription_status_history (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete restrict,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  status text not null check (status in ('active','paused')),
  valid_from date not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (subscription_id, valid_from)
);
insert into public.subscription_status_history (family_id, subscription_id, status, valid_from, created_by)
select family_id, id, case when status = 'active' then 'active' else 'paused' end, starts_on, created_by
from public.subscriptions where status <> 'archived'
on conflict (subscription_id, valid_from) do nothing;
create index if not exists subscription_status_history_period_idx on public.subscription_status_history (family_id, subscription_id, valid_from desc);

create table if not exists public.goal_movements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete restrict,
  goal_id uuid not null references public.goals(id) on delete cascade,
  movement_type text not null check (movement_type in ('deposit', 'withdrawal')),
  amount numeric(14,2) not null check (amount > 0),
  occurred_on date not null,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

insert into public.goal_movements
  (id, family_id, goal_id, movement_type, amount, occurred_on, notes, created_by, created_at)
select id, family_id, goal_id, 'deposit', amount, deposited_at, notes, created_by, created_at
from public.goal_deposits
on conflict (id) do nothing;

create index if not exists goal_movements_goal_date_idx
  on public.goal_movements (family_id, goal_id, occurred_on desc, created_at desc);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  currency_code char(3) not null default 'BRL',
  date_format text not null default 'dd/MM/yyyy',
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  notifications jsonb not null default '{"dueSoon":true,"overdue":true,"cards":true,"goals":true,"news":true}'::jsonb,
  list_order text not null default 'newest' check (list_order in ('newest', 'oldest')),
  daily_summary_time time,
  updated_at timestamptz not null default now()
);

create table if not exists public.member_permissions (
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  module text not null check (module in ('finance','bills','cards','stores','subscriptions','fixed_expenses','goals','reports','settings')),
  can_view boolean not null default true,
  can_create boolean not null default false,
  can_update boolean not null default false,
  can_delete boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (family_member_id, module)
);

alter table public.subscription_price_history enable row level security;
alter table public.subscription_status_history enable row level security;
alter table public.goal_movements enable row level security;
alter table public.user_preferences enable row level security;
alter table public.member_permissions enable row level security;

create policy subscription_price_history_select_family
  on public.subscription_price_history for select to authenticated
  using ((select private.is_family_member(family_id)));
create policy subscription_price_history_insert_family
  on public.subscription_price_history for insert to authenticated
  with check ((select private.is_family_member(family_id)));
create policy subscription_price_history_update_family
  on public.subscription_price_history for update to authenticated
  using ((select private.is_family_member(family_id)))
  with check ((select private.is_family_member(family_id)));
create policy subscription_status_history_select_family on public.subscription_status_history for select to authenticated using ((select private.is_family_member(family_id)));
create policy subscription_status_history_insert_family on public.subscription_status_history for insert to authenticated with check ((select private.is_family_member(family_id)));

create policy goal_movements_select_family
  on public.goal_movements for select to authenticated
  using ((select private.is_family_member(family_id)));
create policy goal_movements_insert_family
  on public.goal_movements for insert to authenticated
  with check ((select private.is_family_member(family_id)));
create policy goal_movements_update_family
  on public.goal_movements for update to authenticated
  using ((select private.is_family_member(family_id)))
  with check ((select private.is_family_member(family_id)));
create policy goal_movements_delete_family
  on public.goal_movements for delete to authenticated
  using ((select private.is_family_member(family_id)));

create policy user_preferences_select_own
  on public.user_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy user_preferences_insert_own
  on public.user_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy user_preferences_update_own
  on public.user_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy member_permissions_select_family
  on public.member_permissions for select to authenticated
  using (exists (
    select 1 from public.family_members target
    where target.id = family_member_id
      and (select private.is_family_member(target.family_id))
  ));
create policy member_permissions_manage_admin
  on public.member_permissions for all to authenticated
  using (exists (
    select 1 from public.family_members target
    where target.id = family_member_id
      and (select private.can_manage_family(target.family_id))
  ))
  with check (exists (
    select 1 from public.family_members target
    where target.id = family_member_id
      and (select private.can_manage_family(target.family_id))
  ));

grant select, insert, update on public.subscription_price_history to authenticated;
grant select, insert on public.subscription_status_history to authenticated;
grant select, insert, update, delete on public.goal_movements to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
grant select, insert, update, delete on public.member_permissions to authenticated;

alter table public.card_purchases
  add column if not exists source_type text not null default 'purchase',
  add column if not exists payment_type text not null default 'credit',
  add column if not exists origin_key text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'card_purchases_source_type_check' and conrelid = 'public.card_purchases'::regclass) then
    alter table public.card_purchases add constraint card_purchases_source_type_check check (source_type in ('purchase','account_transfer'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'card_purchases_payment_type_check' and conrelid = 'public.card_purchases'::regclass) then
    alter table public.card_purchases add constraint card_purchases_payment_type_check check (payment_type in ('credit','debit'));
  end if;
end $$;

create unique index if not exists card_purchases_origin_key_idx
  on public.card_purchases (family_id, origin_key)
  where origin_key is not null;
