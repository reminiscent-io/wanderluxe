-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments', 
  'chat-attachments', 
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
  'chat-attachments',
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
  'chat-attachments',
  'Anyone can view attachments',
  'true',
  'true',
  'SELECT'
)
ON CONFLICT (id) DO NOTHING;