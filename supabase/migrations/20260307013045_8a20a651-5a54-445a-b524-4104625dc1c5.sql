
-- Drop all existing restrictive policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Consultora users can view roles in their consultora" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can select all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Consultora admins can manage roles in their consultora" ON public.user_roles;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins full access"
ON public.user_roles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Consultora can view related roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'consultora') AND (
    consultora_id = get_user_consultora_id(auth.uid())
    OR empresa_id IN (SELECT id FROM empresas WHERE consultora_id = get_user_consultora_id(auth.uid()))
  )
);

CREATE POLICY "Consultora can manage related roles"
ON public.user_roles FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'consultora') AND (
    consultora_id = get_user_consultora_id(auth.uid())
    OR empresa_id IN (SELECT id FROM empresas WHERE consultora_id = get_user_consultora_id(auth.uid()))
  )
);
