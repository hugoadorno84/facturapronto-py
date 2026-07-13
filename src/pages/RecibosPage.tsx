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
import { Plus, Search, Receipt, MoreHorizontal, Ban, Eye } from 'lucide-react';
import { toast } from 'sonner';

const formatNum = (n: number, currency = 'PYG') =>
  new Intl.NumberFormat('es-PY', { minimumFractionDigits: currency === 'PYG' ? 0 : 2 }).format(Number(n) || 0);

interface Alloc { factura_id: string; numero: string; saldo: number; total: number; monto: number; }

const emptyForm = {
  fecha: new Date().toISOString().slice(0, 10),
  cliente_id: '',
  moneda: 'PYG',
  metodo: 'efectivo',
  referencia: '',
  observacion: '',
  numero: '',
};

const RecibosPage = () => {
  const { user, userRole } = useAuth();
  const empresaId = userRole?.empresa_id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [allocs, setAllocs] = useState<Alloc[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) { setForm(emptyForm); setAllocs([]); }
  }, [open]);

  const { data: recibos, isLoading } = useQuery({
    queryKey: ['recibos', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recibos')
        .select('*, clientes(nombre)')
        .eq('empresa_id', empresaId!)
        .order('fecha', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const { data: clientes } = useQuery({
    queryKey: ['recibos-clientes', empresaId],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, nombre').eq('empresa_id', empresaId!).order('nombre');
      return data || [];
    },
    enabled: !!empresaId,
  });

  // Facturas pendientes del cliente + saldos
  const { data: facturasCliente } = useQuery({
    queryKey: ['recibos-facturas', empresaId, form.cliente_id, form.moneda],
    queryFn: async () => {
      const { data: fs } = await supabase
        .from('facturas')
        .select('id, numero, fecha, total, moneda, estado')
        .eq('empresa_id', empresaId!)
        .eq('cliente_id', form.cliente_id)
        .eq('moneda', form.moneda)
        .in('estado', ['emitida', 'pago_parcial'])
        .order('fecha');
      const ids = (fs || []).map(f => f.id);
      let pagos: any[] = [];
      if (ids.length) {
        const { data: ps } = await supabase.from('pagos').select('factura_id, monto').in('factura_id', ids).eq('tipo', 'cobro');
        pagos = ps || [];
      }
      return (fs || []).map(f => {
        const pagado = pagos.filter(p => p.factura_id === f.id).reduce((s, p) => s + Number(p.monto), 0);
        return { ...f, saldo: Number(f.total) - pagado };
      }).filter(f => f.saldo > 0);
    },
    enabled: !!empresaId && !!form.cliente_id,
  });

  const totalRecibo = useMemo(() => allocs.reduce((s, a) => s + (Number(a.monto) || 0), 0), [allocs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Sin empresa');
      if (!form.cliente_id) throw new Error('Seleccione un cliente');
      const items = allocs.filter(a => Number(a.monto) > 0);
      if (items.length === 0) throw new Error('Asigne monto a al menos una factura');
      for (const a of items) {
        if (Number(a.monto) > a.saldo + 0.001) throw new Error(`Monto excede saldo de factura ${a.numero}`);
      }
      const total = items.reduce((s, a) => s + Number(a.monto), 0);
      const numero = form.numero || `REC-${Date.now().toString().slice(-8)}`;

      const { data: recibo, error: e1 } = await supabase.from('recibos').insert({
        empresa_id: empresaId,
        cliente_id: form.cliente_id,
        numero,
        fecha: form.fecha,
        moneda: form.moneda,
        total,
        metodo: form.metodo,
        referencia: form.referencia || null,
        observacion: form.observacion || null,
        created_by: user?.id,
      }).select().single();
      if (e1) throw e1;

      const itemsPayload = items.map(a => ({ recibo_id: recibo.id, factura_id: a.factura_id, monto: Number(a.monto) }));
      const { error: e2 } = await supabase.from('recibo_items').insert(itemsPayload);
      if (e2) throw e2;

      const pagosPayload = items.map(a => ({
        empresa_id: empresaId,
        tipo: 'cobro' as const,
        fecha: form.fecha,
        monto: Number(a.monto),
        moneda: form.moneda,
        metodo: form.metodo,
        referencia: form.referencia || numero,
        cliente_id: form.cliente_id,
        factura_id: a.factura_id,
        recibo_id: recibo.id,
        observacion: `Recibo ${numero}`,
        created_by: user?.id,
      }));
      const { error: e3 } = await supabase.from('pagos').insert(pagosPayload);
      if (e3) throw e3;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recibos'] });
      qc.invalidateQueries({ queryKey: ['pagos'] });
      qc.invalidateQueries({ queryKey: ['facturas'] });
      setOpen(false);
      toast.success('Recibo emitido');
    },
    onError: (e: any) => toast.error(e?.message || 'Error al emitir'),
  });

  const anularMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: e1 } = await supabase.from('pagos').delete().eq('recibo_id', id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('recibos').update({ estado: 'anulado' }).eq('id', id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recibos'] });
      qc.invalidateQueries({ queryKey: ['pagos'] });
      qc.invalidateQueries({ queryKey: ['facturas'] });
      toast.success('Recibo anulado');
    },
    onError: (e: any) => toast.error(e?.message || 'Error al anular'),
  });

  // Auto seed allocs when facturas load
  useEffect(() => {
    if (facturasCliente) {
      setAllocs(facturasCliente.map((f: any) => ({
        factura_id: f.id, numero: f.numero, saldo: f.saldo, total: Number(f.total), monto: 0,
      })));
    }
  }, [facturasCliente]);

  const filtered = recibos?.filter((r: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (r.numero || '').toLowerCase().includes(s) || (r.clientes?.nombre || '').toLowerCase().includes(s);
  });

  const detail = recibos?.find((r: any) => r.id === detailId);
  const { data: detailItems } = useQuery({
    queryKey: ['recibo-items', detailId],
    queryFn: async () => {
      const { data } = await supabase.from('recibo_items').select('*, facturas(numero, fecha, total)').eq('recibo_id', detailId!);
      return data || [];
    },
    enabled: !!detailId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recibos de Dinero</h1>
          <p className="text-muted-foreground mt-1">Emisión de recibos de cobro a clientes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nuevo recibo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Emitir recibo de dinero</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>N° Recibo</Label>
                  <Input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="Auto" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={form.moneda} onValueChange={(v) => setForm({ ...form, moneda: v })}>
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
                  <Label>Método</Label>
                  <Select value={form.metodo} onValueChange={(v) => setForm({ ...form, metodo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {form.cliente_id && (
                <div className="space-y-2">
                  <Label>Facturas pendientes ({form.moneda})</Label>
                  {allocs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                      No hay facturas pendientes en {form.moneda} para este cliente
                    </p>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Factura</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                            <TableHead className="text-right w-40">Aplicar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allocs.map((a, i) => (
                            <TableRow key={a.factura_id}>
                              <TableCell className="font-mono text-sm">{a.numero}</TableCell>
                              <TableCell className="text-right font-mono">{formatNum(a.total, form.moneda)}</TableCell>
                              <TableCell className="text-right font-mono">{formatNum(a.saldo, form.moneda)}</TableCell>
                              <TableCell>
                                <Input type="number" min={0} max={a.saldo} step="0.01" value={a.monto}
                                  onChange={e => {
                                    const v = Number(e.target.value);
                                    setAllocs(allocs.map((x, j) => j === i ? { ...x, monto: v } : x));
                                  }}
                                  className="text-right" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <div className="flex justify-end pt-2 text-lg font-semibold">
                    Total: {formatNum(totalRecibo, form.moneda)} {form.moneda}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Referencia</Label>
                  <Input value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })} placeholder="N° transferencia, cheque..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observación</Label>
                <Textarea value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })} rows={2} />
              </div>

              <Button type="submit" className="w-full" disabled={saveMutation.isPending || totalRecibo <= 0}>
                {saveMutation.isPending ? 'Emitiendo...' : 'Emitir recibo'}
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
                <TableHead>N° Recibo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!empresaId ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Selecciona una empresa</TableCell></TableRow>
              ) : isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay recibos emitidos</p>
                  </TableCell>
                </TableRow>
              ) : filtered?.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.fecha}</TableCell>
                  <TableCell className="font-mono">{r.numero}</TableCell>
                  <TableCell className="font-medium">{r.clientes?.nombre || '—'}</TableCell>
                  <TableCell className="capitalize">{r.metodo || '—'}</TableCell>
                  <TableCell className="text-right font-mono">{formatNum(r.total, r.moneda)} {r.moneda}</TableCell>
                  <TableCell>
                    {r.estado === 'anulado' ? (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive">Anulado</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-success/10 text-success">Emitido</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailId(r.id)}>
                          <Eye className="h-4 w-4 mr-2" /> Ver detalle
                        </DropdownMenuItem>
                        {r.estado === 'emitido' && (
                          <DropdownMenuItem className="text-destructive" onClick={() => {
                            if (confirm('¿Anular recibo? Se eliminarán los cobros vinculados.')) anularMutation.mutate(r.id);
                          }}>
                            <Ban className="h-4 w-4 mr-2" /> Anular
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
          <DialogHeader><DialogTitle>Recibo {detail?.numero}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Fecha:</span> {detail.fecha}</div>
                <div><span className="text-muted-foreground">Cliente:</span> {detail.clientes?.nombre}</div>
                <div><span className="text-muted-foreground">Método:</span> <span className="capitalize">{detail.metodo}</span></div>
                <div><span className="text-muted-foreground">Referencia:</span> {detail.referencia || '—'}</div>
              </div>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Factura</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Monto aplicado</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailItems?.map((it: any) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-mono">{it.facturas?.numero || '—'}</TableCell>
                        <TableCell>{it.facturas?.fecha || '—'}</TableCell>
                        <TableCell className="text-right font-mono">{formatNum(it.monto, detail.moneda)} {detail.moneda}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end text-lg font-semibold">
                Total: {formatNum(detail.total, detail.moneda)} {detail.moneda}
              </div>
              {detail.observacion && <p className="text-sm text-muted-foreground border-t pt-3">{detail.observacion}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecibosPage;
