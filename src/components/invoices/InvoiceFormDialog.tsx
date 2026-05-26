import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type IvaType = Database['public']['Enums']['iva_type'];

interface FacturaItem {
  producto_id?: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  iva: IvaType;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  factura?: any;
}

export function InvoiceFormDialog({ open, onOpenChange, factura }: Props) {
  const qc = useQueryClient();
  const { userRole, user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [clienteId, setClienteId] = useState('');
  const [serieId, setSerieId] = useState('');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [condicion, setCondicion] = useState('contado');
  const [moneda, setMoneda] = useState('PYG');
  const [fxRate, setFxRate] = useState(1);
  const [observacion, setObservacion] = useState('');
  const [items, setItems] = useState<FacturaItem[]>([
    { descripcion: '', cantidad: 1, precio_unitario: 0, iva: '10' },
  ]);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-activos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clientes').select('id, nombre, ruc, sucursal').eq('activo', true).order('nombre');
      return data || [];
    },
  });

  const { data: series = [] } = useQuery({
    queryKey: ['factura_series_activas', userRole?.empresa_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('factura_series' as any).select('*').eq('activo', true).order('codigo');
      return (data as any[]) || [];
    },
    enabled: !!userRole?.empresa_id,
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['productos-activos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('productos').select('*').eq('activo', true).order('descripcion');
      return data || [];
    },
  });

  useEffect(() => {
    if (factura && open) {
      setClienteId(factura.cliente_id);
      setNumero(factura.numero || '');
      setFecha(factura.fecha);
      setCondicion(factura.condicion || 'contado');
      setMoneda(factura.moneda || 'PYG');
      setFxRate(Number(factura.fx_rate) || 1);
      setObservacion(factura.observacion || '');
      supabase.from('factura_items').select('*').eq('factura_id', factura.id).then(({ data }) => {
        if (data?.length) {
          setItems(data.map((d: any) => ({
            producto_id: d.producto_id,
            descripcion: d.descripcion,
            cantidad: Number(d.cantidad),
            precio_unitario: Number(d.precio_unitario),
            iva: d.iva,
          })));
        }
      });
    } else if (!factura && open) {
      setClienteId('');
      setNumero('');
      setFecha(new Date().toISOString().slice(0, 10));
      setCondicion('contado');
      setMoneda('PYG');
      setFxRate(1);
      setObservacion('');
      setItems([{ descripcion: '', cantidad: 1, precio_unitario: 0, iva: '10' }]);
    }
  }, [factura, open]);

  const addItem = () => setItems([...items, { descripcion: '', cantidad: 1, precio_unitario: 0, iva: '10' }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof FacturaItem, value: any) => {
    const next = [...items];
    (next[i] as any)[field] = value;
    setItems(next);
  };
  const selectProducto = (i: number, productoId: string) => {
    const p = productos.find((x: any) => x.id === productoId);
    if (!p) return;
    const next = [...items];
    next[i] = {
      producto_id: p.id,
      descripcion: p.descripcion,
      cantidad: next[i].cantidad || 1,
      precio_unitario: Number(p.precio),
      iva: p.iva,
    };
    setItems(next);
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let iva = 0;
    items.forEach((it) => {
      const line = (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0);
      subtotal += line;
      if (it.iva === '10') iva += line / 11;
      else if (it.iva === '5') iva += line / 21;
    });
    return { subtotal, iva, total: subtotal };
  }, [items]);

  const formatNum = (n: number) =>
    new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(Math.round(n));

  const handleSave = async () => {
    if (!clienteId || items.length === 0) {
      toast.error('Selecciona cliente y al menos un ítem');
      return;
    }
    if (items.some((it) => !it.descripcion.trim())) {
      toast.error('Todos los ítems deben tener descripción');
      return;
    }
    const empresa_id = userRole?.empresa_id;
    if (!empresa_id) {
      toast.error('No se identificó la empresa');
      return;
    }

    setSaving(true);
    try {
      let nextNum = numero;
      if (!factura && !nextNum) {
        const { data: last } = await supabase
          .from('facturas').select('numero').eq('empresa_id', empresa_id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        nextNum = last ? String(parseInt(last.numero) + 1).padStart(7, '0') : '0000001';
      }

      const payload = {
        empresa_id,
        cliente_id: clienteId,
        numero: nextNum,
        fecha,
        condicion,
        moneda,
        fx_rate: fxRate,
        observacion: observacion || null,
        subtotal: Math.round(totals.subtotal),
        total_iva: Math.round(totals.iva),
        total: Math.round(totals.total),
      };

      let facturaId: string;
      if (factura) {
        const { error } = await supabase.from('facturas').update(payload).eq('id', factura.id);
        if (error) throw error;
        facturaId = factura.id;
        await supabase.from('factura_items').delete().eq('factura_id', facturaId);
      } else {
        const { data, error } = await supabase
          .from('facturas')
          .insert({ ...payload, estado: 'borrador', created_by: user?.id })
          .select('id').single();
        if (error) throw error;
        facturaId = data.id;
      }

      const itemsData = items.map((it) => ({
        factura_id: facturaId,
        producto_id: it.producto_id || null,
        descripcion: it.descripcion,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario),
        iva: it.iva,
        subtotal: Math.round(Number(it.cantidad) * Number(it.precio_unitario)),
      }));
      const { error: itemsErr } = await supabase.from('factura_items').insert(itemsData);
      if (itemsErr) throw itemsErr;

      toast.success(factura ? 'Factura actualizada' : 'Factura creada');
      qc.invalidateQueries({ queryKey: ['facturas'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{factura ? 'Editar factura' : 'Nueva factura'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {clientes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}{c.sucursal ? ` - ${c.sucursal}` : ''} ({c.ruc})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fecha emisión</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nro. factura</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Auto" />
          </div>
          <div className="space-y-2">
            <Label>Condición</Label>
            <Select value={condicion} onValueChange={setCondicion}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contado">Contado</SelectItem>
                <SelectItem value="credito">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Moneda</Label>
            <Select value={moneda} onValueChange={setMoneda}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PYG">PYG</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="BRL">BRL</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {moneda !== 'PYG' && (
            <div className="space-y-2">
              <Label>Tipo de cambio</Label>
              <Input type="number" min={0} step="0.01" value={fxRate}
                onChange={(e) => setFxRate(Number(e.target.value))} />
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-semibold">Ítems</Label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1 h-4 w-4" /> Agregar ítem
            </Button>
          </div>
          <div className="rounded-lg border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Descripción</TableHead>
                  <TableHead className="w-44">Producto</TableHead>
                  <TableHead className="w-20">Cant.</TableHead>
                  <TableHead className="w-32">Precio unit.</TableHead>
                  <TableHead className="w-24">IVA</TableHead>
                  <TableHead className="w-32 text-right">Subtotal</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input value={it.descripcion}
                        onChange={(e) => updateItem(i, 'descripcion', e.target.value)}
                        placeholder="Descripción" />
                    </TableCell>
                    <TableCell>
                      <Select value={it.producto_id || ''} onValueChange={(v) => selectProducto(i, v)}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {productos.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.descripcion}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={1} step="1" value={it.cantidad}
                        onChange={(e) => updateItem(i, 'cantidad', Number(e.target.value) || 1)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} step="1" value={it.precio_unitario}
                        onChange={(e) => updateItem(i, 'precio_unitario', Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Select value={it.iva} onValueChange={(v) => updateItem(i, 'iva', v as IvaType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="exento">Exento</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatNum(it.cantidad * it.precio_unitario)}
                    </TableCell>
                    <TableCell>
                      {items.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeItem(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="text-sm space-y-1 text-right">
              <div>Subtotal: <span className="font-mono font-medium">{formatNum(totals.subtotal)}</span></div>
              <div>IVA: <span className="font-mono font-medium">{formatNum(totals.iva)}</span></div>
              <div className="text-base font-bold">
                Total: <span className="font-mono">{formatNum(totals.total)} {moneda}</span>
              </div>
              {moneda !== 'PYG' && (
                <div className="text-muted-foreground">
                  ≈ {formatNum(totals.total * fxRate)} PYG
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Observación</Label>
          <Textarea rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : factura ? 'Actualizar' : 'Crear factura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
