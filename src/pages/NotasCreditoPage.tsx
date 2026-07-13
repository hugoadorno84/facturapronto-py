import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, FileMinus, MoreHorizontal, Ban, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const formatNum = (n: number, currency = 'PYG') =>
  new Intl.NumberFormat('es-PY', { minimumFractionDigits: currency === 'PYG' ? 0 : 2 }).format(Number(n) || 0);

interface Item {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  iva_tipo: '10' | '5' | 'exento';
}

const emptyItem: Item = { descripcion: '', cantidad: 1, precio_unitario: 0, iva_tipo: '10' };

const emptyForm = {
  numero: '',
  fecha: new Date().toISOString().slice(0, 10),
  cliente_id: '',
  factura_id: '',
  moneda: 'PYG',
  motivo: 'devolucion',
  observacion: '',
};

const motivos: Record<string, string> = {
  devolucion: 'Devolución',
  descuento: 'Descuento',
  correccion: 'Corrección',
  anulacion: 'Anulación parcial',
  otro: 'Otro',
};

const NotasCreditoPage = () => {
  const { user, userRole } = useAuth();
  const empresaId = userRole?.empresa_id;
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<Item[]>([{ ...emptyItem }]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) { setForm(emptyForm); setItems([{ ...emptyItem }]); }
  }, [open]);

  const { data: notas, isLoading } = useQuery({
    queryKey: ['notas-credito', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notas_credito')
        .select('*, clientes(nombre), facturas(numero)')
        .eq('empresa_id', empresaId!)
        .order('fecha', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId,
  });

  const { data: clientes } = useQuery({
    queryKey: ['nc-clientes', empresaId],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, nombre').eq('empresa_id', empresaId!).order('nombre');
      return data || [];
    },
    enabled: !!empresaId,
  });

  const { data: facturasCliente } = useQuery({
    queryKey: ['nc-facturas', empresaId, form.cliente_id, form.moneda],
    queryFn: async () => {
      const { data } = await supabase
        .from('facturas')
        .select('id, numero, total, moneda, estado')
        .eq('empresa_id', empresaId!)
        .eq('cliente_id', form.cliente_id)
        .eq('moneda', form.moneda)
        .in('estado', ['emitida', 'pago_parcial', 'pagada'])
        .order('fecha', { ascending: false });
      return data || [];
    },
    enabled: !!empresaId && !!form.cliente_id,
  });

  const totals = useMemo(() => {
    let sub = 0, iva10 = 0, iva5 = 0;
    items.forEach(it => {
      const line = Number(it.cantidad) * Number(it.precio_unitario);
      sub += line;
      if (it.iva_tipo === '10') iva10 += line - line / 1.1;
      else if (it.iva_tipo === '5') iva5 += line - line / 1.05;
    });
    return { subtotal: sub, iva_10: iva10, iva_5: iva5, total: sub };
  }, [items]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Sin empresa');
      if (!form.cliente_id) throw new Error('Seleccione un cliente');
      const valid = items.filter(i => i.descripcion && Number(i.precio_unitario) > 0);
      if (valid.length === 0) throw new Error('Agregue al menos un ítem');
      const numero = form.numero || `NC-${Date.now().toString().slice(-8)}`;

      const { data: nc, error: e1 } = await supabase.from('notas_credito').insert({
        empresa_id: empresaId,
        cliente_id: form.cliente_id,
        factura_id: form.factura_id || null,
        numero,
        fecha: form.fecha,
        moneda: form.moneda,
        motivo: form.motivo,
        subtotal: totals.subtotal,
        iva_10: totals.iva_10,
        iva_5: totals.iva_5,
        total: totals.total,
        observacion: form.observacion || null,
        created_by: user?.id,
      }).select().single();
      if (e1) throw e1;

      const itemsPayload = valid.map(it => ({
        nota_credito_id: nc.id,
        descripcion: it.descripcion,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario),
        iva_tipo: it.iva_tipo,
        subtotal: Number(it.cantidad) * Number(it.precio_unitario),
      }));
      const { error: e2 } = await supabase.from('nota_credito_items').insert(itemsPayload);
      if (e2) throw e2;

      // If linked to invoice: register a "cobro" so factura estado gets recomputed by trigger
      if (form.factura_id) {
        const { error: e3 } = await supabase.from('pagos').insert({
          empresa_id: empresaId,
          tipo: 'cobro',
          fecha: form.fecha,
          monto: totals.total,
          moneda: form.moneda,
          metodo: 'nota_credito',
          referencia: numero,
          cliente_id: form.cliente_id,
          factura_id: form.factura_id,
          nota_credito_id: nc.id,
          observacion: `Nota de crédito ${numero}`,
          created_by: user?.id,
        });
        if (e3) throw e3;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notas-credito'] });
      qc.invalidateQueries({ queryKey: ['facturas'] });
      qc.invalidateQueries({ queryKey: ['pagos'] });
      setOpen(false);
      toast.success('Nota de crédito emitida');
    },
    onError: (e: any) => toast.error(e?.message || 'Error al emitir'),
  });

  const anularMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('pagos').delete().eq('nota_credito_id', id);
      const { error } = await supabase.from('notas_credito').update({ estado: 'anulada' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notas-credito'] });
      qc.invalidateQueries({ queryKey: ['facturas'] });
      qc.invalidateQueries({ queryKey: ['pagos'] });
      toast.success('Nota de crédito anulada');
    },
    onError: (e: any) => toast.error(e?.message || 'Error al anular'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('pagos').delete().eq('nota_credito_id', id);
      await supabase.from('nota_credito_items').delete().eq('nota_credito_id', id);
      const { error } = await supabase.from('notas_credito').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notas-credito'] });
      qc.invalidateQueries({ queryKey: ['facturas'] });
      toast.success('Nota de crédito eliminada');
    },
    onError: (e: any) => toast.error(e?.message || 'Error al eliminar'),
  });

  const detail = notas?.find((n: any) => n.id === detailId);
  const { data: detailItems } = useQuery({
    queryKey: ['nc-items', detailId],
    queryFn: async () => {
      const { data } = await supabase.from('nota_credito_items').select('*').eq('nota_credito_id', detailId!);
      return data || [];
    },
    enabled: !!detailId,
  });

  const filtered = notas?.filter((n: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (n.numero || '').toLowerCase().includes(s) || (n.clientes?.nombre || '').toLowerCase().includes(s);
  });

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems(items.map((x, j) => j === i ? { ...x, ...patch } : x));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notas de Crédito</h1>
          <p className="text-muted-foreground mt-1">Emisión de notas de crédito a clientes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nueva nota</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Emitir nota de crédito</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>N° Nota</Label>
                  <Input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="Auto" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={form.moneda} onValueChange={(v) => setForm({ ...form, moneda: v, factura_id: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PYG">PYG</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="BRL">BRL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Select value={form.motivo} onValueChange={(v) => setForm({ ...form, motivo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(motivos).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v, factura_id: '' })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                    <SelectContent>
                      {clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Factura afectada (opcional)</Label>
                  <Select value={form.factura_id || 'none'} onValueChange={(v) => setForm({ ...form, factura_id: v === 'none' ? '' : v })} disabled={!form.cliente_id}>
                    <SelectTrigger><SelectValue placeholder="Sin factura asociada" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin factura asociada</SelectItem>
                      {facturasCliente?.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.numero} — {formatNum(Number(f.total), f.moneda)} {f.moneda}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ítems</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setItems([...items, { ...emptyItem }])}>
                    <Plus className="h-3 w-3 mr-1" /> Agregar
                  </Button>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-20 text-right">Cant.</TableHead>
                        <TableHead className="w-32 text-right">P. Unit.</TableHead>
                        <TableHead className="w-24">IVA</TableHead>
                        <TableHead className="w-32 text-right">Subtotal</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Input value={it.descripcion} onChange={e => updateItem(i, { descripcion: e.target.value })} placeholder="Descripción" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step="0.01" value={it.cantidad} className="text-right"
                              onChange={e => updateItem(i, { cantidad: Number(e.target.value) })} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step="0.01" value={it.precio_unitario} className="text-right"
                              onChange={e => updateItem(i, { precio_unitario: Number(e.target.value) })} />
                          </TableCell>
                          <TableCell>
                            <Select value={it.iva_tipo} onValueChange={(v: any) => updateItem(i, { iva_tipo: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10%</SelectItem>
                                <SelectItem value="5">5%</SelectItem>
                                <SelectItem value="exento">Exento</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNum(Number(it.cantidad) * Number(it.precio_unitario), form.moneda)}
                          </TableCell>
                          <TableCell>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
                              onClick={() => setItems(items.filter((_, j) => j !== i))} disabled={items.length === 1}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end gap-6 pt-2 text-sm">
                  <div>IVA 10%: <span className="font-mono">{formatNum(totals.iva_10, form.moneda)}</span></div>
                  <div>IVA 5%: <span className="font-mono">{formatNum(totals.iva_5, form.moneda)}</span></div>
                  <div className="text-lg font-semibold">Total: {formatNum(totals.total, form.moneda)} {form.moneda}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observación</Label>
                <Textarea value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })} rows={2} />
              </div>

              <Button type="submit" className="w-full" disabled={saveMutation.isPending || totals.total <= 0}>
                {saveMutation.isPending ? 'Emitiendo...' : 'Emitir nota de crédito'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar número o cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card className="glass-panel">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>N° Nota</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!empresaId ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Selecciona una empresa</TableCell></TableRow>
              ) : isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <FileMinus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay notas de crédito</p>
                  </TableCell>
                </TableRow>
              ) : filtered?.map((n: any) => (
                <TableRow key={n.id}>
                  <TableCell>{n.fecha}</TableCell>
                  <TableCell className="font-mono">{n.numero}</TableCell>
                  <TableCell className="font-medium">{n.clientes?.nombre || '—'}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{n.facturas?.numero || '—'}</TableCell>
                  <TableCell className="capitalize">{motivos[n.motivo] || n.motivo}</TableCell>
                  <TableCell className="text-right font-mono">{formatNum(Number(n.total), n.moneda)} {n.moneda}</TableCell>
                  <TableCell>
                    {n.estado === 'anulada' ? (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive">Anulada</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-success/10 text-success">Emitida</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailId(n.id)}>
                          <Eye className="h-4 w-4 mr-2" /> Ver detalle
                        </DropdownMenuItem>
                        {n.estado === 'emitida' && (
                          <DropdownMenuItem className="text-destructive" onClick={() => {
                            if (confirm('¿Anular nota de crédito? Se revertirá el efecto en la factura.')) anularMutation.mutate(n.id);
                          }}>
                            <Ban className="h-4 w-4 mr-2" /> Anular
                          </DropdownMenuItem>
                        )}
                        {n.estado === 'anulada' && (
                          <DropdownMenuItem className="text-destructive" onClick={() => {
                            if (confirm('¿Eliminar definitivamente?')) deleteMutation.mutate(n.id);
                          }}>
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nota de crédito {detail?.numero}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Fecha:</span> {detail.fecha}</div>
                <div><span className="text-muted-foreground">Motivo:</span> {motivos[detail.motivo] || detail.motivo}</div>
                <div><span className="text-muted-foreground">Cliente:</span> {(detail as any).clientes?.nombre}</div>
                <div><span className="text-muted-foreground">Factura:</span> {(detail as any).facturas?.numero || '—'}</div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">P.Unit.</TableHead>
                    <TableHead>IVA</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailItems?.map((it: any) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.descripcion}</TableCell>
                      <TableCell className="text-right">{it.cantidad}</TableCell>
                      <TableCell className="text-right font-mono">{formatNum(Number(it.precio_unitario), detail.moneda)}</TableCell>
                      <TableCell>{it.iva_tipo === 'exento' ? 'Exento' : `${it.iva_tipo}%`}</TableCell>
                      <TableCell className="text-right font-mono">{formatNum(Number(it.subtotal), detail.moneda)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end text-lg font-semibold">
                Total: {formatNum(Number(detail.total), detail.moneda)} {detail.moneda}
              </div>
              {detail.observacion && (
                <div className="text-sm"><span className="text-muted-foreground">Observación:</span> {detail.observacion}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotasCreditoPage;
