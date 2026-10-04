-- ========================================================================
-- NUV KHELAIYA 2026: NAMELESS PHYSICAL PASSES & TICKET APPROVAL UPDATE
-- Run this in Supabase SQL Editor if you want to support physical pass approval
-- ========================================================================

-- 1. Relax table constraints so nameless passes can be generated
ALTER TABLE attendees ALTER COLUMN name DROP NOT NULL;
ALTER TABLE attendees ALTER COLUMN enrollment DROP NOT NULL;
ALTER TABLE attendees ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE attendees DROP CONSTRAINT IF EXISTS attendees_enrollment_key;

-- 2. Update status check constraint to support 'unapproved' and 'approved'
ALTER TABLE attendees DROP CONSTRAINT IF EXISTS attendees_status_check;
ALTER TABLE attendees ADD CONSTRAINT attendees_status_check 
  CHECK (status IN ('registered', 'approved', 'unapproved', 'entered', 'revoked'));

-- 3. Update scan_logs result constraint to include 'not_approved'
ALTER TABLE scan_logs DROP CONSTRAINT IF EXISTS scan_logs_result_check;
ALTER TABLE scan_logs ADD CONSTRAINT scan_logs_result_check 
  CHECK (result IN ('valid', 'already_entered', 'not_approved', 'invalid', 'revoked', 'error'));

-- 4. Update atomic process_qr_entry stored procedure
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
    v_clean_ticket TEXT;
BEGIN
    v_clean_ticket := trim(p_ticket_id);

    -- Try to match exact ticket_id, or enrollment, or normalized ID
    SELECT * INTO v_attendee
    FROM attendees
    WHERE ticket_id = v_clean_ticket
       OR enrollment = v_clean_ticket
    FOR UPDATE;

    -- CASE 1: Ticket not found
    IF NOT FOUND THEN
        INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at, metadata)
        VALUES (v_clean_ticket, NULL, p_scan_type, 'invalid', p_scanner_id, p_gate, v_now, p_metadata);

        RETURN jsonb_build_object(
            'success', false,
            'result', 'invalid',
            'message', 'This ticket is not registered for NUV Khelaiya.',
            'ticket_id', v_clean_ticket,
            'scanned_at', v_now
        );
    END IF;

    -- CASE 2: Ticket revoked
    IF v_attendee.status = 'revoked' THEN
        INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at, metadata)
        VALUES (v_clean_ticket, v_attendee.id, p_scan_type, 'revoked', p_scanner_id, p_gate, v_now, p_metadata);

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

    -- CASE 3: Already entered (prevent double entry)
    IF v_attendee.status = 'entered' THEN
        INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at, metadata)
        VALUES (v_clean_ticket, v_attendee.id, p_scan_type, 'already_entered', p_scanner_id, p_gate, v_now, p_metadata);

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

    -- CASE 4: Unapproved pass (not yet issued/approved at distribution desk)
    IF v_attendee.status = 'unapproved' THEN
        INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at, metadata)
        VALUES (v_clean_ticket, v_attendee.id, p_scan_type, 'not_approved', p_scanner_id, p_gate, v_now, p_metadata);

        RETURN jsonb_build_object(
            'success', false,
            'result', 'not_approved',
            'message', 'TICKET NOT APPROVED / NOT DISTRIBUTED. Please approve pass at desk.',
            'attendee', jsonb_build_object(
                'id', v_attendee.id,
                'name', v_attendee.name,
                'enrollment', v_attendee.enrollment,
                'ticket_id', v_attendee.ticket_id
            ),
            'scanned_at', v_now
        );
    END IF;

    -- CASE 5: Valid registered or approved pass - grant entry atomically
    IF v_attendee.status IN ('registered', 'approved') THEN
        UPDATE attendees
        SET status = 'entered',
            entry_time = v_now,
            entry_gate = p_gate,
            entry_scanner = p_scanner_id
        WHERE id = v_attendee.id;

        INSERT INTO scan_logs (ticket_id, attendee_id, scan_type, result, scanner_id, gate, scanned_at, metadata)
        VALUES (v_clean_ticket, v_attendee.id, p_scan_type, 'valid', p_scanner_id, p_gate, v_now, p_metadata);

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

    RETURN jsonb_build_object(
        'success', false,
        'result', 'error',
        'message', 'Unexpected pass status.',
        'scanned_at', v_now
    );
END;
$$;
