-- ScanMe AI encrypted data support
-- 1) Enable Vault in the Supabase dashboard if it is not already enabled.
-- 2) Create ONE project secret in Supabase SQL Editor, once:
--    select vault.create_secret('<long-random-secret>', 'scanme_encryption_pepper',
--      'ScanMe AI encryption key material');
-- Never put the secret in GitHub, the frontend, or this file.
--
-- Supabase Vault stores secrets encrypted at rest and exposes them to
-- protected database functions through vault.decrypted_secrets.

create extension if not exists pgcrypto;

create or replace function public.get_my_encryption_key()
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  pepper text;
  key_bytes bytea;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select decrypted_secret into pepper
  from vault.decrypted_secrets
  where name = 'scanme_encryption_pepper'
  limit 1;

  if pepper is null or length(pepper) < 32 then
    raise exception 'ScanMe encryption secret is not configured';
  end if;

  select digest(
    convert_to(pepper || ':' || auth.uid()::text, 'UTF8'),
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
  'AES-256-GCM encrypted profile payload. auth_user_id remains queryable for RLS.';
comment on column public.products.encrypted_payload is
  'AES-256-GCM encrypted inventory payload. id and user_id remain queryable for RLS.';
comment on column public.inventory_transactions.encrypted_payload is
  'AES-256-GCM encrypted transaction payload. id, user_id and product_id remain queryable for RLS.';


-- Remove duplicate plaintext copies after encrypted_payload has been written.
-- The encrypted payload remains the application source of truth.
update public.profiles
set full_name = null,
    business_name = null,
    country = null,
    username = null,
    email = null,
    phone = null,
    profile_image_url = null,
    address = null,
    language = null,
    currency = null,
    onboarding_completed = null
where encrypted_payload is not null;

update public.products
set name = null,
    barcode = null,
    price = null,
    purchase_price = null,
    quantity = null,
    manufacture_date = null,
    expiry_date = null,
    best_before_months = null,
    unit = null,
    description = null,
    category = null,
    batch_number = null,
    rack_location = null,
    supplier = null,
    mrp = null,
    min_stock_alert = null
where encrypted_payload is not null;

update public.inventory_transactions
set product_name = null,
    transaction_type = null,
    subtype = null,
    quantity = null,
    price = null,
    total_amount = null,
    notes = null,
    reference_invoice = null
where encrypted_payload is not null;
