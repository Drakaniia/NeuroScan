// Shared TypeScript types
// Add your type definitions here

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ScanResult {
  id: string;
  timestamp: Date;
  data: unknown;
}
