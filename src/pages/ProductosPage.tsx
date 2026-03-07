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
import { Plus, Search, Package } from 'lucide-react';
import { toast } from 'sonner';

const ivaLabels: Record<string, string> = { '10': '10%', '5': '5%', 'exento': 'Exento' };

const ProductosPage = () => {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ descripcion: '', codigo: '', precio: '', iva: '10' as '10' | '5' | 'exento', unidad_medida: 'UNI' });

  const { data: productos, isLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const empresa_id = userRole?.empresa_id;
      if (!empresa_id) throw new Error('No empresa');
      const { error } = await supabase.from('productos').insert({
        empresa_id,
        descripcion: form.descripcion,
        codigo: form.codigo || null,
        precio: parseFloat(form.precio) || 0,
        iva: form.iva,
        unidad_medida: form.unidad_medida,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      setOpen(false);
      setForm({ descripcion: '', codigo: '', precio: '', iva: '10', unidad_medida: 'UNI' });
      toast.success('Producto creado exitosamente');
    },
    onError: () => toast.error('Error al crear producto'),
  });

  const filtered = productos?.filter(p =>
    p.descripcion.toLowerCase().includes(search.toLowerCase()) || (p.codigo || '').includes(search)
  );

  const formatPrice = (n: number) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Productos</h1>
          <p className="text-muted-foreground mt-1">Administre los productos y servicios</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nuevo Producto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear Producto</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Unidad de Medida</Label>
                  <Input value={form.unidad_medida} onChange={e => setForm({ ...form, unidad_medida: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio (PYG)</Label>
                  <Input type="number" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>IVA</Label>
                  <Select value={form.iva} onValueChange={v => setForm({ ...form, iva: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="exento">Exento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando...' : 'Crear Producto'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por descripción o código..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card className="glass-panel">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>IVA</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay productos registrados</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered?.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.codigo || '—'}</TableCell>
                    <TableCell className="font-medium text-foreground">{p.descripcion}</TableCell>
                    <TableCell className="font-mono">{formatPrice(p.precio)}</TableCell>
                    <TableCell><Badge variant="secondary">{ivaLabels[p.iva]}</Badge></TableCell>
                    <TableCell>{p.unidad_medida}</TableCell>
                    <TableCell>
                      <Badge className={p.activo ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
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

export default ProductosPage;
