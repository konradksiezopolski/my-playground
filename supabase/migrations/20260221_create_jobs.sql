create table jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  result_url  text not null,
  resolution  text not null,
  format      text not null,
  created_at  timestamptz default now()
);

alter table jobs enable row level security;

create policy "users own their jobs" on jobs
  for all using (auth.uid() = user_id);
