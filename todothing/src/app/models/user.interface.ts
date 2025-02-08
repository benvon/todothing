export interface User {
  guid: string;        // Stable identifier that never changes
  userId: string;      // Can be changed by user
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}
