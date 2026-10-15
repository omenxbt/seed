-- the token metadata JSON a raise opened with (Phase 2): the mint step writes it into immutable Token Metadata
alter table public.raises add column if not exists metadata_uri text;
-- the bucket also takes the token metadata JSON
update storage.buckets set allowed_mime_types = array_append(allowed_mime_types, 'application/json') where id = 'presale-media' and not ('application/json' = any(allowed_mime_types));
