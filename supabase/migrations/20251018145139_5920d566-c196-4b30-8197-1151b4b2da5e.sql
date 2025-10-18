-- Create storage bucket for board documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'board-documents',
  'board-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'image/png', 'image/jpeg']
);

-- Storage policies for documents
CREATE POLICY "Users can upload documents to their org"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'board-documents'
);

CREATE POLICY "Users can view documents in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'board-documents'
);

CREATE POLICY "Users can delete their uploaded documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'board-documents' AND
  owner = auth.uid()
);