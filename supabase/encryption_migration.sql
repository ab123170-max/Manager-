-- ScanMe AI encrypted data support
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.get_my_encryption_key()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  key_bytes bytea;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select digest(
    convert_to(
      coalesce(current_setting('app.settings.encryption_pepper', true), 'scanme-ai-v1') ||
      ':' || auth.uid()::text,
      'UTF8'
    ),
    'sha256'
  ) into key_bytes;

  return encode(key_bytes, 'base64');
end;
$$;

revoke all on function public.get_my_encryption_key() from public;
grant execute on function public.get_my_encryption_key() to authenticated;

alter table public.profiles
  add column if not exists encrypted_payload text;

alter table public.products
  add column if not exists encrypted_payload text;

alter table public.inventory_transactions
  add column if not exists encrypted_payload text;

comment on column public.profiles.encrypted_payload is
  'AES-256-GCM encrypted profile payload. auth_user_id and timestamps remain queryable for RLS.';
comment on column public.products.encrypted_payload is
  'AES-256-GCM encrypted inventory payload. id and user_id remain queryable for RLS.';
comment on column public.inventory_transactions.encrypted_payload is
  'AES-256-GCM encrypted transaction payload. id, user_id and product_id remain queryable for RLS.';
