-- Check-ins move from a single mood word to a five-step level with feeling tags.
-- Existing rows are mapped as in LEGACY_MOOD_MAPPING (shared/checkin.ts); the old
-- word stays in "mood" so the mapping can be redone.
ALTER TABLE "mood_checkin" ALTER COLUMN "mood" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mood_checkin" ADD COLUMN "level" integer;--> statement-breakpoint
ALTER TABLE "mood_checkin" ADD COLUMN "tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
UPDATE "mood_checkin" SET
  "level" = CASE "mood"
    WHEN 'happy' THEN 5
    WHEN 'calm' THEN 4
    WHEN 'improved' THEN 4
    WHEN 'neutral' THEN 3
    WHEN 'sad' THEN 2
    WHEN 'anxious' THEN 2
    WHEN 'stressed' THEN 2
    ELSE 3
  END,
  "tags" = CASE "mood"
    WHEN 'happy' THEN ARRAY['happy']::text[]
    WHEN 'calm' THEN ARRAY['calm']::text[]
    WHEN 'sad' THEN ARRAY['sad']::text[]
    WHEN 'anxious' THEN ARRAY['anxious']::text[]
    WHEN 'stressed' THEN ARRAY['stressed']::text[]
    ELSE '{}'::text[]
  END;--> statement-breakpoint
ALTER TABLE "mood_checkin" ALTER COLUMN "level" SET NOT NULL;
