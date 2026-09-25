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
  /** False: tài khoản tạo qua Google, chưa đặt mật khẩu. */
  hasPassword?: boolean;
};
