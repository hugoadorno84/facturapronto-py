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
import { Plus, Search, Users, Pencil, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleLabels: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  consultora: 'Consultora',
  empresa: 'Empresa',
};

interface UserRow {
  id: string;
  user_id: string;
  role: AppRole;
  consultora_id: string | null;
  empresa_id: string | null;
  created_at: string;
  full_name: string;
  email: string;
  consultora_nombre: string | null;
  empresa_nombre: string | null;
}

const UsuariosPage = () => {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: '' as string, consultora_id: '', empresa_id: '' });
  const [editForm, setEditForm] = useState({ full_name: '', role: '' as string, consultora_id: '', empresa_id: '' });

  const { data: users, isLoading } = useQuery({
    queryKey: ['user-roles-with-profiles'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = roles.map(r => r.user_id);
      const consultoraIds = [...new Set(roles.map(r => r.consultora_id).filter(Boolean))] as string[];
      const empresaIds = [...new Set(roles.map(r => r.empresa_id).filter(Boolean))] as string[];

      const [profilesRes, consultorasRes, empresasRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
        consultoraIds.length ? supabase.from('consultoras').select('id, nombre').in('id', consultoraIds) : { data: [] },
        empresaIds.length ? supabase.from('empresas').select('id, razon_social').in('id', empresaIds) : { data: [] },
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p.full_name]) || []);
      const consultoraMap = new Map<string, string>(consultorasRes.data?.map(c => [c.id, c.nombre] as [string, string]) || []);
      const empresaMap = new Map<string, string>(empresasRes.data?.map(e => [e.id, e.razon_social] as [string, string]) || []);

      return roles.map(r => ({
        ...r,
        full_name: profileMap.get(r.user_id) || r.user_id.slice(0, 8),
        email: '',
        consultora_nombre: r.consultora_id ? consultoraMap.get(r.consultora_id) || null : null,
        empresa_nombre: r.empresa_id ? empresaMap.get(r.empresa_id) || null : null,
      })) as UserRow[];
    },
  });

  const { data: consultoras } = useQuery({
    queryKey: ['consultoras-select'],
    queryFn: async () => {
      const { data } = await supabase.from('consultoras').select('id, nombre');
      return data || [];
    },
    enabled: userRole?.role === 'super_admin',
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
      const body: any = {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
      };
      if (form.role === 'consultora' && userRole?.role === 'super_admin') {
        body.consultora_id = form.consultora_id;
      } else if (form.role === 'consultora') {
        body.consultora_id = userRole?.consultora_id;
      }
      if (form.role === 'empresa') {
        body.empresa_id = form.empresa_id;
      }
      const { data, error } = await supabase.functions.invoke('create-user', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-with-profiles'] });
      setOpen(false);
      setForm({ email: '', password: '', full_name: '', role: '', consultora_id: '', empresa_id: '' });
      toast.success('Usuario creado exitosamente');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return;

      // Update profile name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: editForm.full_name })
        .eq('user_id', editUser.user_id);
      if (profileError) throw profileError;

      // Update role assignment
      const roleUpdate: any = { role: editForm.role };
      roleUpdate.consultora_id = editForm.role === 'consultora' ? editForm.consultora_id || null : null;
      roleUpdate.empresa_id = editForm.role === 'empresa' ? editForm.empresa_id || null : null;

      const { error: roleError } = await supabase
        .from('user_roles')
        .update(roleUpdate)
        .eq('id', editUser.id);
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-with-profiles'] });
      setEditUser(null);
      toast.success('Usuario actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!passwordUser) return;
      const { data, error } = await supabase.functions.invoke('update-password', {
        body: { user_id: passwordUser.user_id, password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      setPasswordUser(null);
      setNewPassword('');
      toast.success('Contraseña actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const openEdit = (user: UserRow) => {
    setEditUser(user);
    setEditForm({
      full_name: user.full_name,
      role: user.role,
      consultora_id: user.consultora_id || '',
      empresa_id: user.empresa_id || '',
    });
  };

  const availableRoles: AppRole[] = userRole?.role === 'super_admin'
    ? ['super_admin', 'consultora', 'empresa']
    : ['empresa'];

  const filtered = users?.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.consultora_nombre || '').toLowerCase().includes(search.toLowerCase())
  );

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
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v, consultora_id: '', empresa_id: '' })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(r => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.role === 'consultora' && userRole?.role === 'super_admin' && (
                <div className="space-y-2">
                  <Label>Consultora</Label>
                  <Select value={form.consultora_id} onValueChange={v => setForm({ ...form, consultora_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar consultora" /></SelectTrigger>
                    <SelectContent>
                      {consultoras?.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
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

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuario</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm({ ...editForm, role: v, consultora_id: '', empresa_id: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map(r => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editForm.role === 'consultora' && userRole?.role === 'super_admin' && (
              <div className="space-y-2">
                <Label>Consultora</Label>
                <Select value={editForm.consultora_id} onValueChange={v => setEditForm({ ...editForm, consultora_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar consultora" /></SelectTrigger>
                  <SelectContent>
                    {consultoras?.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editForm.role === 'empresa' && (
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={editForm.empresa_id} onValueChange={v => setEditForm({ ...editForm, empresa_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar empresa" /></SelectTrigger>
                  <SelectContent>
                    {empresas?.map(e => <SelectItem key={e.id} value={e.id}>{e.razon_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={!!passwordUser} onOpenChange={(o) => !o && setPasswordUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cambiar Contraseña</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Usuario: <span className="font-medium text-foreground">{passwordUser?.full_name}</span></p>
          <form onSubmit={(e) => { e.preventDefault(); passwordMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nueva contraseña</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
            </div>
            <Button type="submit" className="w-full" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? 'Actualizando...' : 'Actualizar Contraseña'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
                <TableHead>Consultora / Empresa</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : !filtered?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay usuarios registrados</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(ur => (
                  <TableRow key={ur.id}>
                    <TableCell className="font-medium text-foreground">{ur.full_name}</TableCell>
                    <TableCell><Badge variant="secondary">{roleLabels[ur.role]}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">
                      {ur.consultora_nombre || ur.empresa_nombre || '—'}
                    </TableCell>
                    <TableCell>{new Date(ur.created_at).toLocaleDateString('es-PY')}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(ur)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {userRole?.role === 'super_admin' && (
                        <Button variant="ghost" size="icon" onClick={() => { setPasswordUser(ur); setNewPassword(''); }}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
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
