-- Atlas Brief migration: per-article hero photo override
--
-- The listing's hero_photo_url is the default, but David should be able to
-- choose a different image specifically for the published article (a better
-- angle, a different crop, a stock image of the neighborhood, etc.) without
-- mutating the listing record that powers internal dashboards.
--
-- If article.hero_photo_url is set, the public post renders it; otherwise it
-- falls back to listing.hero_photo_url.

alter table articles
  add column hero_photo_url text;

-- Make property-assets readable by anon. Editorial photos on the public
-- Atlas Brief posts must load without an auth cookie. The bucket is named
-- property-assets and holds hero photos, secondary photos, and broker
-- headshots. None of these are sensitive; David's whole point of publishing
-- is to surface them.

update storage.buckets set public = true where id = 'property-assets';

create policy "property-assets anon select" on storage.objects
  for select to anon
  using (bucket_id = 'property-assets');
