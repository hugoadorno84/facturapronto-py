import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileText, MoreHorizontal, Pencil, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceFormDialog } from '@/components/invoices/InvoiceFormDialog';
import { InvoiceDetailDialog } from '@/components/invoices/InvoiceDetailDialog';

const statusLabels: Record<string, string> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  anulada: 'Anulada',
  pagada: 'Pagada',
  pago_parcial: 'Pago parcial',
};

const statusColors: Record<string, string> = {
  borrador: 'bg-warning/10 text-warning border-warning/20',
  emitida: 'bg-primary/10 text-primary border-primary/20',
  anulada: 'bg-destructive/10 text-destructive border-destructive/20',
  pagada: 'bg-success/10 text-success border-success/20',
  pago_parcial: 'bg-warning/10 text-warning border-warning/20',
};

const formatPYG = (n: number, moneda = 'PYG') =>
  `${new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0))} ${moneda}`;

const FacturasPage = () => {
  const { userRole } = useAuth();
  const qc = useQueryClient();
  const isAdmin = userRole?.role === 'super_admin' || userRole?.role === 'consultora';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: facturas, isLoading } = useQuery({
    queryKey: ['facturas', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('facturas')
        .select('*, clientes(nombre, ruc, sucursal)')
        .order('fecha', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('estado', statusFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = facturas?.filter((f: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return f.numero?.toLowerCase().includes(s) || f.clientes?.nombre?.toLowerCase().includes(s);
  });

  const changeStatus = async (id: string, estado: string) => {
    const { error } = await supabase.from('facturas').update({ estado: estado as any }).eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Factura ${statusLabels[estado]?.toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ['facturas'] });
    }
  };

  const deleteFactura = async (f: any) => {
    if (f.estado !== 'borrador' && f.estado !== 'anulada') {
      toast.error('Solo se pueden eliminar facturas en borrador o anuladas');
      return;
    }
    if (f.estado === 'anulada' && !isAdmin) {
      toast.error('Solo administradores pueden eliminar facturas anuladas');
      return;
    }
    if (!confirm(`¿Eliminar definitivamente la factura ${f.numero}?`)) return;
    await supabase.from('factura_items').delete().eq('factura_id', f.id);
    const { error } = await supabase.from('facturas').delete().eq('id', f.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Factura eliminada');
      qc.invalidateQueries({ queryKey: ['facturas'] });
    }
  };

  const openEdit = (f: any) => {
    if (f.estado === 'borrador') {
      // ok
    } else if (f.estado === 'emitida') {
      if (!isAdmin) {
        toast.error('Solo administradores pueden editar facturas emitidas');
        return;
      }
    } else {
      toast.error('Esta factura no se puede editar');
      return;
    }
    setEditing(f);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Facturas</h1>
          <p className="text-muted-foreground mt-1">Emita y gestione facturas electrónicas</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Factura
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por número o cliente..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="emitida">Emitida</SelectItem>
            <SelectItem value="pago_parcial">Pago parcial</SelectItem>
            <SelectItem value="pagada">Pagada</SelectItem>
            <SelectItem value="anulada">Anulada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass-panel">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Condición</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : !filtered || filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay facturas emitidas</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-sm font-medium">{f.numero}</TableCell>
                    <TableCell>{new Date(f.fecha).toLocaleDateString('es-PY')}</TableCell>
                    <TableCell className="font-medium">{f.clientes?.nombre || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.clientes?.sucursal || '—'}</TableCell>
                    <TableCell className="capitalize">{f.condicion}</TableCell>
                    <TableCell className="text-right font-mono">{formatPYG(f.total, f.moneda || 'PYG')}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[f.estado]}>{statusLabels[f.estado] || f.estado}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setViewing(f); setDetailOpen(true); }}>
                            <Eye className="mr-2 h-4 w-4" /> Ver detalle
                          </DropdownMenuItem>
                          {f.estado === 'borrador' && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(f)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => changeStatus(f.id, 'emitida')}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Emitir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteFactura(f)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                          {(f.estado === 'emitida' || f.estado === 'pago_parcial') && (
                            <>
                              {isAdmin && f.estado === 'emitida' && (
                                <DropdownMenuItem onClick={() => openEdit(f)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => changeStatus(f.id, 'pagada')}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Marcar pagada
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => changeStatus(f.id, 'anulada')}>
                                <XCircle className="mr-2 h-4 w-4" /> Anular
                              </DropdownMenuItem>
                            </>
                          )}
                          {f.estado === 'anulada' && isAdmin && (
                            <DropdownMenuItem onClick={() => deleteFactura(f)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        factura={editing}
      />
      <InvoiceDetailDialog
        open={detailOpen}
        onOpenChange={(v) => { setDetailOpen(v); if (!v) setViewing(null); }}
        factura={viewing}
      />
    </div>
  );
};

export default FacturasPage;
