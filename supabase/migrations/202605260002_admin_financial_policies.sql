-- ══════════════════════════════════════════════════════════
-- Migration: Add Admin RLS Policies for Financial Tables
-- Enables RLS and grants full read/write access to admins
-- on motoboys, recharges, and transactions.
-- ══════════════════════════════════════════════════════════

-- Enable RLS if not already enabled
alter table public.motoboys enable row level security;
alter table public.recharges enable row level security;
alter table public.transactions enable row level security;

-- Policies for motoboys table
drop policy if exists "Admins can manage motoboys" on public.motoboys;
create policy "Admins can manage motoboys"
  on public.motoboys for all
  to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Policies for recharges table
drop policy if exists "Admins can manage recharges" on public.recharges;
create policy "Admins can manage recharges"
  on public.recharges for all
  to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Policies for transactions table
drop policy if exists "Admins can manage transactions" on public.transactions;
create policy "Admins can manage transactions"
  on public.transactions for all
  to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );
