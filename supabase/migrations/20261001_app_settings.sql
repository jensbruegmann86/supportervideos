create table if not exists app_settings (
  key text primary key,
  value text not null
);

alter table app_settings enable row level security;

insert into app_settings (key, value) values ('idle_youtube_video_id', 'aX50wDkfBLM')
on conflict (key) do nothing;
