import { useState, useEffect } from 'react';
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
import { Plus, Search, Clock, Receipt } from 'lucide-react';
import { toast } from 'sonner';

type PagoTipo = 'cobro' | 'pago';

const emptyForm = {
  tipo: 'cobro' as PagoTipo,
  fecha: new Date().toISOString().slice(0, 10),
  monto: 0,
  moneda: 'PYG',
  metodo: 'efectivo',
  referencia: '',
  cliente_id: '',
  proveedor_id: '',
  factura_id: '',
  observacion: '',
};

const formatNum = (n: number, currency = 'PYG') =>
  new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: currency === 'PYG' ? 0 : 2,
  }).format(Number(n) || 0);

const PagosPage = () => {
  const { userRole } = useAuth();
  const empresaId = userRole?.empresa_id;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [typeFilter, setTypeFilter] = useState<'all' | PagoTipo>('all');
  const [search, setSearch] = useState('');

  useEffect(() => { if (!open) setForm(emptyForm); }, [open]);

  const today = new Date().toISOString().slice(0, 10);

  const { data: pagos, isLoading } = useQuery({
    queryKey: ['pagos', empresaId, typeFilter],
    queryFn: async () => {
      if (!empresaId) return [];
      let q = supabase
        .from('pagos')
        .select('*, clientes(nombre, sucursal), proveedores(nombre), facturas(numero)')
        .eq('empresa_id', empresaId)
        .order('fecha', { ascending: false });
      if (typeFilter !== 'all') q = q.eq('tipo', typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const { data: clientes } = useQuery({
    queryKey: ['pagos-clientes', empresaId],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, nombre').eq('empresa_id', empresaId!).order('nombre');
      return data || [];
    },
    enabled: !!empresaId,
  });

  const { data: proveedores } = useQuery({
    queryKey: ['pagos-proveedores', empresaId],
    queryFn: async () => {
      const { data } = await supabase.from('proveedores').select('id, nombre').eq('empresa_id', empresaId!).order('nombre');
      return data || [];
    },
    enabled: !!empresaId,
  });

  const { data: facturasCliente } = useQuery({
    queryKey: ['pagos-facturas-cliente', empresaId, form.cliente_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('facturas')
        .select('id, numero, fecha, total, moneda, estado')
        .eq('empresa_id', empresaId!)
        .eq('cliente_id', form.cliente_id)
        .in('estado', ['emitida', 'pago_parcial'])
        .order('fecha', { ascending: false });
      return data || [];
    },
    enabled: !!empresaId && form.tipo === 'cobro' && !!form.cliente_id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Sin empresa');
      const payload: any = {
        empresa_id: empresaId,
        tipo: form.tipo,
        fecha: form.fecha,
        monto: Number(form.monto) || 0,
        moneda: form.moneda,
        metodo: form.metodo || null,
        referencia: form.referencia || null,
        cliente_id: form.tipo === 'cobro' && form.cliente_id ? form.cliente_id : null,
        proveedor_id: form.tipo === 'pago' && form.proveedor_id ? form.proveedor_id : null,
        factura_id: form.factura_id || null,
        observacion: form.observacion || null,
      };
      const { error } = await supabase.from('pagos').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos'] });
      setOpen(false);
      toast.success('Registro creado');
    },
    onError: (e: any) => toast.error(e?.message || 'Error al guardar'),
  });

  const filtered = pagos?.filter((p: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.clientes?.nombre || '').toLowerCase().includes(s) ||
      (p.proveedores?.nombre || '').toLowerCase().includes(s) ||
      (p.referencia || '').toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cobros / Pagos</h1>
          <p className="text-muted-foreground mt-1">Registro de movimientos de caja</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nuevo registro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nuevo movimiento</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v: PagoTipo) => setForm({ ...form, tipo: v, cliente_id: '', proveedor_id: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cobro">Cobro</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
                </div>
              </div>

              {form.tipo === 'cobro' ? (
                <>
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v, factura_id: '' })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                      <SelectContent>
                        {clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.cliente_id && (
                    <div className="space-y-2">
                      <Label>Factura (opcional)</Label>
                      <Select value={form.factura_id || 'none'} onValueChange={(v) => setForm({ ...form, factura_id: v === 'none' ? '' : v })}>
                        <SelectTrigger><SelectValue placeholder="Sin factura asociada" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin factura asociada</SelectItem>
                          {facturasCliente?.length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">No hay facturas pendientes</div>
                          )}
                          {facturasCliente?.map((f: any) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.numero} — {f.fecha} — {formatNum(f.total, f.moneda)} {f.moneda}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Select value={form.proveedor_id} onValueChange={(v) => setForm({ ...form, proveedor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                    <SelectContent>
                      {proveedores?.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input type="number" min={0} step="0.01" value={form.monto}
                    onChange={e => setForm({ ...form, monto: Number(e.target.value) })} required />
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
                <Label>Referencia</Label>
                <Input value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })}
                  placeholder="N° de comprobante, transferencia, etc." />
              </div>
              <div className="space-y-2">
                <Label>Observación</Label>
                <Textarea value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })} rows={2} />
              </div>

              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Guardando...' : 'Registrar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente, proveedor o referencia..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="cobro">Cobros</SelectItem>
            <SelectItem value="pago">Pagos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass-panel">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente / Proveedor</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Referencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay movimientos registrados</p>
                  </TableCell>
                </TableRow>
              ) : filtered?.map((p: any) => {
                const future = p.fecha > today;
                return (
                  <TableRow key={p.id}>
                    <TableCell>{p.fecha}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={p.tipo === 'cobro'
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20'}>
                        {p.tipo === 'cobro' ? 'Cobro' : 'Pago'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.tipo === 'cobro'
                        ? (p.clientes?.nombre || '—')
                        : (p.proveedores?.nombre || '—')}
                    </TableCell>
                    <TableCell className="capitalize">{p.metodo || '—'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNum(p.monto, p.moneda)} {p.moneda}
                    </TableCell>
                    <TableCell>
                      {future ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 gap-1">
                          <Clock className="h-3 w-3" /> Pendiente
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-success/10 text-success">Realizado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.referencia || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PagosPage;
