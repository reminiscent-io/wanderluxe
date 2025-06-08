
-- Define constant for bucket name
\set bucket_name 'chat-attachments'

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  :'bucket_name', 
  :'bucket_name', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for chat attachments
-- Policy for uploading files (users can upload to their own folder)
INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression, command)
VALUES (
  'chat-attachments-upload-policy',
  :'bucket_name',
  'Users can upload their own attachments',
  'auth.uid()::text = (storage.foldername(name))[1]',
  'auth.uid()::text = (storage.foldername(name))[1]',
  'INSERT'
)
ON CONFLICT (id) DO NOTHING;

-- Policy for viewing files (public read access)
INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression, command)
VALUES (
  'chat-attachments-read-policy',
  :'bucket_name',
  'Anyone can view attachments',
  'true',
  'true',
  'SELECT'
)
ON CONFLICT (id) DO NOTHING;
