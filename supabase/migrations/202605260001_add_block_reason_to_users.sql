-- ══════════════════════════════════════════════════════════
-- Migration: Add block_reason Column to Users
-- Adds block_reason text column to the public.users table
-- representing why the driver is blocked or not released.
-- ══════════════════════════════════════════════════════════

alter table public.users
  add column if not exists block_reason text;
