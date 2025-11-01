-- Add period_end_date column to board_papers
ALTER TABLE public.board_papers 
ADD COLUMN period_end_date date;