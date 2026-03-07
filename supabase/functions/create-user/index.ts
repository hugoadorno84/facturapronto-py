import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { email, password, full_name, role, consultora_id, empresa_id } = await req.json();

    if (!email || !password || !full_name || !role) {
      throw new Error('Faltan campos requeridos');
    }

    if (role === 'empresa' && !empresa_id) {
      throw new Error('Debe asignar una empresa al crear un usuario empresa');
    }

    if (role === 'consultora' && !consultora_id) {
      throw new Error('Debe asignar una consultora al crear un usuario consultora');
    }

    // Create user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (userError) throw userError;

    // Assign role
    const roleData: any = { user_id: userData.user.id, role };
    if (consultora_id) roleData.consultora_id = consultora_id;
    if (empresa_id) roleData.empresa_id = empresa_id;

    const { error: roleError } = await supabaseAdmin.from('user_roles').insert(roleData);
    if (roleError) throw roleError;

    return new Response(JSON.stringify({ user: userData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
