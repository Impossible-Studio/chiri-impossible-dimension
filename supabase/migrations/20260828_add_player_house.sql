-- Persistent, per-player home layout. Run this once in the Supabase SQL
-- Editor before enabling the first furniture boxes in houseConfig.ts.
alter table public.player_data
add column if not exists house jsonb not null default '{
  "version": 1,
  "visibility": "private",
  "openedBoxIds": [],
  "furniture": {},
  "updatedAt": 0
}'::jsonb;

-- Backfill rows that may have been created while the column was nullable in a
-- development database.
update public.player_data
set house = '{
  "version": 1,
  "visibility": "private",
  "openedBoxIds": [],
  "furniture": {},
  "updatedAt": 0
}'::jsonb
where house is null;

-- Visitors receive only the public house document and its owner id. Inventory,
-- quests, collected seeds, Chiri data and every other player column stay out of
-- this response.
create or replace function public.get_public_player_house(target_wallet text)
returns table(wallet text, house jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select p.wallet, p.house
  from public.player_data p
  where lower(p.wallet) = lower(target_wallet)
    and coalesce(p.house ->> 'visibility', 'private') = 'public'
  limit 1;
$$;

revoke all on function public.get_public_player_house(text) from public;
grant execute on function public.get_public_player_house(text) to anon;
grant execute on function public.get_public_player_house(text) to authenticated;

