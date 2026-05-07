-- Atlas Brief migration 0004: Storage bucket for OM PDF uploads
--
-- Vercel serverless functions cap request bodies at 4.5MB. OM PDFs
-- routinely exceed that. Solution: client uploads PDF to Supabase
-- Storage first, then sends the storage path to /api/parse-om.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('om-uploads', 'om-uploads', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

-- authenticated users can upload, read, and delete OM uploads in this bucket
create policy "om-uploads authed insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'om-uploads');

create policy "om-uploads authed select" on storage.objects
  for select to authenticated
  using (bucket_id = 'om-uploads');

create policy "om-uploads authed delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'om-uploads');
