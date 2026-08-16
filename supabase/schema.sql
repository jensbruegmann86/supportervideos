-- Supabase / Postgres schema for the Video Upload 2026 project
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- Participants imported from the timing provider (name, surname, bib, race)
create table if not exists event_participants (
  bib text primary key,
  name text not null default '',
  surname text not null default '',
  race smallint,
  updated_at timestamptz not null default now()
);

-- Uploaded videos and their moderation state (playback state lives in
-- video_play_log so the same video can be queued independently per screen).
create table if not exists event_video (
  id bigint generated always as identity primary key,
  bib text not null references event_participants(bib) on delete cascade,
  video_count int not null,
  storage_path text, -- object path inside the Supabase Storage bucket
  orientation smallint not null default 2, -- 1 = portrait, 2 = landscape
  upload_time timestamptz not null default now(),
  approved boolean not null default false,
  trash boolean not null default false,
  remark text,
  unique (bib, video_count)
);

-- One queue entry per (video, screen). Created by the timing webhook when a
-- runner passes a detection mat; consumed by the player pages.
create table if not exists video_play_log (
  id bigint generated always as identity primary key,
  video_id bigint not null references event_video(id) on delete cascade,
  screen_id smallint not null,
  detected_time timestamptz not null default now(),
  scheduled_time timestamptz not null default now(), -- earliest time this screen may play it
  played boolean not null default false,
  played_time timestamptz,
  unique (video_id, screen_id)
);

create index if not exists idx_play_log_queue
  on video_play_log (screen_id, played, scheduled_time);

-- One row per physical player/screen along the course
create table if not exists player_state (
  screen_id smallint primary key,
  busy boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into player_state (screen_id, busy) values (1, false), (2, false)
  on conflict (screen_id) do nothing;

-- Simple key/value settings table (e.g. screen2 delay override)
create table if not exists app_settings (
  key text primary key,
  value text not null
);

-- Row Level Security: all access happens through server-side API routes using
-- the service role key, so we lock the tables down for the anon/public role.
alter table event_participants enable row level security;
alter table event_video enable row level security;
alter table video_play_log enable row level security;
alter table player_state enable row level security;
alter table app_settings enable row level security;

-- No policies are created on purpose -> anon/authenticated roles get no access,
-- only the service role (used by the Next.js API routes) can read/write.

