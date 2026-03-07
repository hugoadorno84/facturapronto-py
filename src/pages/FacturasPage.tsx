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
import { Plus, Search, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type IvaType = Database['public']['Enums']['iva_type'];

interface FacturaItem {
  producto_id: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  iva: IvaType;
  subtotal: number;
}

const formatPYG = (n: number) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);

const FacturasPage = () => {
  const { userRole, user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [condicion, setCondicion] = useState('contado');
  const [items, setItems] = useState<FacturaItem[]>([]);
  const [selectedProducto, setSelectedProducto] = useState('');

  const { data: facturas, isLoading } = useQuery({
    queryKey: ['facturas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facturas')
        .select('*, clientes(nombre, ruc)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, nombre, ruc');
      return data || [];
    },
  });

  const { data: productos } = useQuery({
    queryKey: ['productos-select'],
    queryFn: async () => {
      const { data } = await supabase.from('productos').select('*').eq('activo', true);
      return data || [];
    },
  });

  const addItem = () => {
    const prod = productos?.find(p => p.id === selectedProducto);
    if (!prod) return;
    setItems([...items, {
      producto_id: prod.id,
      descripcion: prod.descripcion,
      cantidad: 1,
      precio_unitario: prod.precio,
      iva: prod.iva,
      subtotal: prod.precio,
    }]);
    setSelectedProducto('');
  };

  const updateItemQuantity = (idx: number, qty: number) => {
    const updated = [...items];
    updated[idx].cantidad = qty;
    updated[idx].subtotal = qty * updated[idx].precio_unitario;
    setItems(updated);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const calcIva = (item: FacturaItem) => {
    if (item.iva === 'exento') return 0;
    const rate = item.iva === '10' ? 11 : 21;
    return Math.round(item.subtotal / rate);
  };

  const totalSubtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const totalIva = items.reduce((s, i) => s + calcIva(i), 0);

  const createMutation = useMutation({
    mutationFn: async () => {
      const empresa_id = userRole?.empresa_id;
      if (!empresa_id || !clienteId) throw new Error('Missing data');

      // Get next number
      const { data: lastFactura } = await supabase
        .from('facturas')
        .select('numero')
        .eq('empresa_id', empresa_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const nextNum = lastFactura ? String(parseInt(lastFactura.numero) + 1).padStart(7, '0') : '0000001';

      const { data: factura, error } = await supabase.from('facturas').insert({
        empresa_id,
        cliente_id: clienteId,
        numero: nextNum,
        condicion,
        subtotal: totalSubtotal,
        total_iva: totalIva,
        total: totalSubtotal,
        estado: 'borrador',
        created_by: user?.id,
      }).select().single();

      if (error || !factura) throw error || new Error('No factura');

      const facItems = items.map(i => ({
        factura_id: factura.id,
        producto_id: i.producto_id,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        iva: i.iva,
        subtotal: i.subtotal,
      }));

      const { error: itemsError } = await supabase.from('factura_items').insert(facItems);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      setOpen(false);
      setItems([]);
      setClienteId('');
      toast.success('Factura creada exitosamente');
    },
    onError: () => toast.error('Error al crear factura'),
  });

  const statusColors: Record<string, string> = {
    borrador: 'bg-warning/10 text-warning border-warning/20',
    emitida: 'bg-primary/10 text-primary border-primary/20',
    anulada: 'bg-destructive/10 text-destructive border-destructive/20',
    pagada: 'bg-success/10 text-success border-success/20',
  };

  const filtered = facturas?.filter(f =>
    f.numero.includes(search) || (f.clientes as any)?.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Facturas</h1>
          <p className="text-muted-foreground mt-1">Emita y gestione facturas electrónicas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nueva Factura</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Crear Factura</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                    <SelectContent>
                      {clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre} - {c.ruc}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
              </div>

              {/* Items */}
              <div className="space-y-3">
                <Label>Ítems</Label>
                <div className="flex gap-2">
                  <Select value={selectedProducto} onValueChange={setSelectedProducto}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Agregar producto..." /></SelectTrigger>
                    <SelectContent>
                      {productos?.map(p => <SelectItem key={p.id} value={p.id}>{p.descripcion} - {formatPYG(p.precio)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="secondary" onClick={addItem} disabled={!selectedProducto}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {items.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="w-24">Cant.</TableHead>
                          <TableHead>Precio</TableHead>
                          <TableHead>IVA</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{item.descripcion}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                value={item.cantidad}
                                onChange={e => updateItemQuantity(idx, parseInt(e.target.value) || 1)}
                                className="w-20 h-8"
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{formatPYG(item.precio_unitario)}</TableCell>
                            <TableCell className="text-sm">{item.iva === 'exento' ? 'Exento' : `${item.iva}%`}</TableCell>
                            <TableCell className="font-mono text-sm font-medium">{formatPYG(item.subtotal)}</TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8">
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {items.length > 0 && (
                  <div className="flex justify-end">
                    <div className="space-y-1 text-right">
                      <div className="text-sm text-muted-foreground">IVA: {formatPYG(totalIva)}</div>
                      <div className="text-lg font-bold text-foreground">Total: {formatPYG(totalSubtotal)}</div>
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending || items.length === 0 || !clienteId}>
                {createMutation.isPending ? 'Creando...' : 'Crear Factura'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por número o cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card className="glass-panel">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Condición</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay facturas emitidas</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered?.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-sm font-medium text-foreground">{f.numero}</TableCell>
                    <TableCell>{(f.clientes as any)?.nombre || '—'}</TableCell>
                    <TableCell>{new Date(f.fecha).toLocaleDateString('es-PY')}</TableCell>
                    <TableCell className="font-mono font-medium">{formatPYG(f.total)}</TableCell>
                    <TableCell className="capitalize">{f.condicion}</TableCell>
                    <TableCell><Badge className={statusColors[f.estado]}>{f.estado}</Badge></TableCell>
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

export default FacturasPage;
