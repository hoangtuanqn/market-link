import type { USER_ROLE } from '@/constants/enums';
import type { AddressParts } from './address.types';

export type RoleType = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export type UserType = {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  addressParts?: AddressParts;
  role: RoleType;
  createdAt?: string;
  hasPassword?: boolean;
  avatarUrl?: string;
};
