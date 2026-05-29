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
  Plus, Search, MoreHorizontal, Pencil, PlayCircle, CheckCircle, XCircle, FileText, Link as LinkIcon,
} from 'lucide-react';

const statusLabels: Record<string, string> = {
  abierta: 'Abierta', en_progreso: 'En progreso', completada: 'Completada', cancelada: 'Cancelada',
};
const statusColors: Record<string, string> = {
  abierta: 'bg-primary/10 text-primary',
  en_progreso: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  completada: 'bg-green-500/10 text-green-600 dark:text-green-400',
  cancelada: 'bg-destructive/10 text-destructive',
};
const currencies = ['PYG', 'USD', 'BRL', 'EUR'];

export default function ServiciosPage() {
  const qc = useQueryClient();
  const { userRole, user } = useAuth();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    titulo: '', proyecto_id: '', fecha_programada: '', notas: '',
    monto: '', moneda: 'PYG', fx_rate: '1',
  });
  const [saving, setSaving] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkingWo, setLinkingWo] = useState<any>(null);
  const [selectedFacturaId, setSelectedFacturaId] = useState('');

  const { data: proyectos = [] } = useQuery({
    queryKey: ['proyectos_for_wo'],
    queryFn: async () => {
      const { data } = await supabase.from('proyectos' as any).select('id, nombre, cliente_id')
        .neq('estado', 'cerrado').order('nombre');
      return (data as any[]) || [];
    },
  });

  const { data: facturas = [] } = useQuery({
    queryKey: ['facturas_for_link'],
    queryFn: async () => {
      const { data } = await supabase.from('facturas')
        .select('id, numero, clientes(nombre)').order('fecha', { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: ordenes = [], isLoading } = useQuery({
    queryKey: ['ordenes_servicio', search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordenes_servicio' as any)
        .select('*, proyectos(nombre), facturas(numero)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data as any[]) || [];
      if (search) {
        const s = search.toLowerCase();
        return list.filter((wo) =>
          wo.titulo.toLowerCase().includes(s) ||
          (wo.proyectos?.nombre || '').toLowerCase().includes(s)
        );
      }
      return list;
    },
  });

  const formatNum = (n: number) =>
    new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));

  const openNew = () => {
    setEditing(null);
    setForm({
      titulo: '', proyecto_id: proyectos[0]?.id || '', fecha_programada: '', notas: '',
      monto: '', moneda: 'PYG', fx_rate: '1',
    });
    setFormOpen(true);
  };

  const openEdit = (wo: any) => {
    setEditing(wo);
    setForm({
      titulo: wo.titulo, proyecto_id: wo.proyecto_id,
      fecha_programada: wo.fecha_programada || '', notas: wo.notas || '',
      monto: wo.monto > 0 ? String(wo.monto) : '',
      moneda: wo.moneda || 'PYG', fx_rate: String(wo.fx_rate || 1),
    });
    setFormOpen(true);
  };

  const createCalendarEvent = async (titulo: string, fecha: string) => {
    if (!userRole?.empresa_id) return;
    await supabase.from('eventos_calendario' as any).insert({
      empresa_id: userRole.empresa_id,
      titulo: `Servicio: ${titulo}`,
      fecha, tipo: 'servicio',
      created_by: user?.id,
    });
  };

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.proyecto_id) {
      toast.error('Título y proyecto son requeridos'); return;
    }
    const empresa_id = userRole?.empresa_id;
    if (!empresa_id) { toast.error('No se identificó la empresa'); return; }
    setSaving(true);
    const monto = parseFloat(form.monto) || 0;
    const fx_rate = parseFloat(form.fx_rate) || 1;
    const monto_pyg = form.moneda === 'PYG' ? monto : Math.round(monto * fx_rate);
    const payload: any = {
      empresa_id, titulo: form.titulo, proyecto_id: form.proyecto_id,
      fecha_programada: form.fecha_programada || null,
      notas: form.notas || null, monto, moneda: form.moneda, fx_rate, monto_pyg,
    };
    try {
      if (editing) {
        const { error } = await supabase.from('ordenes_servicio' as any).update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Orden actualizada');
      } else {
        const { error } = await supabase.from('ordenes_servicio' as any).insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast.success('Orden creada');
        if (payload.fecha_programada) {
          await createCalendarEvent(form.titulo, payload.fecha_programada);
        }
      }
      qc.invalidateQueries({ queryKey: ['ordenes_servicio'] });
      qc.invalidateQueries({ queryKey: ['eventos_calendario'] });
      setFormOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: string, estado: string) => {
    const { error } = await supabase.from('ordenes_servicio' as any).update({ estado }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(`Orden ${statusLabels[estado]?.toLowerCase()}`); qc.invalidateQueries({ queryKey: ['ordenes_servicio'] }); }
  };

  const openLink = (wo: any) => {
    setLinkingWo(wo); setSelectedFacturaId(wo.factura_id || ''); setLinkOpen(true);
  };

  const handleLink = async () => {
    if (!linkingWo) return;
    const { error } = await supabase.from('ordenes_servicio' as any)
      .update({ factura_id: selectedFacturaId || null }).eq('id', linkingWo.id);
    if (error) toast.error(error.message);
    else {
      toast.success(selectedFacturaId ? 'Factura vinculada' : 'Factura desvinculada');
      qc.invalidateQueries({ queryKey: ['ordenes_servicio'] });
      setLinkOpen(false);
    }
  };

  const generateInvoice = async (wo: any) => {
    const proyecto = proyectos.find((p: any) => p.id === wo.proyecto_id);
    if (!proyecto?.cliente_id) {
      toast.error('El proyecto no tiene cliente asignado'); return;
    }
    const empresa_id = userRole?.empresa_id;
    if (!empresa_id) return;
    const numero = `OS-${Date.now().toString().slice(-7)}`;
    const { data: fac, error } = await supabase.from('facturas').insert({
      empresa_id, cliente_id: proyecto.cliente_id, numero,
      fecha: new Date().toISOString().slice(0, 10),
      moneda: wo.moneda, fx_rate: wo.fx_rate,
      subtotal: wo.monto, total_iva: 0, total: wo.monto,
      estado: 'borrador',
      observacion: `Generada desde orden: ${wo.titulo}`,
      created_by: user?.id,
    }).select('id').single();
    if (error) { toast.error(error.message); return; }
    await supabase.from('ordenes_servicio' as any).update({ factura_id: fac.id }).eq('id', wo.id);
    await supabase.from('factura_items').insert({
      factura_id: fac.id, descripcion: wo.titulo,
      cantidad: 1, precio_unitario: wo.monto, iva: 'exento', subtotal: wo.monto,
    });
    toast.success('Factura generada y vinculada');
    qc.invalidateQueries({ queryKey: ['ordenes_servicio'] });
    qc.invalidateQueries({ queryKey: ['facturas'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Órdenes de servicio</h1>
          <p className="text-muted-foreground mt-1">Gestión de órdenes de trabajo</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nueva orden</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar orden o proyecto..." className="pl-10" />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : ordenes.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">No hay órdenes registradas.</div>
      ) : (
        <div className="rounded-lg border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Fecha prog.</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenes.map((wo: any) => (
                <TableRow key={wo.id}>
                  <TableCell className="font-medium">{wo.titulo}</TableCell>
                  <TableCell>{wo.proyectos?.nombre || '—'}</TableCell>
                  <TableCell>{wo.fecha_programada || '—'}</TableCell>
                  <TableCell className="text-right font-mono">
                    {wo.monto > 0 ? `${formatNum(wo.monto)} ${wo.moneda}` : '—'}
                  </TableCell>
                  <TableCell>
                    {wo.facturas ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary">{wo.facturas.numero}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[wo.estado] || ''}>{statusLabels[wo.estado] || wo.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(wo)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openLink(wo)}><LinkIcon className="mr-2 h-4 w-4" /> Vincular factura</DropdownMenuItem>
                        {!wo.factura_id && wo.monto > 0 && (
                          <DropdownMenuItem onClick={() => generateInvoice(wo)}><FileText className="mr-2 h-4 w-4" /> Generar factura</DropdownMenuItem>
                        )}
                        {wo.estado === 'abierta' && (
                          <DropdownMenuItem onClick={() => changeStatus(wo.id, 'en_progreso')}><PlayCircle className="mr-2 h-4 w-4" /> Iniciar</DropdownMenuItem>
                        )}
                        {(wo.estado === 'abierta' || wo.estado === 'en_progreso') && (
                          <DropdownMenuItem onClick={() => changeStatus(wo.id, 'completada')}><CheckCircle className="mr-2 h-4 w-4" /> Completar</DropdownMenuItem>
                        )}
                        {wo.estado !== 'cancelada' && wo.estado !== 'completada' && (
                          <DropdownMenuItem onClick={() => changeStatus(wo.id, 'cancelada')}><XCircle className="mr-2 h-4 w-4" /> Cancelar</DropdownMenuItem>
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
            <DialogTitle>{editing ? 'Editar orden' : 'Nueva orden de servicio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div>
              <Label>Proyecto</Label>
              <Select value={form.proyecto_id} onValueChange={(v) => setForm({ ...form, proyecto_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{proyectos.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha programada</Label>
              <Input type="date" value={form.fecha_programada} onChange={(e) => setForm({ ...form, fecha_programada: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Moneda</Label>
                <Select value={form.moneda} onValueChange={(v) => setForm({ ...form, moneda: v, fx_rate: v === 'PYG' ? '1' : form.fx_rate })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monto</Label>
                <Input type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
              </div>
              {form.moneda !== 'PYG' && (
                <div>
                  <Label>T/C (PYG)</Label>
                  <Input type="number" value={form.fx_rate} onChange={(e) => setForm({ ...form, fx_rate: e.target.value })} />
                </div>
              )}
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea rows={3} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular factura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Vincular orden "{linkingWo?.titulo}" a una factura</p>
            <Select value={selectedFacturaId || '__none__'} onValueChange={(v) => setSelectedFacturaId(v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Sin factura" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin factura</SelectItem>
                {facturas.map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>{f.numero} — {f.clientes?.nombre || ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancelar</Button>
            <Button onClick={handleLink}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
