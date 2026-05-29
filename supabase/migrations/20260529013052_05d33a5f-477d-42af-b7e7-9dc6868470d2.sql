
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.presupuesto_status AS ENUM ('borrador','enviado','aprobado','aceptado','rechazado','expirado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.proyecto_status AS ENUM ('abierto','en_pausa','cerrado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.orden_status AS ENUM ('abierta','en_progreso','completada','cancelada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.evento_tipo AS ENUM ('general','cobro','pago','servicio','facturacion','presupuesto');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ PRESUPUESTOS ============
CREATE TABLE public.presupuestos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  numero TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  valido_hasta DATE,
  condicion TEXT DEFAULT 'contado',
  moneda TEXT NOT NULL DEFAULT 'PYG',
  fx_rate NUMERIC NOT NULL DEFAULT 1,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total_iva NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  estado presupuesto_status NOT NULL DEFAULT 'borrador',
  observacion TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presupuestos TO authenticated;
GRANT ALL ON public.presupuestos TO service_role;
ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage all presupuestos" ON public.presupuestos FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Consultora manage presupuestos of their empresas" ON public.presupuestos FOR ALL TO authenticated
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE consultora_id = get_user_consultora_id(auth.uid())));
CREATE POLICY "Empresa manage own presupuestos" ON public.presupuestos FOR ALL TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE TRIGGER trg_presupuestos_updated_at BEFORE UPDATE ON public.presupuestos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.presupuesto_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  presupuesto_id UUID NOT NULL REFERENCES public.presupuestos(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC NOT NULL DEFAULT 1,
  precio_unitario NUMERIC NOT NULL DEFAULT 0,
  iva iva_type NOT NULL DEFAULT '10',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presupuesto_items TO authenticated;
GRANT ALL ON public.presupuesto_items TO service_role;
ALTER TABLE public.presupuesto_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage all presupuesto_items" ON public.presupuesto_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Consultora manage presupuesto_items" ON public.presupuesto_items FOR ALL TO authenticated
  USING (presupuesto_id IN (SELECT p.id FROM public.presupuestos p JOIN public.empresas e ON p.empresa_id = e.id WHERE e.consultora_id = get_user_consultora_id(auth.uid())));
CREATE POLICY "Empresa manage own presupuesto_items" ON public.presupuesto_items FOR ALL TO authenticated
  USING (presupuesto_id IN (SELECT id FROM public.presupuestos WHERE empresa_id = get_user_empresa_id(auth.uid())));

-- ============ PROYECTOS ============
CREATE TABLE public.proyectos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado proyecto_status NOT NULL DEFAULT 'abierto',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proyectos TO authenticated;
GRANT ALL ON public.proyectos TO service_role;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage all proyectos" ON public.proyectos FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Consultora manage proyectos of their empresas" ON public.proyectos FOR ALL TO authenticated
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE consultora_id = get_user_consultora_id(auth.uid())));
CREATE POLICY "Empresa manage own proyectos" ON public.proyectos FOR ALL TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE TRIGGER trg_proyectos_updated_at BEFORE UPDATE ON public.proyectos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ORDENES DE SERVICIO ============
CREATE TABLE public.ordenes_servicio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  factura_id UUID REFERENCES public.facturas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  notas TEXT,
  fecha_programada DATE,
  monto NUMERIC NOT NULL DEFAULT 0,
  moneda TEXT NOT NULL DEFAULT 'PYG',
  fx_rate NUMERIC NOT NULL DEFAULT 1,
  monto_pyg NUMERIC NOT NULL DEFAULT 0,
  estado orden_status NOT NULL DEFAULT 'abierta',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordenes_servicio TO authenticated;
GRANT ALL ON public.ordenes_servicio TO service_role;
ALTER TABLE public.ordenes_servicio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage all ordenes_servicio" ON public.ordenes_servicio FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Consultora manage ordenes of their empresas" ON public.ordenes_servicio FOR ALL TO authenticated
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE consultora_id = get_user_consultora_id(auth.uid())));
CREATE POLICY "Empresa manage own ordenes" ON public.ordenes_servicio FOR ALL TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE TRIGGER trg_ordenes_updated_at BEFORE UPDATE ON public.ordenes_servicio FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ EVENTOS CALENDARIO ============
CREATE TABLE public.eventos_calendario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  hora TIME,
  tipo evento_tipo NOT NULL DEFAULT 'general',
  factura_id UUID REFERENCES public.facturas(id) ON DELETE SET NULL,
  presupuesto_id UUID REFERENCES public.presupuestos(id) ON DELETE SET NULL,
  pago_id UUID REFERENCES public.pagos(id) ON DELETE SET NULL,
  orden_id UUID REFERENCES public.ordenes_servicio(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos_calendario TO authenticated;
GRANT ALL ON public.eventos_calendario TO service_role;
ALTER TABLE public.eventos_calendario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage all eventos" ON public.eventos_calendario FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Consultora manage eventos of their empresas" ON public.eventos_calendario FOR ALL TO authenticated
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE consultora_id = get_user_consultora_id(auth.uid())));
CREATE POLICY "Empresa manage own eventos" ON public.eventos_calendario FOR ALL TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE TRIGGER trg_eventos_updated_at BEFORE UPDATE ON public.eventos_calendario FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FX RATES (global) ============
CREATE TABLE public.fx_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_code TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_fx_rates_unique ON public.fx_rates (currency_code, rate_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_rates TO authenticated;
GRANT ALL ON public.fx_rates TO service_role;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read fx_rates" ON public.fx_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert fx_rates" ON public.fx_rates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update fx_rates" ON public.fx_rates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete fx_rates" ON public.fx_rates FOR DELETE TO authenticated USING (true);
