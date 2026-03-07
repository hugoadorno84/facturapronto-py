
-- Drop existing restrictive policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Consultora admins can manage roles in their consultora" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Consultora users can view roles in their consultora"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'consultora'::app_role) 
    AND (
      consultora_id = get_user_consultora_id(auth.uid())
      OR empresa_id IN (
        SELECT id FROM public.empresas WHERE consultora_id = get_user_consultora_id(auth.uid())
      )
    )
  );

CREATE POLICY "Super admins can select all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Consultora admins can manage roles in their consultora"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'consultora'::app_role) 
    AND (
      consultora_id = get_user_consultora_id(auth.uid())
      OR empresa_id IN (
        SELECT id FROM public.empresas WHERE consultora_id = get_user_consultora_id(auth.uid())
      )
    )
  );
