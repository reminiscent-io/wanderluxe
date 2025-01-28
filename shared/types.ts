export interface TripDetails {
  accommodation?: {
    type: string;
    preferences: string[];
  };
  activities?: {
    planned: Array<{
      name: string;
      date?: string;
      duration?: string;
      cost?: number;
    }>;
    suggestions: string[];
  };
  transportation?: {
    mode: string;
    details: string;
  };
}

export interface ChatMessage {
  type: "message";
  tripId: number;
  userId: number;
  content: string;
  isAi: boolean;
}

export interface FileUploadResponse {
  id: number;
  filename: string;
  path: string;
  type: string;
  createdAt: string;
}

export interface ErrorResponse {
  message: string;
  status?: number;
}
