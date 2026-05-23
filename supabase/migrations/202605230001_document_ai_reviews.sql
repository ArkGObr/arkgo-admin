create table if not exists public.document_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  motoboy_id uuid,
  subject_name text,
  subject_document text,
  document_type text not null default 'documento',
  storage_bucket text,
  file_path text,
  document_url text,
  mime_type text,
  status text not null default 'pending',
  extracted_data jsonb not null default '{}'::jsonb,
  raw_response jsonb,
  error_message text,
  gemini_model text,
  gemini_key_index integer,
  attempt_count integer not null default 0,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_ai_reviews_status_check
    check (status in ('pending', 'processing', 'completed', 'failed')),
  constraint document_ai_reviews_source_check
    check (file_path is not null or document_url is not null)
);

create index if not exists document_ai_reviews_status_idx
  on public.document_ai_reviews (status);

create index if not exists document_ai_reviews_created_at_idx
  on public.document_ai_reviews (created_at desc);

create index if not exists document_ai_reviews_user_id_idx
  on public.document_ai_reviews (user_id);

create or replace function public.set_document_ai_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_document_ai_reviews_updated_at on public.document_ai_reviews;
create trigger set_document_ai_reviews_updated_at
before update on public.document_ai_reviews
for each row execute function public.set_document_ai_reviews_updated_at();

alter table public.document_ai_reviews enable row level security;

drop policy if exists "admins can read document ai reviews" on public.document_ai_reviews;
create policy "admins can read document ai reviews"
  on public.document_ai_reviews for select
  to authenticated
  using (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

drop policy if exists "admins can manage document ai reviews" on public.document_ai_reviews;
create policy "admins can manage document ai reviews"
  on public.document_ai_reviews for all
  to authenticated
  using (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );
