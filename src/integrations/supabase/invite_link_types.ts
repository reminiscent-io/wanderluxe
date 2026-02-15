export interface InviteLink {
  id: string;
  trip_id: string;
  created_by_user_id: string;
  invite_code: string;
  permission_level: 'read' | 'edit';
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InviteLinkPreview {
  trip_id: string;
  destination: string;
  cover_image_url: string | null;
  arrival_date: string;
  departure_date: string;
  inviter_name: string;
}
