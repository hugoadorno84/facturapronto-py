ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS sucursal text,
  ADD COLUMN IF NOT EXISTS plazo_pago_dias integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;