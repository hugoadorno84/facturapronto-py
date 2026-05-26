
-- PROVEEDORES
CREATE TABLE public.proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  nombre text NOT NULL,
  ruc text,
  telefono text,
  email text,
  direccion text,
  plazo_pago_dias integer NOT NULL DEFAULT 30,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proveedores TO authenticated;
GRANT ALL ON public.proveedores TO service_role;

ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all proveedores" ON public.proveedores
  FOR ALL TO authenticated USING (has_role(auth.uid(),'super_admin'));
CREATE POLICY "Consultora manage proveedores of their empresas" ON public.proveedores
  FOR ALL TO authenticated USING (empresa_id IN (SELECT id FROM empresas WHERE consultora_id = get_user_consultora_id(auth.uid())));
CREATE POLICY "Empresa manage their own proveedores" ON public.proveedores
  FOR ALL TO authenticated USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PAGOS (cobros + pagos)
CREATE TYPE public.pago_tipo AS ENUM ('cobro','pago');

CREATE TABLE public.pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  tipo public.pago_tipo NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  monto numeric NOT NULL DEFAULT 0,
  moneda text NOT NULL DEFAULT 'PYG',
  metodo text,
  referencia text,
  cliente_id uuid,
  proveedor_id uuid,
  factura_id uuid,
  observacion text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagos TO authenticated;
GRANT ALL ON public.pagos TO service_role;

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all pagos" ON public.pagos
  FOR ALL TO authenticated USING (has_role(auth.uid(),'super_admin'));
CREATE POLICY "Consultora manage pagos of their empresas" ON public.pagos
  FOR ALL TO authenticated USING (empresa_id IN (SELECT id FROM empresas WHERE consultora_id = get_user_consultora_id(auth.uid())));
CREATE POLICY "Empresa manage their own pagos" ON public.pagos
  FOR ALL TO authenticated USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE TRIGGER update_pagos_updated_at BEFORE UPDATE ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pagos_empresa_fecha ON public.pagos(empresa_id, fecha DESC);
CREATE INDEX idx_proveedores_empresa ON public.proveedores(empresa_id);
