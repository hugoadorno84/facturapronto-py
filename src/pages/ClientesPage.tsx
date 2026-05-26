import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, UserCheck, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = {
  nombre: '',
  ruc: '',
  sucursal: '',
  direccion: '',
  telefono: '',
  email: '',
  tipo_documento: 'RUC',
  plazo_pago_dias: 30,
  activo: true,
};

const ClientesPage = () => {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (editing) {
      setForm({
        nombre: editing.nombre ?? '',
        ruc: editing.ruc ?? '',
        sucursal: editing.sucursal ?? '',
        direccion: editing.direccion ?? '',
        telefono: editing.telefono ?? '',
        email: editing.email ?? '',
        tipo_documento: editing.tipo_documento ?? 'RUC',
        plazo_pago_dias: editing.plazo_pago_dias ?? 30,
        activo: editing.activo ?? true,
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing, open]);

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        sucursal: form.sucursal || null,
        direccion: form.direccion || null,
        telefono: form.telefono || null,
        email: form.email || null,
        plazo_pago_dias: Number(form.plazo_pago_dias) || 30,
      };
      if (editing) {
        const { error } = await supabase.from('clientes').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const empresa_id = userRole?.empresa_id;
        if (!empresa_id) throw new Error('No empresa');
        const { error } = await supabase.from('clientes').insert({ ...payload, empresa_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setOpen(false);
      setEditing(null);
      toast.success(editing ? 'Cliente actualizado' : 'Cliente creado exitosamente');
    },
    onError: () => toast.error('Error al guardar cliente'),
  });

  const filtered = clientes?.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) || c.ruc.includes(search)
  );

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1">Administre los clientes de su empresa</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nuevo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Editar Cliente' : 'Crear Cliente'}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre / Razón Social *</Label>
                  <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>RUC / CI *</Label>
                  <Input value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} placeholder="80012345-6" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sucursal</Label>
                <Input value={form.sucursal} onChange={e => setForm({ ...form, sucursal: e.target.value })} placeholder="Ej: Casa Central, Sucursal Asunción" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="0981 123 456" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="cliente@email.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plazo de pago (días)</Label>
                  <Input type="number" min={0} value={form.plazo_pago_dias} onChange={e => setForm({ ...form, plazo_pago_dias: Number(e.target.value) })} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
                  <Label>Activo</Label>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear Cliente'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o RUC..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card className="glass-panel">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>RUC/CI</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="text-center">Plazo</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <UserCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay clientes registrados</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered?.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">{c.nombre}</TableCell>
                    <TableCell className="font-mono text-sm">{c.ruc}</TableCell>
                    <TableCell>{c.sucursal || '—'}</TableCell>
                    <TableCell>{c.email || '—'}</TableCell>
                    <TableCell>{c.telefono || '—'}</TableCell>
                    <TableCell className="text-center">{c.plazo_pago_dias ?? 30} d</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.activo ? 'default' : 'secondary'}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
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

export default ClientesPage;
