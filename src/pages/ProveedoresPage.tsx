import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Truck } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = {
  nombre: '', ruc: '', telefono: '', email: '', direccion: '',
  plazo_pago_dias: 30, activo: true,
};

const ProveedoresPage = () => {
  const { userRole } = useAuth();
  const empresaId = userRole?.empresa_id;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (editing) {
      setForm({
        nombre: editing.nombre ?? '',
        ruc: editing.ruc ?? '',
        telefono: editing.telefono ?? '',
        email: editing.email ?? '',
        direccion: editing.direccion ?? '',
        plazo_pago_dias: editing.plazo_pago_dias ?? 30,
        activo: editing.activo ?? true,
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing]);

  const { data: proveedores, isLoading } = useQuery({
    queryKey: ['proveedores', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('proveedores').select('*').eq('empresa_id', empresaId).order('nombre');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Sin empresa');
      const payload = { ...form, plazo_pago_dias: Number(form.plazo_pago_dias) || 0, empresa_id: empresaId };
      if (editing) {
        const { error } = await supabase.from('proveedores').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('proveedores').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      setOpen(false); setEditing(null); setForm(emptyForm);
      toast.success(editing ? 'Proveedor actualizado' : 'Proveedor creado');
    },
    onError: (e: any) => toast.error(e?.message || 'Error al guardar'),
  });

  const filtered = proveedores?.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.ruc || '').includes(search) ||
    (p.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Proveedores</h1>
          <p className="text-muted-foreground mt-1">Gestione los proveedores de su empresa</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar proveedor' : 'Crear proveedor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>RUC / CI</Label>
                  <Input value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Plazo de pago (días)</Label>
                  <Input type="number" min={0} value={form.plazo_pago_dias}
                    onChange={e => setForm({ ...form, plazo_pago_dias: Number(e.target.value) })} />
                </div>
                <div className="flex items-center gap-3 pb-2">
                  <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
                  <Label>Activo</Label>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, RUC o email..." value={search}
          onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card className="glass-panel">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>RUC</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plazo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Truck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay proveedores registrados</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered?.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="font-mono text-sm">{p.ruc || '—'}</TableCell>
                    <TableCell>{p.telefono || '—'}</TableCell>
                    <TableCell>{p.email || '—'}</TableCell>
                    <TableCell>{p.plazo_pago_dias} días</TableCell>
                    <TableCell>
                      <Badge className={p.activo ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}>
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

export default ProveedoresPage;
