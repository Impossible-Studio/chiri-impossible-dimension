-- Run once in Supabase Dashboard > SQL Editor before publishing this build.
-- It preserves every player's existing inventory, plots and collected seeds.
alter table public.player_data
  add column if not exists progress jsonb not null default
  '{
    "version": 1,
    "story": {
      "activeChapter": 1,
      "completedMissionIds": [],
      "announcedMissionIds": [],
      "flags": {},
      "completedChapterIds": []
    },
    "chiri": {
      "activeVariant": "classic",
      "unlockedVariants": ["classic"],
      "equippedItems": [],
      "personalityTraits": {}
    },
    "comic": {
      "unlockedChapterIds": [],
      "pageOrderByChapter": {}
    }
  }'::jsonb;
