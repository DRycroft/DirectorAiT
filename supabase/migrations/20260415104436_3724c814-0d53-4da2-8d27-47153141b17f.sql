
-- Add finalisation tracking columns to board_packs
ALTER TABLE public.board_packs
  ADD COLUMN IF NOT EXISTS finalised_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS finalised_by uuid DEFAULT NULL;
