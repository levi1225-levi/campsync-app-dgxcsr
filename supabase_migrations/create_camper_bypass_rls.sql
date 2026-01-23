
-- Migration: Create RPC function to bypass RLS when creating campers
-- This function is needed because RLS policies may prevent direct inserts
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION create_camper_bypass_rls(
  p_camp_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_date_of_birth DATE,
  p_wristband_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_camper_id UUID;
BEGIN
  -- Insert the camper
  INSERT INTO campers (
    camp_id,
    first_name,
    last_name,
    date_of_birth,
    wristband_id,
    registration_status,
    check_in_status
  )
  VALUES (
    p_camp_id,
    p_first_name,
    p_last_name,
    p_date_of_birth,
    p_wristband_id,
    'registered',
    'not-arrived'
  )
  RETURNING id INTO v_camper_id;

  RETURN v_camper_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_camper_bypass_rls TO authenticated;

-- Comment explaining the function
COMMENT ON FUNCTION create_camper_bypass_rls IS 'Creates a new camper bypassing RLS policies. Used by camp administrators to add campers.';
