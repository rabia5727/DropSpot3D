-- Public bucket for defect photos, so an uploaded photo can be given a URL
-- that either a human pastes into the app or an agent passes to log_defect
-- as photo_url - the real photo, not an abstract marker, shown on zoom.
insert into storage.buckets (id, name, public)
values ('defect-photos', 'defect-photos', true)
on conflict (id) do nothing;

create policy "public read defect photos"
  on storage.objects for select
  using (bucket_id = 'defect-photos');

create policy "public upload defect photos"
  on storage.objects for insert
  with check (bucket_id = 'defect-photos');

alter table public.defects add column photo_url text;
