create table if not exists video_detection_log (
  id bigint generated always as identity primary key,
  bib text not null,
  video_id bigint references event_video(id) on delete set null,
  screen_id smallint not null,
  detected_time timestamptz not null default now(),
  outcome text not null check (outcome in ('queued', 'blocked', 'no_video'))
);

create index if not exists idx_detection_log_time
  on video_detection_log (detected_time desc);

alter table video_detection_log enable row level security;
