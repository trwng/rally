-- Add image attachment support to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachments jsonb;

-- Ensure authenticated users can still read/write messages with new column
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

-- Storage RLS policies for chat_photos bucket
-- Allow authenticated users to upload chat photos
CREATE POLICY "Authenticated users can upload chat photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat_photos');

-- Allow authenticated users to read any chat photo (access is gated by message visibility)
CREATE POLICY "Authenticated users can read chat photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat_photos');

-- Allow users to delete their own chat photos (best-effort)
CREATE POLICY "Authenticated users can delete their own chat photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat_photos' AND owner = auth.uid());