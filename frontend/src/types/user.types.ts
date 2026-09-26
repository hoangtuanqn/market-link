import type { USER_ROLE } from '@/constants/enums';

export type RoleType = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export type UserType = {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  role: RoleType;
  createdAt?: string;
  /** False: an account created through Google that has not set a password. */
  hasPassword?: boolean;
  /** A Google image (full URL) or a self-uploaded image ("/uploads/avatars/…"); when absent show the initial letter. */
  avatarUrl?: string;
};
