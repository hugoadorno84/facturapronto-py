
-- Notas de crédito
CREATE TABLE IF NOT EXISTS public.notas_credito (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  factura_id uuid REFERENCES public.facturas(id),
  numero text NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  moneda text NOT NULL DEFAULT 'PYG',
  motivo text NOT NULL DEFAULT 'devolucion',
  subtotal numeric NOT NULL DEFAULT 0,
  iva_10 numeric NOT NULL DEFAULT 0,
  iva_5 numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'emitida',
  observacion text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_credito TO authenticated;
GRANT ALL ON public.notas_credito TO service_role;
ALTER TABLE public.notas_credito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa can manage own notas_credito" ON public.notas_credito FOR ALL TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()))
WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "consultora can view related notas_credito" ON public.notas_credito FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = notas_credito.empresa_id AND e.consultora_id = public.get_user_consultora_id(auth.uid())));

CREATE POLICY "super_admin manages all notas_credito" ON public.notas_credito FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_notas_credito_updated_at BEFORE UPDATE ON public.notas_credito
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Items
CREATE TABLE IF NOT EXISTS public.nota_credito_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_credito_id uuid NOT NULL REFERENCES public.notas_credito(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  cantidad numeric NOT NULL DEFAULT 1,
  precio_unitario numeric NOT NULL DEFAULT 0,
  iva_tipo text NOT NULL DEFAULT '10',
  subtotal numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nota_credito_items TO authenticated;
GRANT ALL ON public.nota_credito_items TO service_role;
ALTER TABLE public.nota_credito_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manage nota_credito_items via parent" ON public.nota_credito_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.notas_credito n WHERE n.id = nota_credito_items.nota_credito_id
  AND (n.empresa_id = public.get_user_empresa_id(auth.uid())
       OR public.has_role(auth.uid(), 'super_admin'::app_role))))
WITH CHECK (EXISTS (SELECT 1 FROM public.notas_credito n WHERE n.id = nota_credito_items.nota_credito_id
  AND (n.empresa_id = public.get_user_empresa_id(auth.uid())
       OR public.has_role(auth.uid(), 'super_admin'::app_role))));

-- Link pagos to notas_credito so credit notes reduce invoice balance via existing trigger
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS nota_credito_id uuid REFERENCES public.notas_credito(id) ON DELETE CASCADE;
