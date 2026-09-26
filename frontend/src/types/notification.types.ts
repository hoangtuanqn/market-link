/** FR-042 — khớp docs/api-contract.md §9 (NotificationResource, khung STOMP, preferences). */
export type NotificationKindCode =
  | 'announcement'
  | 'farmer_application'
  | 'farmer_approved'
  | 'farmer_rejected'
  | 'farmer_suspended'
  | 'farmer_reinstated'
  | 'message'
  | 'test';

export type NotificationItem = {
  id: number;
  kind: NotificationKindCode;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationAlert = { inApp: boolean; browser: boolean; sound: boolean };

/** Khung trên /user/topic/notifications. id null với kind không lưu (message, test). */
export type NotificationFrame = {
  id: number | null;
  kind: NotificationKindCode;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
  persistent: boolean;
  unreadCount: number;
  alert: NotificationAlert;
  conversationId: number | null;
};

export type NotificationCategoryCode = 'messages' | 'announcements' | 'account' | 'farmerApplications';

export type NotificationCategoryPreference = {
  category: NotificationCategoryCode;
  inApp: boolean;
  browser: boolean;
};

export type NotificationPreferences = {
  categories: NotificationCategoryPreference[];
  sound: boolean;
  quietOn: boolean;
  quietFrom: string;
  quietTo: string;
};

export type AnnouncementAudience = 'all' | 'customers' | 'farmers';

/** FR-077 — AnnouncementResource. */
export type Announcement = {
  id: number;
  title: string;
  content: string;
  audience: AnnouncementAudience;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

export type AnnouncementInput = {
  title: string;
  content: string;
  audience: AnnouncementAudience;
  startsAt: string | null;
  endsAt: string | null;
};
