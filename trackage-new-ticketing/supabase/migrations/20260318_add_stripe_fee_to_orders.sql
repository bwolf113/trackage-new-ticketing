-- Add stripe_fee column to orders for storing actual Stripe processing fees
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_fee numeric(10,2);
