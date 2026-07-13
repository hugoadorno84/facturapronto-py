
CREATE TYPE public.recibo_status AS ENUM ('emitido','anulado');

CREATE TABLE public.recibos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  numero text NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  moneda text NOT NULL DEFAULT 'PYG',
  total numeric NOT NULL DEFAULT 0,
  metodo text,
  referencia text,
  observacion text,
  estado public.recibo_status NOT NULL DEFAULT 'emitido',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, numero)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recibos TO authenticated;
GRANT ALL ON public.recibos TO service_role;
ALTER TABLE public.recibos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresa manage their own recibos" ON public.recibos FOR ALL
  USING (empresa_id = public.get_user_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "Consultora manage recibos of their empresas" ON public.recibos FOR ALL
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE consultora_id = public.get_user_consultora_id(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT id FROM public.empresas WHERE consultora_id = public.get_user_consultora_id(auth.uid())));
CREATE POLICY "Super admins manage all recibos" ON public.recibos FOR ALL
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_recibos_updated_at BEFORE UPDATE ON public.recibos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recibo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recibo_id uuid NOT NULL REFERENCES public.recibos(id) ON DELETE CASCADE,
  factura_id uuid REFERENCES public.facturas(id) ON DELETE SET NULL,
  monto numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recibo_items TO authenticated;
GRANT ALL ON public.recibo_items TO service_role;
ALTER TABLE public.recibo_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access recibo_items via recibo" ON public.recibo_items FOR ALL
  USING (recibo_id IN (SELECT id FROM public.recibos))
  WITH CHECK (recibo_id IN (SELECT id FROM public.recibos));

ALTER TABLE public.pagos ADD COLUMN recibo_id uuid REFERENCES public.recibos(id) ON DELETE CASCADE;
CREATE INDEX idx_pagos_recibo ON public.pagos(recibo_id);
CREATE INDEX idx_recibo_items_recibo ON public.recibo_items(recibo_id);
CREATE INDEX idx_recibo_items_factura ON public.recibo_items(factura_id);
