-- ========================================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO ALLOW INSTANT READ/WRITE & QR GENERATION
-- ========================================================================

-- 1. Disable RLS so publishable/anon key can read & write attendees freely
ALTER TABLE attendees DISABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs DISABLE ROW LEVEL SECURITY;

-- 2. Fast Batch Importer Function (Fast & Atomic)
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

-- 3. Fast Attendee Reader Function
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
