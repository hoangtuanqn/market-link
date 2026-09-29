export type NotificationKindCode =
  | 'announcement'
  | 'farmer_application'
  | 'farmer_approved'
  | 'farmer_rejected'
  | 'farmer_suspended'
  | 'farmer_reinstated'
  | 'feedback'
  | 'quality_reported'
  | 'quality_escalated'
  | 'quality_decided'
  | 'shelf_life_violation'
  | 'shelf_life_locked'
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

export type NotificationCategoryCode =
  'messages' | 'announcements' | 'account' | 'farmerApplications' | 'feedback' | 'qualityReports';

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
