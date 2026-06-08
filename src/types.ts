export interface SchoolYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Member {
  id: string;
  school_year_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  grade: number | null;
  status: string;
  member_code: string;
  created_at: string;
}

export interface Event {
  id: string;
  school_year_id: string;
  name: string;
  description: string | null;
  event_date: string;
  event_type: string;
  created_at: string;
}

export interface Demerit {
  id: string;
  member_id: string;
  event_id: string | null;
  school_year_id: string;
  reason: string;
  points: number;
  issued_date: string;
  created_at: string;
  members?: { first_name: string; last_name: string };
  events?: { name: string } | null;
}

export interface AttendanceLog {
  id: string;
  member_id: string;
  event_id: string;
  school_year_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  members?: { first_name: string; last_name: string };
  events?: { name: string };
}

export type Tab = 'members' | 'events' | 'attendance' | 'demerits';
