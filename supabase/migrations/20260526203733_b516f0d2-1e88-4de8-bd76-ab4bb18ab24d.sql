DROP POLICY IF EXISTS "Consultora can manage related roles" ON public.user_roles;

CREATE POLICY "Consultora can insert empresa roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'consultora'::app_role)
  AND role = 'empresa'::app_role
  AND empresa_id IN (
    SELECT empresas.id FROM empresas
    WHERE empresas.consultora_id = get_user_consultora_id(auth.uid())
  )
);

CREATE POLICY "Consultora can update empresa roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'consultora'::app_role)
  AND role = 'empresa'::app_role
  AND empresa_id IN (
    SELECT empresas.id FROM empresas
    WHERE empresas.consultora_id = get_user_consultora_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'consultora'::app_role)
  AND role = 'empresa'::app_role
  AND empresa_id IN (
    SELECT empresas.id FROM empresas
    WHERE empresas.consultora_id = get_user_consultora_id(auth.uid())
  )
);

CREATE POLICY "Consultora can delete empresa roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'consultora'::app_role)
  AND role = 'empresa'::app_role
  AND empresa_id IN (
    SELECT empresas.id FROM empresas
    WHERE empresas.consultora_id = get_user_consultora_id(auth.uid())
  )
);