import { getServiceSupabase } from './server';
import { generateTicketId } from '../ticket-generator';
import { Attendee, ScanLog, ScanResponse } from '../types';

// In-memory fallback database for local development/testing when Supabase env vars are not set
class LocalDataStore {
  attendees: Map<string, Attendee> = new Map();
  scanLogs: ScanLog[] = [];
  private lock: Promise<void> = Promise.resolve();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // A couple of initial demo records if completely empty
    const demo1: Attendee = {
      id: 'd1000000-0000-0000-0000-000000000001',
      ticket_id: 'NUV-KHL-DEMO8899AA',
      name: 'Vishwa Prajapati',
      enrollment: '26001017',
      phone: '9409679991',
      status: 'registered',
      created_at: new Date().toISOString(),
      entry_time: null,
      entry_gate: null,
      entry_scanner: null,
    };
    const demo2: Attendee = {
      id: 'd2000000-0000-0000-0000-000000000002',
      ticket_id: 'NUV-KHL-DEMO9900BB',
      name: 'Jiya Khetwani',
      enrollment: '26000996',
      phone: '8460916715',
      status: 'registered',
      created_at: new Date().toISOString(),
      entry_time: null,
      entry_gate: null,
      entry_scanner: null,
    };
    this.attendees.set(demo1.ticket_id, demo1);
    this.attendees.set(demo2.ticket_id, demo2);
  }

  // Atomic mutex execution for local fallback simulation
  async runAtomic<T>(op: () => Promise<T>): Promise<T> {
    let release: () => void = () => {};
    const nextLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    const currentLock = this.lock;
    this.lock = (async () => {
      await currentLock;
      await nextLock;
    })();

    await currentLock;
    try {
      return await op();
    } finally {
      release();
    }
  }
}

// Global singleton across serverless invocations where possible
const globalForStore = global as unknown as { localStore?: LocalDataStore };
const localStore = globalForStore.localStore || new LocalDataStore();
if (process.env.NODE_ENV !== 'production') {
  globalForStore.localStore = localStore;
}

/**
 * 1. ATOMIC ENTRY VERIFICATION
 * Uses Supabase RPC 'process_qr_entry' (row-level lock) or atomic mutex fallback
 */
export async function recordQREntry({
  ticketId,
  gate,
  scannerId,
  scanType = 'entry',
}: {
  ticketId: string;
  gate: string;
  scannerId: string;
  scanType?: 'entry' | 'manual_entry';
}): Promise<ScanResponse> {
  const cleanTicket = ticketId.trim();
  const supabase = getServiceSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('process_qr_entry', {
        p_ticket_id: cleanTicket,
        p_gate: gate,
        p_scanner_id: scannerId,
        p_scan_type: scanType,
      });

      if (error) {
        console.error('Supabase RPC error on process_qr_entry:', error);
        throw error;
      }
      return data as ScanResponse;
    } catch (err: unknown) {
      console.warn('Supabase query failed, falling back to local verification:', (err as Error).message);
    }
  }

  // Local Atomic Fallback
  return await localStore.runAtomic(async () => {
    const now = new Date().toISOString();
    const attendee = localStore.attendees.get(cleanTicket);

    if (!attendee) {
      const log: ScanLog = {
        id: crypto.randomUUID(),
        ticket_id: cleanTicket,
        attendee_id: null,
        scan_type: scanType,
        result: 'invalid',
        scanner_id: scannerId,
        gate,
        scanned_at: now,
      };
      localStore.scanLogs.unshift(log);
      return {
        success: false,
        result: 'invalid',
        message: 'This ticket is not registered for NUV Khelaiya.',
        ticket_id: cleanTicket,
        scanned_at: now,
      };
    }

    if (attendee.status === 'revoked') {
      const log: ScanLog = {
        id: crypto.randomUUID(),
        ticket_id: cleanTicket,
        attendee_id: attendee.id,
        scan_type: scanType,
        result: 'revoked',
        scanner_id: scannerId,
        gate,
        scanned_at: now,
      };
      localStore.scanLogs.unshift(log);
      return {
        success: false,
        result: 'revoked',
        message: 'TICKET REVOKED. Please contact the event organizer.',
        attendee,
        scanned_at: now,
      };
    }

    if (attendee.status === 'entered') {
      const log: ScanLog = {
        id: crypto.randomUUID(),
        ticket_id: cleanTicket,
        attendee_id: attendee.id,
        scan_type: scanType,
        result: 'already_entered',
        scanner_id: scannerId,
        gate,
        scanned_at: now,
      };
      localStore.scanLogs.unshift(log);
      return {
        success: false,
        result: 'already_entered',
        message: 'ALREADY ENTERED. This ticket was already scanned.',
        attendee,
        scanned_at: now,
      };
    }

    if (attendee.status === 'registered') {
      attendee.status = 'entered';
      attendee.entry_time = now;
      attendee.entry_gate = gate;
      attendee.entry_scanner = scannerId;

      const log: ScanLog = {
        id: crypto.randomUUID(),
        ticket_id: cleanTicket,
        attendee_id: attendee.id,
        scan_type: scanType,
        result: 'valid',
        scanner_id: scannerId,
        gate,
        scanned_at: now,
      };
      localStore.scanLogs.unshift(log);

      return {
        success: true,
        result: 'valid',
        message: 'ENTRY APPROVED',
        attendee,
        scanned_at: now,
      };
    }

    return {
      success: false,
      result: 'error',
      message: 'Unexpected ticket state',
      scanned_at: now,
    };
  });
}

/**
 * 2. SECOND VERIFICATION SCANNER
 * Read-only check. NEVER alters status!
 */
export async function verifyQR({
  ticketId,
  gate,
  scannerId,
}: {
  ticketId: string;
  gate: string;
  scannerId: string;
}): Promise<ScanResponse> {
  const cleanTicket = ticketId.trim();
  const supabase = getServiceSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('process_qr_verify', {
        p_ticket_id: cleanTicket,
        p_gate: gate,
        p_scanner_id: scannerId,
      });
      if (error) throw error;
      return data as ScanResponse;
    } catch (err) {
      console.warn('Supabase verify RPC failed, falling back:', err);
    }
  }

  // Local Fallback
  const now = new Date().toISOString();
  const attendee = localStore.attendees.get(cleanTicket);

  if (!attendee) {
    localStore.scanLogs.unshift({
      id: crypto.randomUUID(),
      ticket_id: cleanTicket,
      attendee_id: null,
      scan_type: 'verification',
      result: 'invalid',
      scanner_id: scannerId,
      gate,
      scanned_at: now,
    });
    return {
      success: false,
      result: 'invalid',
      message: 'This ticket is not registered for NUV Khelaiya.',
      ticket_id: cleanTicket,
      scanned_at: now,
    };
  }

  localStore.scanLogs.unshift({
    id: crypto.randomUUID(),
    ticket_id: cleanTicket,
    attendee_id: attendee.id,
    scan_type: 'verification',
    result: attendee.status === 'revoked' ? 'revoked' : 'valid',
    scanner_id: scannerId,
    gate,
    scanned_at: now,
  });

  const resultStatus =
    attendee.status === 'entered'
      ? 'valid_entered'
      : attendee.status === 'registered'
      ? 'valid_not_entered'
      : 'revoked';

  return {
    success: true,
    result: resultStatus,
    message:
      attendee.status === 'entered'
        ? 'VALID — ENTERED'
        : attendee.status === 'registered'
        ? 'VALID — NOT ENTERED'
        : 'TICKET REVOKED',
    attendee,
    scanned_at: now,
  };
}

/**
 * 3. MANUAL ENTRY FALLBACK
 */
export async function recordManualEntry({
  attendeeId,
  gate,
  scannerId,
  adminNote = 'Manual override',
}: {
  attendeeId: string;
  gate: string;
  scannerId: string;
  adminNote?: string;
}): Promise<ScanResponse> {
  const supabase = getServiceSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('process_manual_entry', {
        p_attendee_id: attendeeId,
        p_gate: gate,
        p_scanner_id: scannerId,
        p_admin_note: adminNote,
      });
      if (error) throw error;
      return data as ScanResponse;
    } catch (err) {
      console.warn('Supabase manual entry failed, falling back:', err);
    }
  }

  // Local fallback
  let targetAttendee: Attendee | null = null;
  for (const att of localStore.attendees.values()) {
    if (att.id === attendeeId) {
      targetAttendee = att;
      break;
    }
  }

  if (!targetAttendee) {
    return {
      success: false,
      result: 'invalid',
      message: 'Attendee not found.',
    };
  }

  return await recordQREntry({
    ticketId: targetAttendee.ticket_id,
    gate,
    scannerId,
    scanType: 'manual_entry',
  });
}

/**
 * 4. GET ATTENDEES (SEARCH & FILTER)
 */
export async function getAttendees({
  search = '',
  status = '',
  limit = 50,
  offset = 0,
}: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = getServiceSupabase();

  if (supabase) {
    // 1. Try RPC first (SECURITY DEFINER bypasses RLS)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_attendees', {
        p_search: search,
        p_status: status,
        p_limit: limit,
        p_offset: offset,
      });

      if (!rpcError && rpcData && Array.isArray(rpcData.attendees)) {
        return { attendees: rpcData.attendees as Attendee[], total: rpcData.total || 0 };
      }
    } catch {
      // Fallback to direct query
    }

    try {
      let query = supabase.from('attendees').select('*', { count: 'exact' });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,enrollment.ilike.%${search}%,ticket_id.ilike.%${search}%,phone.ilike.%${search}%`
        );
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        return { attendees: data as Attendee[], total: count || 0 };
      }
    } catch (err) {
      console.warn('Supabase getAttendees query failed, falling back:', err);
    }
  }

  // Local Fallback
  let list = Array.from(localStore.attendees.values());

  if (status && status !== 'all') {
    list = list.filter((a) => a.status === status);
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.enrollment.toLowerCase().includes(q) ||
        a.ticket_id.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q)
    );
  }

  const total = list.length;
  const paginated = list.slice(offset, offset + limit);
  return { attendees: paginated, total };
}

/**
 * 5. BATCH IMPORT ATTENDEES
 */
export async function importAttendeesBatch(
  rows: { name: string; enrollment: string; phone: string }[]
): Promise<{ imported: number; updated: number; errors: number }> {
  const supabase = getServiceSupabase();
  let imported = 0;
  let updated = 0;
  let errors = 0;

  if (supabase) {
    // 1. Try RPC first (SECURITY DEFINER bypasses RLS)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('batch_import_attendees', {
        p_rows: rows,
      });

      if (!rpcError && rpcData && typeof rpcData.imported === 'number') {
        return {
          imported: rpcData.imported,
          updated: rpcData.updated || 0,
          errors: rpcData.errors || 0,
        };
      }
    } catch {
      // Fallback to direct batch insert
    }

    try {
      // Check existing enrollments
      const enrollments = rows.map((r) => r.enrollment);
      const { data: existing } = await supabase
        .from('attendees')
        .select('enrollment, ticket_id')
        .in('enrollment', enrollments);

      const existingMap = new Map((existing || []).map((e) => [e.enrollment, e.ticket_id]));

      const toInsert: Attendee[] = [];
      const now = new Date().toISOString();

      for (const row of rows) {
        if (existingMap.has(row.enrollment)) {
          updated++;
          continue;
        }

        toInsert.push({
          id: crypto.randomUUID(),
          ticket_id: generateTicketId(),
          name: row.name,
          enrollment: row.enrollment,
          phone: row.phone,
          status: 'registered',
          created_at: now,
          entry_time: null,
          entry_gate: null,
          entry_scanner: null,
        });
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('attendees').insert(toInsert);
        if (error) throw error;
        imported = toInsert.length;
      }

      return { imported, updated, errors };
    } catch (err) {
      console.warn('Supabase batch import failed, falling back:', err);
    }
  }

  // Local fallback
  for (const row of rows) {
    try {
      let found = false;
      for (const existing of localStore.attendees.values()) {
        if (existing.enrollment === row.enrollment) {
          found = true;
          updated++;
          break;
        }
      }

      if (!found) {
        const newAttendee: Attendee = {
          id: crypto.randomUUID(),
          ticket_id: generateTicketId(),
          name: row.name,
          enrollment: row.enrollment,
          phone: row.phone,
          status: 'registered',
          created_at: new Date().toISOString(),
          entry_time: null,
          entry_gate: null,
          entry_scanner: null,
        };
        localStore.attendees.set(newAttendee.ticket_id, newAttendee);
        imported++;
      }
    } catch {
      errors++;
    }
  }

  return { imported, updated, errors };
}

/**
 * 6. REISSUE / REVOKE TICKET
 */
export async function reissueAttendeeTicket(
  attendeeId: string,
  action: 'reissue' | 'revoke'
): Promise<{ success: boolean; newTicketId?: string; message: string }> {
  const supabase = getServiceSupabase();

  if (supabase) {
    try {
      if (action === 'revoke') {
        const { error } = await supabase
          .from('attendees')
          .update({ status: 'revoked' })
          .eq('id', attendeeId);
        if (error) throw error;
        return { success: true, message: 'Ticket successfully revoked.' };
      } else {
        const newTicketId = generateTicketId();
        const { error } = await supabase
          .from('attendees')
          .update({
            ticket_id: newTicketId,
            status: 'registered',
            entry_time: null,
            entry_gate: null,
            entry_scanner: null,
          })
          .eq('id', attendeeId);
        if (error) throw error;
        return { success: true, newTicketId, message: 'New ticket generated successfully.' };
      }
    } catch (err) {
      console.warn('Supabase reissue failed, falling back:', err);
    }
  }

  // Local Fallback
  for (const att of localStore.attendees.values()) {
    if (att.id === attendeeId) {
      if (action === 'revoke') {
        att.status = 'revoked';
        return { success: true, message: 'Ticket revoked.' };
      } else {
        localStore.attendees.delete(att.ticket_id);
        att.ticket_id = generateTicketId();
        att.status = 'registered';
        att.entry_time = null;
        att.entry_gate = null;
        att.entry_scanner = null;
        localStore.attendees.set(att.ticket_id, att);
        return { success: true, newTicketId: att.ticket_id, message: 'New ticket generated.' };
      }
    }
  }

  return { success: false, message: 'Attendee not found.' };
}

/**
 * 7. DASHBOARD & LIVE EVENT STATS
 */
export async function getDashboardStats() {
  const supabase = getServiceSupabase();

  if (supabase) {
    try {
      const { count: totalRegistered } = await supabase
        .from('attendees')
        .select('*', { count: 'exact', head: true });

      const { count: enteredCount } = await supabase
        .from('attendees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'entered');

      const { count: revokedCount } = await supabase
        .from('attendees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'revoked');

      const { count: gate1Count } = await supabase
        .from('attendees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'entered')
        .eq('entry_gate', 'Gate 1');

      const { count: gate2Count } = await supabase
        .from('attendees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'entered')
        .eq('entry_gate', 'Gate 2');

      const { count: duplicateCount } = await supabase
        .from('scan_logs')
        .select('*', { count: 'exact', head: true })
        .eq('result', 'already_entered');

      const { count: invalidCount } = await supabase
        .from('scan_logs')
        .select('*', { count: 'exact', head: true })
        .eq('result', 'invalid');

      const { data: recentScans } = await supabase
        .from('scan_logs')
        .select('*, attendee:attendees(name, enrollment)')
        .order('scanned_at', { ascending: false })
        .limit(20);

      const total = totalRegistered || 0;
      const entered = enteredCount || 0;
      const remaining = Math.max(0, total - entered - (revokedCount || 0));

      return {
        total,
        entered,
        remaining,
        revoked: revokedCount || 0,
        gate1: gate1Count || 0,
        gate2: gate2Count || 0,
        duplicates: duplicateCount || 0,
        invalids: invalidCount || 0,
        entryPercentage: total > 0 ? Math.round((entered / total) * 100) : 0,
        recentScans: recentScans || [],
      };
    } catch (err) {
      console.warn('Supabase stats query failed, falling back:', err);
    }
  }

  // Local Fallback
  let total = 0;
  let entered = 0;
  let revoked = 0;
  let gate1 = 0;
  let gate2 = 0;

  for (const att of localStore.attendees.values()) {
    total++;
    if (att.status === 'entered') {
      entered++;
      if (att.entry_gate === 'Gate 1') gate1++;
      if (att.entry_gate === 'Gate 2') gate2++;
    } else if (att.status === 'revoked') {
      revoked++;
    }
  }

  let duplicates = 0;
  let invalids = 0;
  for (const log of localStore.scanLogs) {
    if (log.result === 'already_entered') duplicates++;
    if (log.result === 'invalid') invalids++;
  }

  const remaining = Math.max(0, total - entered - revoked);
  const recentScans = localStore.scanLogs.slice(0, 20).map((log) => {
    let att: Attendee | null = null;
    if (log.attendee_id) {
      for (const a of localStore.attendees.values()) {
        if (a.id === log.attendee_id) {
          att = a;
          break;
        }
      }
    }
    return {
      ...log,
      attendee: att ? { name: att.name, enrollment: att.enrollment } : null,
    };
  });

  return {
    total,
    entered,
    remaining,
    revoked,
    gate1,
    gate2,
    duplicates,
    invalids,
    entryPercentage: total > 0 ? Math.round((entered / total) * 100) : 0,
    recentScans,
  };
}

/**
 * 8. GET SCAN AUDIT LOGS
 */
export async function getScanLogs({
  limit = 50,
  offset = 0,
  gate,
  scannerId,
  result,
  ticketId,
}: {
  limit?: number;
  offset?: number;
  gate?: string;
  scannerId?: string;
  result?: string;
  ticketId?: string;
}) {
  const supabase = getServiceSupabase();

  if (supabase) {
    try {
      let query = supabase.from('scan_logs').select('*, attendee:attendees(*)', { count: 'exact' });

      if (gate && gate !== 'all') query = query.eq('gate', gate);
      if (scannerId && scannerId !== 'all') query = query.eq('scanner_id', scannerId);
      if (result && result !== 'all') query = query.eq('result', result);
      if (ticketId) query = query.ilike('ticket_id', `%${ticketId}%`);

      const { data, count, error } = await query
        .order('scanned_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        return { logs: data as ScanLog[], total: count || 0 };
      }
    } catch (err) {
      console.warn('Supabase getScanLogs query failed, falling back:', err);
    }
  }

  // Local fallback
  let list = [...localStore.scanLogs];

  if (gate && gate !== 'all') list = list.filter((l) => l.gate === gate);
  if (scannerId && scannerId !== 'all') list = list.filter((l) => l.scanner_id === scannerId);
  if (result && result !== 'all') list = list.filter((l) => l.result === result);
  if (ticketId) {
    const q = ticketId.toLowerCase();
    list = list.filter((l) => l.ticket_id.toLowerCase().includes(q));
  }

  const total = list.length;
  const paginated = list.slice(offset, offset + limit).map((log) => {
    let attendee: Attendee | null = null;
    if (log.attendee_id) {
      for (const a of localStore.attendees.values()) {
        if (a.id === log.attendee_id) {
          attendee = a;
          break;
        }
      }
    }
    return { ...log, attendee };
  });

  return { logs: paginated, total };
}

/**
 * 9. SEED DEV / TEST DATA (Up to 1,500 fake attendees)
 */
export async function seedTestData(count = 1500): Promise<{ count: number }> {
  const firstNames = ['Aarav', 'Vishwa', 'Jiya', 'Dev', 'Aditya', 'Rhea', 'Kavya', 'Aryan', 'Ananya', 'Rohan', 'Tanvi', 'Manan', 'Disha', 'Karan', 'Pooja', 'Harsh', 'Isha', 'Yash', 'Meera', 'Rishi'];
  const lastNames = ['Patel', 'Shah', 'Prajapati', 'Khetwani', 'Desai', 'Mehta', 'Joshi', 'Trivedi', 'Sharma', 'Pandya', 'Vora', 'Dave', 'Chauhan', 'Parmar', 'Solanki'];
  
  const generated: { name: string; enrollment: string; phone: string }[] = [];
  const baseEnrollment = 26001000;

  for (let i = 0; i < count; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3 + 7) % lastNames.length];
    const enrollment = (baseEnrollment + i).toString();
    // Safe mock phone number starting with 9000
    const phone = `90000${String(10000 + i).slice(-5)}`;
    generated.push({
      name: `${fn} ${ln}`,
      enrollment,
      phone,
    });
  }

  const res = await importAttendeesBatch(generated);
  return { count: res.imported + res.updated };
}
