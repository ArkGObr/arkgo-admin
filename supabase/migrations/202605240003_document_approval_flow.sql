-- ══════════════════════════════════════════════════════════
-- Migration: Add is_released Column to Users
-- Adds is_released boolean column to the public.users table
-- representing if the driver has been verified by the AI and 
-- is allowed to access the mobile application.
-- ══════════════════════════════════════════════════════════

alter table public.users
  add column if not exists is_released boolean not null default false;

-- Create index for performance queries
create index if not exists users_is_released_idx 
  on public.users (is_released);
