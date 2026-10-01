-- Seed: a pitch deck can also be a slide file (PowerPoint, Keynote, OpenDocument), so the upload bucket accepts those types.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint',
  'application/vnd.apple.keynote', 'application/vnd.oasis.opendocument.presentation'
]
where id = 'presale-media';
