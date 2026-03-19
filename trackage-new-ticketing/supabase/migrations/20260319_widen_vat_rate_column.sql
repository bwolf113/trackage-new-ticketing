-- vat_rate was numeric(5,4) which only holds up to 9.9999
-- We store whole percentages (e.g. 18 for 18%), so widen to numeric(5,2)
ALTER TABLE organisers ALTER COLUMN vat_rate TYPE numeric(5,2);
