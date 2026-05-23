create unique index if not exists document_ai_reviews_storage_file_uidx
  on public.document_ai_reviews (storage_bucket, file_path)
  where storage_bucket is not null and file_path is not null;

create or replace function public.queue_driver_document_review()
returns trigger
language plpgsql
security definer
set search_path = public, storage, extensions
as $$
declare
  review_id uuid;
  function_url text := 'https://lpapiwkfqghdfkekwjnt.supabase.co/functions/v1/analyze-document';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwYXBpd2tmcWdoZGZrZWt3am50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjA2MTksImV4cCI6MjA5MTMzNjYxOX0.ZozKTy91og434cTD2btOXA0zCRsdGwG9c3MO1ybcSOY';
begin
  if new.bucket_id <> 'driver-documents' then
    return new;
  end if;

  insert into public.document_ai_reviews (
    user_id,
    subject_name,
    document_type,
    storage_bucket,
    file_path,
    mime_type,
    status
  )
  values (
    new.owner,
    coalesce(new.metadata->>'owner_name', new.metadata->>'name'),
    coalesce(new.metadata->>'document_type', split_part(new.name, '/', 1), 'documento'),
    new.bucket_id,
    new.name,
    coalesce(new.metadata->>'mimetype', new.metadata->>'mime_type'),
    'pending'
  )
  on conflict (storage_bucket, file_path)
  where storage_bucket is not null and file_path is not null
  do update set
    status = 'pending',
    error_message = null,
    mime_type = excluded.mime_type,
    updated_at = now()
  returning id into review_id;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
    ),
    body := jsonb_build_object('reviewId', review_id),
    timeout_milliseconds := 30000
  );

  return new;
end;
$$;

drop trigger if exists queue_driver_document_review_on_upload on storage.objects;
create trigger queue_driver_document_review_on_upload
after insert on storage.objects
for each row
when (new.bucket_id = 'driver-documents')
execute function public.queue_driver_document_review();
