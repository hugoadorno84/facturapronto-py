ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS factura_electronica boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.factura_plantillas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  logo_url text,
  color_primario text NOT NULL DEFAULT '#2563eb',
  titulo_documento text NOT NULL DEFAULT 'FACTURA',
  mostrar_timbrado boolean NOT NULL DEFAULT true,
  mostrar_observacion boolean NOT NULL DEFAULT true,
  mostrar_datos_empresa boolean NOT NULL DEFAULT true,
  pie_pagina text,
  notas_legales text,
  email_asunto text NOT NULL DEFAULT 'Factura {numero}',
  email_cuerpo text NOT NULL DEFAULT 'Estimado cliente, adjuntamos su factura {numero}.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.factura_plantillas TO authenticated;
GRANT ALL ON public.factura_plantillas TO service_role;

ALTER TABLE public.factura_plantillas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa manages own plantilla"
ON public.factura_plantillas FOR ALL TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()))
WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Consultora manages plantillas of its empresas"
ON public.factura_plantillas FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = factura_plantillas.empresa_id AND e.consultora_id = public.get_user_consultora_id(auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = factura_plantillas.empresa_id AND e.consultora_id = public.get_user_consultora_id(auth.uid())));

CREATE POLICY "Super admin manages plantillas"
ON public.factura_plantillas FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_factura_plantillas_updated_at
BEFORE UPDATE ON public.factura_plantillas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();