-- ========================================================================
-- NUV KHELAIYA QR TICKET & ENTRY VERIFICATION SYSTEM
-- Supabase PostgreSQL Database Schema & Atomic Functions
-- ========================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create ATTENDEES table
CREATE TABLE IF NOT EXISTS attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    enrollment TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'entered', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    entry_time TIMESTAMPTZ,
    entry_gate TEXT,
    entry_scanner TEXT
);

-- Indexes for lightning-fast queries during live scanning
CREATE INDEX IF NOT EXISTS idx_attendees_ticket_id ON attendees(ticket_id);
CREATE INDEX IF NOT EXISTS idx_attendees_enrollment ON attendees(enrollment);
CREATE INDEX IF NOT EXISTS idx_attendees_status ON attendees(status);
CREATE INDEX IF NOT EXISTS idx_attendees_name ON attendees(name);
CREATE INDEX IF NOT EXISTS idx_attendees_phone ON attendees(phone);

-- 3. Create SCAN_LOGS table
CREATE TABLE IF NOT EXISTS scan_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id TEXT NOT NULL,
    attendee_id UUID REFERENCES attendees(id) ON DELETE SET NULL,
    scan_type TEXT NOT NULL CHECK (scan_type IN ('entry', 'verification', 'manual_entry')),
    result TEXT NOT NULL CHECK (result IN ('valid', 'already_entered', 'invalid', 'revoked', 'error')),
    scanner_id TEXT NOT NULL,
    gate TEXT NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_ticket_id ON scan_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at ON scan_logs(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_logs_result ON scan_logs(result);
CREATE INDEX IF NOT EXISTS idx_scan_logs_gate ON scan_logs(gate);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanner ON scan_logs(scanner_id);

-- 4. Enable Public Access for Scanner & Admin operations
-- (Since client uses Supabase anon/publishable key)
ALTER TABLE attendees DISABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs DISABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 5. CRITICAL ATOMIC FUNCTION: process_qr_entry
-- Executes within a single transaction with row-level locking (FOR UPDATE)
-- to guarantee concurrency safety across 4 simultaneous scanner devices!
-- ========================================================================
CREATE OR REPLACE FUNCTION process_qr_entry(
    p_ticket_id TEXT,
    p_gate TEXT,
    p_scanner_id TEXT,
    p_scan_type TEXT DEFAULT 'entry',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attendee RECORD;
    v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    -- Trim and clean ticket ID
    p_ticket_id := trim(p_ticket_id);

    -- Acquire exclusive row-level lock on attendee record.
    -- If two devices scan the exact same QR simultaneously, the second device waits
    -- until the first finishes its transaction, preventing double-entry!
    SELECT * INTO v_attendee
    FROM attendees
    WHERE ticket_id = p_ticket_id
    FOR UPDATE;

    -- CASE 1: Ticket not found
    IF NOT FOUND THEN
        INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at, metadata)
        VALUES (p_ticket_id, NULL, p_scan_type, 'invalid', p_scanner_id, p_gate, v_now, p_metadata);

        RETURN jsonb_build_object(
            'success', false,
            'result', 'invalid',
            'message', 'This ticket is not registered for NUV Khelaiya.',
            'ticket_id', p_ticket_id,
            'scanned_at', v_now
        );
    END IF;

    -- CASE 2: Ticket has been revoked
    IF v_attendee.status = 'revoked' THEN
        INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at, metadata)
        VALUES (p_ticket_id, v_attendee.id, p_scan_type, 'revoked', p_scanner_id, p_gate, v_now, p_metadata);

        RETURN jsonb_build_object(
            'success', false,
            'result', 'revoked',
            'message', 'TICKET REVOKED. Please contact the event organizer.',
            'attendee', jsonb_build_object(
                'id', v_attendee.id,
                'name', v_attendee.name,
                'enrollment', v_attendee.enrollment,
                'ticket_id', v_attendee.ticket_id
            ),
            'scanned_at', v_now
        );
    END IF;

    -- CASE 3: Already entered (duplicate scan prevention)
    IF v_attendee.status = 'entered' THEN
        INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at, metadata)
        VALUES (p_ticket_id, v_attendee.id, p_scan_type, 'already_entered', p_scanner_id, p_gate, v_now, p_metadata);

        RETURN jsonb_build_object(
            'success', false,
            'result', 'already_entered',
            'message', 'ALREADY ENTERED. This ticket was already scanned.',
            'attendee', jsonb_build_object(
                'id', v_attendee.id,
                'name', v_attendee.name,
                'enrollment', v_attendee.enrollment,
                'ticket_id', v_attendee.ticket_id,
                'entry_time', v_attendee.entry_time,
                'entry_gate', v_attendee.entry_gate,
                'entry_scanner', v_attendee.entry_scanner
            ),
            'scanned_at', v_now
        );
    END IF;

    -- CASE 4: Valid registered attendee - grant entry atomically
    IF v_attendee.status = 'registered' THEN
        UPDATE attendees
        SET status = 'entered',
            entry_time = v_now,
            entry_gate = p_gate,
            entry_scanner = p_scanner_id
        WHERE id = v_attendee.id;

        INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at, metadata)
        VALUES (p_ticket_id, v_attendee.id, p_scan_type, 'valid', p_scanner_id, p_gate, v_now, p_metadata);

        RETURN jsonb_build_object(
            'success', true,
            'result', 'valid',
            'message', 'ENTRY APPROVED',
            'attendee', jsonb_build_object(
                'id', v_attendee.id,
                'name', v_attendee.name,
                'enrollment', v_attendee.enrollment,
                'ticket_id', v_attendee.ticket_id,
                'entry_time', v_now,
                'entry_gate', p_gate,
                'entry_scanner', p_scanner_id
            ),
            'scanned_at', v_now
        );
    END IF;

    -- Unexpected status
    RETURN jsonb_build_object(
        'success', false,
        'result', 'error',
        'message', 'Unexpected attendee status.',
        'scanned_at', v_now
    );
END;
$$;

-- ========================================================================
-- 6. VERIFICATION FUNCTION: process_qr_verify
-- Safe read-only check. NEVER alters status!
-- ========================================================================
CREATE OR REPLACE FUNCTION process_qr_verify(
    p_ticket_id TEXT,
    p_gate TEXT,
    p_scanner_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attendee RECORD;
    v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    p_ticket_id := trim(p_ticket_id);

    SELECT * INTO v_attendee
    FROM attendees
    WHERE ticket_id = p_ticket_id;

    IF NOT FOUND THEN
        INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at)
        VALUES (p_ticket_id, NULL, 'verification', 'invalid', p_scanner_id, p_gate, v_now);

        RETURN jsonb_build_object(
            'success', false,
            'result', 'invalid',
            'message', 'This ticket is not registered for NUV Khelaiya.',
            'ticket_id', p_ticket_id,
            'scanned_at', v_now
        );
    END IF;

    INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at)
    VALUES (p_ticket_id, v_attendee.id, 'verification', 
            CASE WHEN v_attendee.status = 'revoked' THEN 'revoked' ELSE 'valid' END, 
            p_scanner_id, p_gate, v_now);

    RETURN jsonb_build_object(
        'success', true,
        'result', CASE 
            WHEN v_attendee.status = 'entered' THEN 'valid_entered'
            WHEN v_attendee.status = 'registered' THEN 'valid_not_entered'
            WHEN v_attendee.status = 'revoked' THEN 'revoked'
            ELSE 'unknown'
        END,
        'message', CASE
            WHEN v_attendee.status = 'entered' THEN 'VALID — ENTERED'
            WHEN v_attendee.status = 'registered' THEN 'VALID — NOT ENTERED'
            WHEN v_attendee.status = 'revoked' THEN 'TICKET REVOKED'
            ELSE 'UNKNOWN STATUS'
        END,
        'attendee', jsonb_build_object(
            'id', v_attendee.id,
            'name', v_attendee.name,
            'enrollment', v_attendee.enrollment,
            'ticket_id', v_attendee.ticket_id,
            'status', v_attendee.status,
            'entry_time', v_attendee.entry_time,
            'entry_gate', v_attendee.entry_gate,
            'entry_scanner', v_attendee.entry_scanner
        ),
        'scanned_at', v_now
    );
END;
$$;

-- ========================================================================
-- 7. MANUAL ENTRY FALLBACK FUNCTION: process_manual_entry
-- Atomically checks and records manual attendee entry by Admin
-- ========================================================================
CREATE OR REPLACE FUNCTION process_manual_entry(
    p_attendee_id UUID,
    p_gate TEXT,
    p_scanner_id TEXT,
    p_admin_note TEXT DEFAULT 'Manual override'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attendee RECORD;
    v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    SELECT * INTO v_attendee
    FROM attendees
    WHERE id = p_attendee_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'result', 'invalid',
            'message', 'Attendee not found.'
        );
    END IF;

    IF v_attendee.status = 'revoked' THEN
        INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at, metadata)
        VALUES (v_attendee.ticket_id, v_attendee.id, 'manual_entry', 'revoked', p_scanner_id, p_gate, v_now, 
                jsonb_build_object('note', p_admin_note, 'manual', true));

        RETURN jsonb_build_object(
            'success', false,
            'result', 'revoked',
            'message', 'Ticket is revoked and cannot be manually admitted.'
        );
    END IF;

    IF v_attendee.status = 'entered' THEN
        INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at, metadata)
        VALUES (v_attendee.ticket_id, v_attendee.id, 'manual_entry', 'already_entered', p_scanner_id, p_gate, v_now, 
                jsonb_build_object('note', p_admin_note, 'manual', true));

        RETURN jsonb_build_object(
            'success', false,
            'result', 'already_entered',
            'message', 'Attendee was already marked as entered.',
            'attendee', jsonb_build_object(
                'id', v_attendee.id,
                'name', v_attendee.name,
                'enrollment', v_attendee.enrollment,
                'ticket_id', v_attendee.ticket_id,
                'entry_time', v_attendee.entry_time,
                'entry_gate', v_attendee.entry_gate,
                'entry_scanner', v_attendee.entry_scanner
            )
        );
    END IF;

    -- Grant entry
    UPDATE attendees
    SET status = 'entered',
        entry_time = v_now,
        entry_gate = p_gate,
        entry_scanner = p_scanner_id
    WHERE id = v_attendee.id;

    INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at, metadata)
    VALUES (v_attendee.ticket_id, v_attendee.id, 'manual_entry', 'valid', p_scanner_id, p_gate, v_now, 
            jsonb_build_object('note', p_admin_note, 'manual', true));

    RETURN jsonb_build_object(
        'success', true,
        'result', 'valid',
        'message', 'MANUAL ENTRY APPROVED',
        'attendee', jsonb_build_object(
            'id', v_attendee.id,
            'name', v_attendee.name,
            'enrollment', v_attendee.enrollment,
            'ticket_id', v_attendee.ticket_id,
            'entry_time', v_now,
            'entry_gate', p_gate,
            'entry_scanner', p_scanner_id
        ),
        'scanned_at', v_now
    );
END;
$$;

-- ========================================================================
-- 8. BATCH IMPORT FUNCTION: batch_import_attendees
-- Fast, atomic import of hundreds or thousands of attendees in 1 transaction
-- ========================================================================
CREATE OR REPLACE FUNCTION batch_import_attendees(p_rows JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row JSONB;
    v_imported INT := 0;
    v_updated INT := 0;
    v_errors INT := 0;
    v_ticket_id TEXT;
    v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        BEGIN
            IF EXISTS (SELECT 1 FROM attendees WHERE enrollment = trim(v_row->>'enrollment')) THEN
                v_updated := v_updated + 1;
            ELSE
                v_ticket_id := COALESCE(
                    v_row->>'ticket_id',
                    'NUV-KHL-' || upper(substr(md5(random()::text || clock_timestamp()::text || (v_row->>'enrollment')), 1, 10))
                );

                INSERT INTO attendees (id, ticket_id, name, enrollment, phone, status, created_at)
                VALUES (
                    gen_random_uuid(),
                    v_ticket_id,
                    trim(v_row->>'name'),
                    trim(v_row->>'enrollment'),
                    trim(v_row->>'phone'),
                    'registered',
                    v_now
                );
                v_imported := v_imported + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'imported', v_imported,
        'updated', v_updated,
        'errors', v_errors
    );
END;
$$;

-- ========================================================================
-- 9. GET ATTENDEES FUNCTION: get_all_attendees
-- ========================================================================
CREATE OR REPLACE FUNCTION get_all_attendees(
    p_search TEXT DEFAULT '',
    p_status TEXT DEFAULT '',
    p_limit INT DEFAULT 1500,
    p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_total INT;
BEGIN
    SELECT count(*) INTO v_total
    FROM attendees
    WHERE (p_status = '' OR p_status = 'all' OR status = p_status)
      AND (p_search = '' OR name ILIKE '%' || p_search || '%' OR enrollment ILIKE '%' || p_search || '%' OR ticket_id ILIKE '%' || p_search || '%' OR phone ILIKE '%' || p_search || '%');

    SELECT jsonb_build_object(
        'total', v_total,
        'attendees', COALESCE(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
    ) INTO v_result
    FROM (
        SELECT *
        FROM attendees
        WHERE (p_status = '' OR p_status = 'all' OR status = p_status)
          AND (p_search = '' OR name ILIKE '%' || p_search || '%' OR enrollment ILIKE '%' || p_search || '%' OR ticket_id ILIKE '%' || p_search || '%' OR phone ILIKE '%' || p_search || '%')
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset
    ) a;

    RETURN v_result;
END;
$$;
