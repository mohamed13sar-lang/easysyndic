import type { AuthUser } from "./auth";

export type Residence = {
  id: string;
  name: string;
  address: string;
  city: string;
  district?: string | null;
  totalApartments?: number | null;
  apartmentsCount?: number;
  residentsCount?: number;
  openComplaintsCount?: number;
  unpaidPaymentsAmount?: number;
  isActive?: boolean;
};

export type DashboardStats = {
  totalResidences?: number;
  totalApartments?: number;
  totalResidents?: number;
  totalRevenue?: number;
  unpaidAmount?: number;
  pendingPayments?: number;
  openComplaints?: number;
  notificationsSentCount?: number;
};

export type User = AuthUser & { createdAt?: string };

export type Assembly = {
  id: string;
  title: string;
  status: string;
  scheduledAt: string;
  location: string;
};

export type Announcement = {
  id: string;
  title: string;
  message: string;
  priority: string;
  publishAt: string;
};
