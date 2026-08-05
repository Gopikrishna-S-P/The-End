export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  attendanceDate: string;   // "YYYY-MM-DD"
  checkedInAt: string;      // ISO-8601 instant
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  alreadyRecorded: boolean;
}

export interface AttendanceCheckInRequest {
  lat?: number;
  lng?: number;
  accuracy?: number;
}
