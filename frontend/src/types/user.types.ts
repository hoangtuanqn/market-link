import type { USER_ROLE } from '@/constants/enums';
import type { AddressParts } from './address.types';

export type RoleType = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export type UserType = {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  /** The whole address as one line, composed by the server from `addressParts`. */
  address?: string;
  /** Absent on accounts saved before addresses had parts (FR-001). */
  addressParts?: AddressParts;
  role: RoleType;
  createdAt?: string;
  /** False: an account created through Google that has not set a password. */
  hasPassword?: boolean;
  /** A Google image (full URL) or a self-uploaded image ("/uploads/avatars/…"); when absent show the initial letter. */
  avatarUrl?: string;
};
