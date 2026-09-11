-- Leaderboard visits expose only the public layout needed to render a
-- read-only dimension. Inventory, progress and collected collectibles remain
-- private. Ranked players can be visited regardless of the older house
-- visibility flag because appearing on the scene leaderboard is the entry.
drop function if exists public.get_public_player_house(text);

create function public.get_public_player_house(target_wallet text)
returns table(wallet text, house jsonb, plots jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select p.wallet, p.house, p.plots
  from public.player_data p
  where lower(p.wallet) = lower(target_wallet)
  limit 1;
$$;

revoke all on function public.get_public_player_house(text) from public;
grant execute on function public.get_public_player_house(text) to anon;
grant execute on function public.get_public_player_house(text) to authenticated;
