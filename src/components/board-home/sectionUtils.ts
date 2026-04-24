export interface UpcomingMeeting {
  id: string;
  title: string;
  meeting_date: string;
  board_id: string;
}

export interface LatestPack {
  id: string;
  title: string;
  meeting_date: string;
  board_id: string;
  status: string | null;
}

export interface ReleasedReport {
  id: string;
  company_name: string;
  period_covered: string;
  status: string;
  updated_at: string;
}

export interface MyAction {
  id: string;
  title: string;
  due_date: string | null;
  status: string | null;
}

export const isOverdue = (dueDate: string | null): boolean => {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
};

export const isWithinHours = (dateIso: string, hours: number): boolean => {
  const ms = new Date(dateIso).getTime() - Date.now();
  return ms >= 0 && ms <= hours * 3600 * 1000;
};

export const isWithinDays = (dateIso: string, days: number): boolean => {
  const ms = Math.abs(new Date(dateIso).getTime() - Date.now());
  return ms <= days * 86400 * 1000;
};
