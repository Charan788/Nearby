-- Run this in the Supabase SQL editor for a new project.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  age int not null check (age >= 18),
  gender text not null check (gender in ('Man', 'Woman')),
  bio text,
  photo_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_gender text not null,
  profile_photo_url text not null,
  selfie_url text not null,
  ai_match_distance numeric,       -- lower = closer face match, from face-api.js
  ai_liveness_passed boolean,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table swipes (
  id uuid primary key default gen_random_uuid(),
  swiper_id uuid not null references auth.users(id) on delete cascade,
  swiped_id uuid not null references auth.users(id) on delete cascade,
  direction text not null check (direction in ('like', 'pass')),
  created_at timestamptz not null default now(),
  unique (swiper_id, swiped_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: lock everything down by default, then open
-- specific, narrow policies. This is the part that actually keeps
-- one user's data safe from another user's browser requests.

alter table profiles enable row level security;
alter table verifications enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;

-- Anyone verified can browse other verified profiles; you can always edit your own.
create policy "view verified profiles" on profiles
  for select using (verified = true or auth.uid() = id);
create policy "edit own profile" on profiles
  for update using (auth.uid() = id);
create policy "insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Users can only see/create their own verification requests.
-- Admin review should use the Supabase service role key from a
-- trusted backend/edge function, not the public anon key.
create policy "own verification rows" on verifications
  for select using (auth.uid() = user_id);
create policy "create own verification" on verifications
  for insert with check (auth.uid() = user_id);

create policy "own swipes" on swipes
  for all using (auth.uid() = swiper_id);

create policy "see own matches" on matches
  for select using (auth.uid() = user_a or auth.uid() = user_b);

create policy "see own match messages" on messages
  for select using (
    exists (
      select 1 from matches
      where matches.id = messages.match_id
      and (matches.user_a = auth.uid() or matches.user_b = auth.uid())
    )
  );
create policy "send message in own match" on messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from matches
      where matches.id = messages.match_id
      and (matches.user_a = auth.uid() or matches.user_b = auth.uid())
    )
  );
