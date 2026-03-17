-- Widen booking_fee_pct from numeric(5,4) to numeric(5,2)
-- The app stores whole-number percentages (e.g. 10 for 10%), which overflows numeric(5,4).
ALTER TABLE events  ALTER COLUMN booking_fee_pct TYPE numeric(5,2);
ALTER TABLE tickets ALTER COLUMN booking_fee_pct TYPE numeric(5,2);
