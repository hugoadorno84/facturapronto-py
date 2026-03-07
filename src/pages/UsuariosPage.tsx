import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleLabels: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  consultora: 'Consultora',
  empresa: 'Empresa',
};

const UsuariosPage = () => {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: '' as string, empresa_id: '' });

  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*, profiles!user_roles_user_id_fkey(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: empresas } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id, razon_social');
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create user via admin API would need edge function
      // For now, create via signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name } },
      });

      if (authError || !authData.user) throw authError || new Error('No user');

      const roleData: any = {
        user_id: authData.user.id,
        role: form.role,
      };

      if (form.role === 'consultora') {
        roleData.consultora_id = userRole?.consultora_id;
      }
      if (form.role === 'empresa') {
        roleData.empresa_id = form.empresa_id;
        // Also get consultora_id from empresa
        const { data: emp } = await supabase.from('empresas').select('consultora_id').eq('id', form.empresa_id).single();
        if (emp) roleData.consultora_id = emp.consultora_id;
      }

      const { error: roleError } = await supabase.from('user_roles').insert(roleData);
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      setOpen(false);
      setForm({ email: '', password: '', full_name: '', role: '', empresa_id: '' });
      toast.success('Usuario creado exitosamente');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const availableRoles: AppRole[] = userRole?.role === 'super_admin'
    ? ['super_admin', 'consultora', 'empresa']
    : ['empresa'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuarios</h1>
          <p className="text-muted-foreground mt-1">Administre los usuarios del sistema</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nuevo Usuario</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear Usuario</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(r => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.role === 'empresa' && (
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Select value={form.empresa_id} onValueChange={v => setForm({ ...form, empresa_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar empresa" /></SelectTrigger>
                    <SelectContent>
                      {empresas?.map(e => <SelectItem key={e.id} value={e.id}>{e.razon_social}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando...' : 'Crear Usuario'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card className="glass-panel">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Fecha Creación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : !userRoles?.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay usuarios registrados</p>
                  </TableCell>
                </TableRow>
              ) : (
                userRoles?.map(ur => (
                  <TableRow key={ur.id}>
                    <TableCell className="font-medium text-foreground">
                      {(ur as any).profiles?.full_name || ur.user_id.slice(0, 8)}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{roleLabels[ur.role]}</Badge></TableCell>
                    <TableCell>{new Date(ur.created_at).toLocaleDateString('es-PY')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsuariosPage;
