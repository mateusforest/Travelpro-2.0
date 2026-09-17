-- Original agency PDFs include high-resolution itineraries above 3 MB.
-- Keep the bucket private; delivery uses an authenticated 60-second signed URL.
update storage.buckets
set file_size_limit=greatest(coalesce(file_size_limit,20971520),20971520)
where id='travelpro-private';
