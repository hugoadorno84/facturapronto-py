ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS moneda text NOT NULL DEFAULT 'PYG';
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS fx_rate numeric NOT NULL DEFAULT 1;
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'pago_parcial';