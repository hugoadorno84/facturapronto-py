
CREATE TABLE public.factura_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  descripcion TEXT,
  timbrado TEXT,
  fecha_inicio_timbrado DATE,
  fecha_fin_timbrado DATE,
  numero_actual INTEGER NOT NULL DEFAULT 0,
  predeterminada BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.factura_series TO authenticated;
GRANT ALL ON public.factura_series TO service_role;

ALTER TABLE public.factura_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all series"
ON public.factura_series FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Consultora users manage series of their empresas"
ON public.factura_series FOR ALL TO authenticated
USING (empresa_id IN (SELECT id FROM empresas WHERE consultora_id = get_user_consultora_id(auth.uid())));

CREATE POLICY "Empresa users manage their own series"
ON public.factura_series FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE TRIGGER update_factura_series_updated_at
BEFORE UPDATE ON public.factura_series
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.facturas ADD COLUMN serie_id UUID;
CREATE INDEX idx_facturas_serie_id ON public.facturas(serie_id);
