import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus, Search, MoreHorizontal, Pencil, PauseCircle, CheckCircle, PlayCircle,
} from 'lucide-react';

const statusLabels: Record<string, string> = { abierto: 'Abierto', en_pausa: 'En pausa', cerrado: 'Cerrado' };
const statusColors: Record<string, string> = {
  abierto: 'bg-green-500/10 text-green-600 dark:text-green-400',
  en_pausa: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  cerrado: 'bg-muted text-muted-foreground',
};

export default function ProyectosPage() {
  const qc = useQueryClient();
  const { userRole } = useAuth();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    nombre: '', cliente_id: '', descripcion: '', fecha_inicio: '', fecha_fin: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-activos'],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, nombre').eq('activo', true).order('nombre');
      return data || [];
    },
  });

  const { data: proyectos = [], isLoading } = useQuery({
    queryKey: ['proyectos', search],
    queryFn: async () => {
      let q = supabase.from('proyectos' as any)
        .select('*, clientes(nombre)').order('created_at', { ascending: false });
      if (search) q = q.ilike('nombre', `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ nombre: '', cliente_id: '', descripcion: '', fecha_inicio: '', fecha_fin: '' });
    setFormOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      nombre: p.nombre, cliente_id: p.cliente_id || '', descripcion: p.descripcion || '',
      fecha_inicio: p.fecha_inicio || '', fecha_fin: p.fecha_fin || '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    const empresa_id = userRole?.empresa_id;
    if (!empresa_id) { toast.error('No se identificó la empresa'); return; }
    setSaving(true);
    const payload: any = {
      empresa_id, nombre: form.nombre,
      cliente_id: form.cliente_id || null,
      descripcion: form.descripcion || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
    };
    if (editing) {
      const { error } = await supabase.from('proyectos' as any).update(payload).eq('id', editing.id);
      if (error) toast.error(error.message);
      else { toast.success('Proyecto actualizado'); qc.invalidateQueries({ queryKey: ['proyectos'] }); setFormOpen(false); }
    } else {
      const { error } = await supabase.from('proyectos' as any).insert(payload);
      if (error) toast.error(error.message);
      else { toast.success('Proyecto creado'); qc.invalidateQueries({ queryKey: ['proyectos'] }); setFormOpen(false); }
    }
    setSaving(false);
  };

  const changeStatus = async (id: string, estado: string) => {
    const { error } = await supabase.from('proyectos' as any).update({ estado }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(`Proyecto ${statusLabels[estado]?.toLowerCase()}`); qc.invalidateQueries({ queryKey: ['proyectos'] }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proyectos</h1>
          <p className="text-muted-foreground mt-1">Gestión de proyectos</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuevo proyecto</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar proyecto..." className="pl-10" />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : proyectos.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">No hay proyectos registrados.</div>
      ) : (
        <div className="rounded-lg border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyectos.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>{p.clientes?.nombre || '—'}</TableCell>
                  <TableCell>{p.fecha_inicio || '—'}</TableCell>
                  <TableCell>{p.fecha_fin || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[p.estado] || ''}>{statusLabels[p.estado] || p.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                        {p.estado === 'abierto' && (
                          <DropdownMenuItem onClick={() => changeStatus(p.id, 'en_pausa')}><PauseCircle className="mr-2 h-4 w-4" /> Pausar</DropdownMenuItem>
                        )}
                        {p.estado === 'en_pausa' && (
                          <DropdownMenuItem onClick={() => changeStatus(p.id, 'abierto')}><PlayCircle className="mr-2 h-4 w-4" /> Reanudar</DropdownMenuItem>
                        )}
                        {p.estado !== 'cerrado' && (
                          <DropdownMenuItem onClick={() => changeStatus(p.id, 'cerrado')}><CheckCircle className="mr-2 h-4 w-4" /> Cerrar</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del proyecto" />
            </div>
            <div>
              <Label>Cliente (opcional)</Label>
              <Select value={form.cliente_id || '__none__'} onValueChange={(v) => setForm({ ...form, cliente_id: v === '__none__' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Sin cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin cliente</SelectItem>
                  {clientes.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Inicio</Label><Input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
              <div><Label>Fin</Label><Input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
