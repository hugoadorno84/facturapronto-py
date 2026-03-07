
-- Fix empresas policies: drop restrictive, create permissive
DROP POLICY IF EXISTS "Consultora users can manage their empresas" ON public.empresas;
DROP POLICY IF EXISTS "Empresa users can view their own empresa" ON public.empresas;
DROP POLICY IF EXISTS "Super admins can do everything on empresas" ON public.empresas;

CREATE POLICY "Super admins can do everything on empresas"
  ON public.empresas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Consultora users can manage their empresas"
  ON public.empresas FOR ALL TO authenticated
  USING (consultora_id = get_user_consultora_id(auth.uid()));

CREATE POLICY "Empresa users can view their own empresa"
  ON public.empresas FOR SELECT TO authenticated
  USING (id = get_user_empresa_id(auth.uid()));

-- Fix consultoras policies: drop restrictive, create permissive
DROP POLICY IF EXISTS "Super admins can do everything on consultoras" ON public.consultoras;
DROP POLICY IF EXISTS "Consultora users can view their own consultora" ON public.consultoras;

CREATE POLICY "Super admins can do everything on consultoras"
  ON public.consultoras FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Consultora users can view their own consultora"
  ON public.consultoras FOR SELECT TO authenticated
  USING (id = get_user_consultora_id(auth.uid()));

-- Fix clientes policies
DROP POLICY IF EXISTS "Super admins can manage all clientes" ON public.clientes;
DROP POLICY IF EXISTS "Consultora users can manage clientes of their empresas" ON public.clientes;
DROP POLICY IF EXISTS "Empresa users can manage their own clientes" ON public.clientes;

CREATE POLICY "Super admins can manage all clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Consultora users can manage clientes of their empresas"
  ON public.clientes FOR ALL TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE consultora_id = get_user_consultora_id(auth.uid())));

CREATE POLICY "Empresa users can manage their own clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

-- Fix productos policies
DROP POLICY IF EXISTS "Super admins can manage all productos" ON public.productos;
DROP POLICY IF EXISTS "Consultora users can manage productos of their empresas" ON public.productos;
DROP POLICY IF EXISTS "Empresa users can manage their own productos" ON public.productos;

CREATE POLICY "Super admins can manage all productos"
  ON public.productos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Consultora users can manage productos of their empresas"
  ON public.productos FOR ALL TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE consultora_id = get_user_consultora_id(auth.uid())));

CREATE POLICY "Empresa users can manage their own productos"
  ON public.productos FOR ALL TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

-- Fix facturas policies
DROP POLICY IF EXISTS "Super admins can manage all facturas" ON public.facturas;
DROP POLICY IF EXISTS "Consultora users can manage facturas of their empresas" ON public.facturas;
DROP POLICY IF EXISTS "Empresa users can manage their own facturas" ON public.facturas;

CREATE POLICY "Super admins can manage all facturas"
  ON public.facturas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Consultora users can manage facturas of their empresas"
  ON public.facturas FOR ALL TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE consultora_id = get_user_consultora_id(auth.uid())));

CREATE POLICY "Empresa users can manage their own facturas"
  ON public.facturas FOR ALL TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

-- Fix factura_items policies
DROP POLICY IF EXISTS "Super admins can manage all factura_items" ON public.factura_items;
DROP POLICY IF EXISTS "Consultora users can manage factura_items" ON public.factura_items;
DROP POLICY IF EXISTS "Empresa users can manage their own factura_items" ON public.factura_items;

CREATE POLICY "Super admins can manage all factura_items"
  ON public.factura_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Consultora users can manage factura_items"
  ON public.factura_items FOR ALL TO authenticated
  USING (factura_id IN (SELECT f.id FROM facturas f JOIN empresas e ON f.empresa_id = e.id WHERE e.consultora_id = get_user_consultora_id(auth.uid())));

CREATE POLICY "Empresa users can manage their own factura_items"
  ON public.factura_items FOR ALL TO authenticated
  USING (factura_id IN (SELECT id FROM facturas WHERE empresa_id = get_user_empresa_id(auth.uid())));

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
