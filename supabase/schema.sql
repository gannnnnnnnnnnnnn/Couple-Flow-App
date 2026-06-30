create extension if not exists pgcrypto;

create table if not exists pairs (
  id text primary key,
  name text not null,
  pair_code text not null unique,
  timezone text not null default 'Australia/Melbourne',
  created_at timestamptz not null default now()
);

create table if not exists pair_members (
  id text primary key,
  pair_id text not null references pairs(id) on delete cascade,
  display_name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists budget_groups (
  id text primary key,
  pair_id text not null references pairs(id) on delete cascade,
  name text not null,
  amount_hint text not null,
  sort_order integer not null default 0
);

create table if not exists activities (
  id text primary key,
  pair_id text not null references pairs(id) on delete cascade,
  title text not null,
  note text not null default '',
  budget_group_id text not null references budget_groups(id) on delete restrict,
  duration_minutes integer not null,
  tags text[] not null default '{}',
  created_by_member_id text not null references pair_members(id) on delete restrict,
  status text not null check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);

create table if not exists draw_sessions (
  id text primary key,
  pair_id text not null references pairs(id) on delete cascade,
  target_week_start_date date not null,
  created_by_member_id text not null references pair_members(id) on delete restrict,
  status text not null check (status in ('idle', 'drawing', 'revealed', 'accepted')),
  created_at timestamptz not null default now()
);

-- V0 migration-safe block:
-- Older PRs used draft/cancelled draw states and did not enforce one draw row
-- per pair/week. Normalize statuses and remove duplicate historical rows before
-- adding the stricter state check and unique pair/week index.
alter table draw_sessions drop constraint if exists draw_sessions_status_check;

update draw_sessions
set status = 'idle'
where status in ('draft', 'cancelled');

with ranked_draw_sessions as (
  select
    ctid,
    row_number() over (
      partition by pair_id, target_week_start_date
      order by created_at desc, id desc
    ) as row_rank
  from draw_sessions
)
delete from draw_sessions
using ranked_draw_sessions
where draw_sessions.ctid = ranked_draw_sessions.ctid
  and ranked_draw_sessions.row_rank > 1;

alter table draw_sessions add constraint draw_sessions_status_check
  check (status in ('idle', 'drawing', 'revealed', 'accepted'));

create table if not exists weekly_activity_bans (
  id text primary key,
  pair_id text not null references pairs(id) on delete cascade,
  draw_session_id text not null,
  member_id text not null references pair_members(id) on delete cascade,
  activity_id text not null references activities(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (draw_session_id, member_id, activity_id)
);

create table if not exists scheduled_sessions (
  id text primary key,
  pair_id text not null references pairs(id) on delete cascade,
  activity_id text not null references activities(id) on delete restrict,
  draw_session_id text,
  target_week_start_date date not null,
  status text not null check (
    status in ('planning', 'ongoing', 'needs_review', 'completed', 'not_done', 'replaced', 'redrawn')
  ),
  todo_text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists session_outcomes (
  id text primary key,
  pair_id text not null references pairs(id) on delete cascade,
  scheduled_session_id text not null references scheduled_sessions(id) on delete cascade,
  outcome_type text not null check (outcome_type in ('completed', 'not_done', 'replaced', 'redrawn')),
  rating text check (rating in ('夯', '顶级', '人上人', 'NPC', '拉完了') or rating is null),
  reason text,
  replacement_activity_id text references activities(id) on delete set null,
  agreed_by_member_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists pair_members_pair_id_idx on pair_members(pair_id);
create index if not exists budget_groups_pair_id_idx on budget_groups(pair_id);
create index if not exists activities_pair_id_idx on activities(pair_id);
create index if not exists draw_sessions_pair_id_idx on draw_sessions(pair_id);
create unique index if not exists draw_sessions_pair_week_idx
  on draw_sessions(pair_id, target_week_start_date);
create index if not exists weekly_activity_bans_pair_id_idx on weekly_activity_bans(pair_id);
create index if not exists scheduled_sessions_pair_id_idx on scheduled_sessions(pair_id);
create index if not exists session_outcomes_pair_id_idx on session_outcomes(pair_id);

alter table pairs enable row level security;
alter table pair_members enable row level security;
alter table budget_groups enable row level security;
alter table activities enable row level security;
alter table draw_sessions enable row level security;
alter table weekly_activity_bans enable row level security;
alter table scheduled_sessions enable row level security;
alter table session_outcomes enable row level security;

-- V0 pair-code sync intentionally has no real auth yet. These permissive
-- policies let the anon key read/write shared pair data for local testing.
-- Replace with authenticated policies before production use.
create policy "v0 anon read pairs" on pairs for select using (true);
create policy "v0 anon write pairs" on pairs for all using (true) with check (true);
create policy "v0 anon read pair_members" on pair_members for select using (true);
create policy "v0 anon write pair_members" on pair_members for all using (true) with check (true);
create policy "v0 anon read budget_groups" on budget_groups for select using (true);
create policy "v0 anon write budget_groups" on budget_groups for all using (true) with check (true);
create policy "v0 anon read activities" on activities for select using (true);
create policy "v0 anon write activities" on activities for all using (true) with check (true);
create policy "v0 anon read draw_sessions" on draw_sessions for select using (true);
create policy "v0 anon write draw_sessions" on draw_sessions for all using (true) with check (true);
create policy "v0 anon read weekly_activity_bans" on weekly_activity_bans for select using (true);
create policy "v0 anon write weekly_activity_bans" on weekly_activity_bans for all using (true) with check (true);
create policy "v0 anon read scheduled_sessions" on scheduled_sessions for select using (true);
create policy "v0 anon write scheduled_sessions" on scheduled_sessions for all using (true) with check (true);
create policy "v0 anon read session_outcomes" on session_outcomes for select using (true);
create policy "v0 anon write session_outcomes" on session_outcomes for all using (true) with check (true);
