-- Atlas Brief migration 0007: hero + secondary photos on listings
-- + property-assets storage bucket for hosting them and broker headshots.

alter table listings
  add column hero_photo_url text,
  add column photo_urls text[];

-- Storage bucket for property hero photos, secondary photos, broker headshots.
-- 25 MB cap as a safety belt; client resizes to ~1600px wide JPEG so real
-- uploads should be 200-500 KB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-assets',
  'property-assets',
  false,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "property-assets authed insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-assets');

create policy "property-assets authed select" on storage.objects
  for select to authenticated
  using (bucket_id = 'property-assets');

create policy "property-assets authed update" on storage.objects
  for update to authenticated
  using (bucket_id = 'property-assets')
  with check (bucket_id = 'property-assets');

create policy "property-assets authed delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-assets');
