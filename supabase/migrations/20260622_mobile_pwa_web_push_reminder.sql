-- M418 Mobile PWA & Web Push Reminder v1
-- Stores notification settings, push endpoint metadata, and metadata-only delivery dedupe rows.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  platform text,
  enabled boolean not null default true,
  revoked_at timestamptz,
  last_sent_at timestamptz,
  last_test_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  timezone text not null default 'Asia/Seoul',
  reminder_days smallint[] not null default array[1,2,3,4,5]::smallint[],
  reminder_time time not null default '09:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_days_valid check (
    cardinality(reminder_days) between 1 and 7
    and reminder_days <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  constraint notification_preferences_timezone_nonempty check (length(btrim(timezone)) > 0)
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  delivery_key text not null unique,
  notification_type text not null,
  status text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notification_deliveries_type_valid check (notification_type in ('today', 'review', 'calculator_recovery', 'test')),
  constraint notification_deliveries_status_valid check (status in ('pending', 'sent', 'failed', 'expired', 'skipped'))
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
create index if not exists push_subscriptions_enabled_idx on public.push_subscriptions(user_id, enabled) where enabled = true and revoked_at is null;
create index if not exists notification_preferences_enabled_idx on public.notification_preferences(enabled, reminder_time) where enabled = true;
create index if not exists notification_deliveries_user_created_idx on public.notification_deliveries(user_id, created_at desc);
create index if not exists notification_deliveries_subscription_created_idx on public.notification_deliveries(subscription_id, created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists "Users can read their own push subscriptions" on public.push_subscriptions;
create policy "Users can read their own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own push subscriptions" on public.push_subscriptions;
create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own push subscriptions" on public.push_subscriptions;
create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their own notification preferences" on public.notification_preferences;
create policy "Users can read their own notification preferences"
  on public.notification_preferences for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own notification preferences" on public.notification_preferences;
create policy "Users can insert their own notification preferences"
  on public.notification_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own notification preferences" on public.notification_preferences;
create policy "Users can update their own notification preferences"
  on public.notification_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their own notification deliveries" on public.notification_deliveries;
create policy "Users can read their own notification deliveries"
  on public.notification_deliveries for select
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.push_subscriptions to service_role;
grant select, insert, update, delete on table public.notification_preferences to service_role;
grant select, insert, update, delete on table public.notification_deliveries to service_role;
grant select, insert, update on table public.push_subscriptions to authenticated;
grant select, insert, update on table public.notification_preferences to authenticated;
grant select on table public.notification_deliveries to authenticated;
