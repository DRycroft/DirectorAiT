CREATE TABLE public.pack_summaries (
  pack_id uuid PRIMARY KEY REFERENCES public.board_packs(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  model text NOT NULL,
  source_hash text NOT NULL,
  prompt_version text NOT NULL DEFAULT 'v1',
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid
);

ALTER TABLE public.pack_summaries ENABLE ROW LEVEL SECURITY;

-- SELECT: mirror parent board_packs visibility (any user who can SELECT the pack)
CREATE POLICY "View pack summary if can view pack"
ON public.pack_summaries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.board_packs bp
    WHERE bp.id = pack_summaries.pack_id
  )
);

-- No INSERT/UPDATE/DELETE policies => only service role (edge function) can write.