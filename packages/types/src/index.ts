// Main exports
export * from './lot';
export * from './build';
export * from './sub';
export * from './inspection';
export * from './procurement';
export * from './analytics';

// Common types
export type Channel = 'EMAIL' | 'SMS' | 'PHONE' | 'MAIL' | 'IN_PERSON';
export type Direction = 'OUTBOUND' | 'INBOUND';
export type ContactType = 'INITIAL_OUTREACH' | 'FOLLOW_UP' | 'OFFER' | 'NEGOTIATION' | 'CLOSING';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
