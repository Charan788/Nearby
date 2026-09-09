-- Run this once in the Supabase SQL editor before deploying this version.
-- It adds the tables/columns used by the UI and makes privilege changes
-- server-enforced instead of trusting browser code.

alter table profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists plan text not null default 'free' check (plan in ('free', 'plus', 'gold')),
  add column if not exists plan_expires_at timestamptz,
  add column if not exists invite_code text unique,
  add column if not exists referral_count integer not null default 0,
  add column if not exists online_at timestamptz;

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (blocker_id <> blocked_id), unique (blocker_id, blocked_id)
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid references matches(id) on delete set null,
  reason text not null check (reason in ('Fake profile', 'Inappropriate behavior', 'Harassment', 'Spam', 'Underage', 'Other')),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);
-- Some earlier versions created support_tickets without an owner column.
alter table support_tickets
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rewarded')),
  created_at timestamptz not null default now(),
  unique (referred_id)
);

create table if not exists vibe_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table if not exists super_likes (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id), unique (sender_id, receiver_id)
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('plus', 'gold')),
  status text not null check (status in ('active', 'cancelled', 'expired')),
  razorpay_payment_id text unique,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  created_at timestamptz not null default now()
);

-- Never use a password embedded in JavaScript. Promote the initial moderator
-- manually after their profile exists: update profiles set is_admin = true where id = '...';
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

-- Only trusted database code may create a match.  The canonical ordering avoids
-- duplicate A/B and B/A rows.
create or replace function public.create_match_for_mutual_like()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.direction = 'like' and exists (
    select 1 from swipes
    where swiper_id = new.swiped_id and swiped_id = new.swiper_id and direction = 'like'
  ) then
    insert into matches (user_a, user_b)
    values (least(new.swiper_id, new.swiped_id), greatest(new.swiper_id, new.swiped_id))
    on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists create_match_after_like on swipes;
create trigger create_match_after_like after insert or update of direction on swipes
for each row execute function public.create_match_for_mutual_like();

alter table blocks enable row level security;
alter table reports enable row level security;
alter table support_tickets enable row level security;
alter table referrals enable row level security;
alter table vibe_answers enable row level security;
alter table super_likes enable row level security;
alter table subscriptions enable row level security;

drop policy if exists "view verified profiles" on profiles;
drop policy if exists "edit own profile" on profiles;
create policy "authenticated users view verified profiles" on profiles for select
  using (auth.uid() = id or (auth.uid() is not null and verified));
create policy "users edit allowed own profile" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "admins manage profiles" on profiles for all using (is_admin()) with check (is_admin());

-- Prevent users from changing verification/admin/payment fields through the API.
revoke update on profiles from anon, authenticated;
grant update (name, age, gender, bio, photo_url, online_at, invite_code) on profiles to authenticated;

drop policy if exists "own swipes" on swipes;
create policy "create own swipe" on swipes for insert with check (auth.uid() = swiper_id);
create policy "read own or received swipes" on swipes for select using (auth.uid() = swiper_id or auth.uid() = swiped_id);
create policy "change own swipe" on swipes for update using (auth.uid() = swiper_id) with check (auth.uid() = swiper_id);

create policy "own blocks" on blocks for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
create policy "create own report" on reports for insert with check (auth.uid() = reporter_id);
create policy "reporter views own reports" on reports for select using (auth.uid() = reporter_id);
create policy "admins manage reports" on reports for all using (is_admin()) with check (is_admin());
create policy "create support ticket" on support_tickets for insert with check (auth.uid() = user_id);
create policy "users view own tickets" on support_tickets for select using (auth.uid() = user_id);
create policy "admins manage tickets" on support_tickets for all using (is_admin()) with check (is_admin());
create policy "read own referrals" on referrals for select using (auth.uid() = referrer_id or auth.uid() = referred_id);
create policy "create referral for self" on referrals for insert with check (auth.uid() = referred_id);
create policy "own vibe answers" on vibe_answers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own super likes" on super_likes for all using (auth.uid() = sender_id) with check (auth.uid() = sender_id);
create policy "users view own subscriptions" on subscriptions for select using (auth.uid() = user_id);

drop policy if exists "own verification rows" on verifications;
create policy "own verification rows" on verifications for select using (auth.uid() = user_id);
create policy "admins manage verifications" on verifications for all using (is_admin()) with check (is_admin());

-- There is deliberately no client insert/update policy for matches or subscriptions.
-- Create them only via a trigger and a verified payment webhook/Edge Function.
