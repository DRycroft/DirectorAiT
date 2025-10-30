-- Delete test committee that was created during testing
DELETE FROM public.boards
WHERE title = 'Test Committee' 
AND org_id = '84828535-5f96-45b7-b782-2415199e6cad';