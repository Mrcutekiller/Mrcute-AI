export interface LiveSessionConfig {
  voiceName?: string;
}

export type MessageRole = 'user' | 'model';

export interface TranscriptionMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  isComplete: boolean;
}

export interface BlobData {
  data: string; // Base64
  mimeType: string;
}

export type HistoryType = 'voice' | 'chat' | 'upload';

export interface HistoryItem {
  id: string;
  type: HistoryType;
  title: string;
  date: string; // ISO string
  preview: string;
  content: any; // Flexible content based on type
}
