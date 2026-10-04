export type AttendeeStatus = 'registered' | 'approved' | 'unapproved' | 'entered' | 'revoked';

export type ScanType = 'entry' | 'verification' | 'manual_entry' | 'approval';

export type ScanResultStatus =
  | 'valid'
  | 'already_entered'
  | 'not_approved'
  | 'invalid'
  | 'revoked'
  | 'error';

export interface Attendee {
  id: string;
  ticket_id: string;
  pass_number?: number;
  name: string;
  enrollment: string;
  phone: string;
  status: AttendeeStatus;
  created_at: string;
  entry_time: string | null;
  entry_gate: string | null;
  entry_scanner: string | null;
}

export interface ScanLog {
  id: string;
  ticket_id: string;
  attendee_id: string | null;
  scan_type: ScanType;
  result: ScanResultStatus;
  scanner_id: string;
  gate: string;
  scanned_at: string;
  metadata?: Record<string, unknown> | null;
  attendee?: Attendee | null;
}

export interface ScanResponse {
  success: boolean;
  result: ScanResultStatus | 'valid_entered' | 'valid_not_entered';
  message: string;
  ticket_id?: string;
  attendee?: Partial<Attendee> | null;
  scanned_at?: string;
}

export type GateId = 'Gate 1' | 'Gate 2';
export type ScannerId = 'G1-A' | 'G1-B' | 'G2-A' | 'G2-B';

export interface ScannerConfig {
  gate: GateId;
  scannerId: ScannerId;
}

export interface ImportAttendeeRow {
  name: string;
  enrollment: string;
  phone: string;
}

export interface ImportValidationResult {
  validRows: ImportAttendeeRow[];
  duplicateEnrollments: string[];
  duplicatePhones: string[];
  existingEnrollments: string[];
  invalidRows: { row: number; data: Record<string, string>; error: string }[];
  totalParsed: number;
}
