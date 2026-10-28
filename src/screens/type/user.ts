export interface User {
    id: string;
    email: string;
    phone?: string;
    fullName: string;
    dateOfBirth?: string;
    gender?: "MALE" | "FAMALE";
    avatarUrl?: string;
    targetWeight?: number;
    allergies?: string[];
    dislikedFoods?: string[];
    status: UserStatus;
    createdAt: string;
    updatedAt: string;
  }

  export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';