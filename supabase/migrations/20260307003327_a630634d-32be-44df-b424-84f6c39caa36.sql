
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'consultora', 'empresa');

-- Create enum for entity status
CREATE TYPE public.entity_status AS ENUM ('activo', 'inactivo', 'suspendido');

-- Create enum for invoice status
CREATE TYPE public.invoice_status AS ENUM ('borrador', 'emitida', 'anulada', 'pagada');

-- Create enum for IVA types
CREATE TYPE public.iva_type AS ENUM ('10', '5', 'exento');

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===================== CONSULTORAS =====================
CREATE TABLE public.consultoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  ruc TEXT NOT NULL UNIQUE,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  estado entity_status NOT NULL DEFAULT 'activo',
  plan TEXT DEFAULT 'basico',
  max_empresas INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consultoras ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_consultoras_updated_at
  BEFORE UPDATE ON public.consultoras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== EMPRESAS =====================
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consultora_id UUID NOT NULL REFERENCES public.consultoras(id) ON DELETE CASCADE,
  ruc TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  timbrado TEXT,
  fecha_inicio_timbrado DATE,
  fecha_fin_timbrado DATE,
  numero_establecimiento TEXT DEFAULT '001',
  punto_expedicion TEXT DEFAULT '001',
  estado entity_status NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== USER ROLES =====================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  consultora_id UUID REFERENCES public.consultoras(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===================== PROFILES =====================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================== CLIENTES =====================
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  ruc TEXT NOT NULL,
  nombre TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  tipo_documento TEXT DEFAULT 'RUC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== PRODUCTOS =====================
CREATE TABLE public.productos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo TEXT,
  descripcion TEXT NOT NULL,
  precio NUMERIC(15,2) NOT NULL DEFAULT 0,
  iva iva_type NOT NULL DEFAULT '10',
  unidad_medida TEXT DEFAULT 'UNI',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_productos_updated_at
  BEFORE UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== FACTURAS =====================
CREATE TABLE public.facturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  numero TEXT NOT NULL,
  timbrado TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  condicion TEXT DEFAULT 'contado',
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_iva NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  estado invoice_status NOT NULL DEFAULT 'borrador',
  observacion TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_facturas_updated_at
  BEFORE UPDATE ON public.facturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== FACTURA ITEMS =====================
CREATE TABLE public.factura_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factura_id UUID NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES public.productos(id),
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(15,2) NOT NULL DEFAULT 0,
  iva iva_type NOT NULL DEFAULT '10',
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.factura_items ENABLE ROW LEVEL SECURITY;

-- ===================== SECURITY DEFINER FUNCTIONS =====================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_consultora_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT consultora_id FROM public.user_roles
  WHERE user_id = _user_id AND consultora_id IS NOT NULL LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT empresa_id FROM public.user_roles
  WHERE user_id = _user_id AND empresa_id IS NOT NULL LIMIT 1
$$;

-- ===================== RLS POLICIES =====================

-- CONSULTORAS
CREATE POLICY "Super admins can do everything on consultoras" ON public.consultoras
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Consultora users can view their own consultora" ON public.consultoras
  FOR SELECT TO authenticated USING (id = public.get_user_consultora_id(auth.uid()));

-- EMPRESAS
CREATE POLICY "Super admins can do everything on empresas" ON public.empresas
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Consultora users can manage their empresas" ON public.empresas
  FOR ALL TO authenticated USING (consultora_id = public.get_user_consultora_id(auth.uid()));

CREATE POLICY "Empresa users can view their own empresa" ON public.empresas
  FOR SELECT TO authenticated USING (id = public.get_user_empresa_id(auth.uid()));

-- USER ROLES
CREATE POLICY "Super admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Consultora admins can manage roles in their consultora" ON public.user_roles
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'consultora')
    AND consultora_id = public.get_user_consultora_id(auth.uid())
  );

-- PROFILES
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- CLIENTES
CREATE POLICY "Super admins can manage all clientes" ON public.clientes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Consultora users can manage clientes of their empresas" ON public.clientes
  FOR ALL TO authenticated USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE consultora_id = public.get_user_consultora_id(auth.uid()))
  );

CREATE POLICY "Empresa users can manage their own clientes" ON public.clientes
  FOR ALL TO authenticated USING (empresa_id = public.get_user_empresa_id(auth.uid()));

-- PRODUCTOS
CREATE POLICY "Super admins can manage all productos" ON public.productos
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Consultora users can manage productos of their empresas" ON public.productos
  FOR ALL TO authenticated USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE consultora_id = public.get_user_consultora_id(auth.uid()))
  );

CREATE POLICY "Empresa users can manage their own productos" ON public.productos
  FOR ALL TO authenticated USING (empresa_id = public.get_user_empresa_id(auth.uid()));

-- FACTURAS
CREATE POLICY "Super admins can manage all facturas" ON public.facturas
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Consultora users can manage facturas of their empresas" ON public.facturas
  FOR ALL TO authenticated USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE consultora_id = public.get_user_consultora_id(auth.uid()))
  );

CREATE POLICY "Empresa users can manage their own facturas" ON public.facturas
  FOR ALL TO authenticated USING (empresa_id = public.get_user_empresa_id(auth.uid()));

-- FACTURA ITEMS
CREATE POLICY "Super admins can manage all factura_items" ON public.factura_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Consultora users can manage factura_items" ON public.factura_items
  FOR ALL TO authenticated USING (
    factura_id IN (
      SELECT f.id FROM public.facturas f JOIN public.empresas e ON f.empresa_id = e.id
      WHERE e.consultora_id = public.get_user_consultora_id(auth.uid())
    )
  );

CREATE POLICY "Empresa users can manage their own factura_items" ON public.factura_items
  FOR ALL TO authenticated USING (
    factura_id IN (SELECT id FROM public.facturas WHERE empresa_id = public.get_user_empresa_id(auth.uid()))
  );

-- Indexes
CREATE INDEX idx_empresas_consultora ON public.empresas(consultora_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_consultora ON public.user_roles(consultora_id);
CREATE INDEX idx_user_roles_empresa ON public.user_roles(empresa_id);
CREATE INDEX idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX idx_productos_empresa ON public.productos(empresa_id);
CREATE INDEX idx_facturas_empresa ON public.facturas(empresa_id);
CREATE INDEX idx_facturas_cliente ON public.facturas(cliente_id);
CREATE INDEX idx_factura_items_factura ON public.factura_items(factura_id);
