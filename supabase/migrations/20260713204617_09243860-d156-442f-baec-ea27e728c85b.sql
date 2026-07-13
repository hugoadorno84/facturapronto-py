
-- Fix profiles: restrict SELECT to own profile (+ super_admin)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- Fix recibo_items: scope via recibos.empresa_id
DROP POLICY IF EXISTS "Access recibo_items via recibo" ON public.recibo_items;
CREATE POLICY "Access recibo_items via recibo" ON public.recibo_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recibos r
      WHERE r.id = recibo_items.recibo_id
        AND (
          public.has_role(auth.uid(), 'super_admin')
          OR r.empresa_id = public.get_user_empresa_id(auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.empresas e
            WHERE e.id = r.empresa_id
              AND e.consultora_id = public.get_user_consultora_id(auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recibos r
      WHERE r.id = recibo_items.recibo_id
        AND (
          public.has_role(auth.uid(), 'super_admin')
          OR r.empresa_id = public.get_user_empresa_id(auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.empresas e
            WHERE e.id = r.empresa_id
              AND e.consultora_id = public.get_user_consultora_id(auth.uid())
          )
        )
    )
  );
