import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus, Search, MoreHorizontal, Pencil, Send, CheckCircle,
  XCircle, FileText, Clock, Eye,
} from 'lucide-react';
import { PresupuestoFormDialog } from '@/components/quotes/PresupuestoFormDialog';
import { PresupuestoDetailDialog } from '@/components/quotes/PresupuestoDetailDialog';
import { useAuth } from '@/contexts/AuthContext';

const statusLabels: Record<string, string> = {
  borrador: 'Borrador', enviado: 'Enviado', aprobado: 'Aprobado',
  aceptado: 'Aceptado', rechazado: 'Rechazado', expirado: 'Expirado',
};
const statusColors: Record<string, string> = {
  borrador: 'bg-muted text-muted-foreground',
  enviado: 'bg-primary/10 text-primary',
  aprobado: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  aceptado: 'bg-green-500/10 text-green-600 dark:text-green-400',
  rechazado: 'bg-destructive/10 text-destructive',
  expirado: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
};

export default function PresupuestosPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  const { data: presupuestos = [], isLoading } = useQuery({
    queryKey: ['presupuestos', search, statusFilter],
    queryFn: async () => {
      let q = supabase.from('presupuestos' as any)
        .select('*, clientes(nombre, ruc, sucursal)')
        .order('fecha', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('estado', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      const list = (data as any[]) || [];
      if (search) {
        const s = search.toLowerCase();
        return list.filter((p) =>
          (p.numero || '').toLowerCase().includes(s) ||
          (p.clientes?.nombre || '').toLowerCase().includes(s)
        );
      }
      return list;
    },
  });

  const changeStatus = async (id: string, estado: string) => {
    const { error } = await supabase.from('presupuestos' as any).update({ estado }).eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Presupuesto ${statusLabels[estado]?.toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ['presupuestos'] });
    }
  };

  const convertToInvoice = async (p: any) => {
    if (p.estado !== 'aprobado') {
      toast.error('El presupuesto debe estar aprobado para convertir');
      return;
    }
    try {
      const { data: items, error: itemsErr } = await supabase
        .from('presupuesto_items' as any).select('*').eq('presupuesto_id', p.id);
      if (itemsErr) throw itemsErr;

      const { data: factura, error: facErr } = await supabase
        .from('facturas').insert({
          empresa_id: p.empresa_id,
          cliente_id: p.cliente_id,
          numero: `PR-${p.numero}`,
          fecha: new Date().toISOString().slice(0, 10),
          condicion: p.condicion || 'contado',
          moneda: p.moneda,
          fx_rate: p.fx_rate,
          subtotal: p.subtotal,
          total_iva: p.total_iva,
          total: p.total,
          estado: 'borrador',
          observacion: `Generada desde presupuesto ${p.numero}`,
          created_by: user?.id,
        }).select('id').single();
      if (facErr) throw facErr;

      if (items && items.length) {
        const facItems = (items as any[]).map((it) => ({
          factura_id: factura.id,
          producto_id: it.producto_id,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          iva: it.iva,
          subtotal: it.subtotal,
        }));
        await supabase.from('factura_items').insert(facItems);
      }

      await supabase.from('presupuestos' as any).update({ estado: 'aceptado' }).eq('id', p.id);

      toast.success('Factura creada desde presupuesto');
      qc.invalidateQueries({ queryKey: ['presupuestos'] });
      qc.invalidateQueries({ queryKey: ['facturas'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const formatNum = (n: number) =>
    new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Presupuestos</h1>
          <p className="text-muted-foreground mt-1">Gestión de presupuestos y cotizaciones</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo presupuesto
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nro. o cliente..." className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : presupuestos.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No hay presupuestos registrados.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nro.</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Válido hasta</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presupuestos.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.numero}</TableCell>
                  <TableCell>{p.fecha}</TableCell>
                  <TableCell>{p.valido_hasta || '—'}</TableCell>
                  <TableCell className="font-medium">{p.clientes?.nombre}</TableCell>
                  <TableCell className="text-right font-mono">{formatNum(p.total)} {p.moneda}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[p.estado] || ''}>
                      {statusLabels[p.estado] || p.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetail(p)}>
                          <Eye className="mr-2 h-4 w-4" /> Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditing(p); setFormOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        {p.estado === 'borrador' && (
                          <DropdownMenuItem onClick={() => changeStatus(p.id, 'enviado')}>
                            <Send className="mr-2 h-4 w-4" /> Marcar enviado
                          </DropdownMenuItem>
                        )}
                        {(p.estado === 'enviado' || p.estado === 'borrador') && (
                          <>
                            <DropdownMenuItem onClick={() => changeStatus(p.id, 'aprobado')}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Aprobar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => changeStatus(p.id, 'rechazado')}>
                              <XCircle className="mr-2 h-4 w-4" /> Rechazar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => changeStatus(p.id, 'expirado')}>
                              <Clock className="mr-2 h-4 w-4" /> Marcar expirado
                            </DropdownMenuItem>
                          </>
                        )}
                        {p.estado === 'aprobado' && (
                          <DropdownMenuItem onClick={() => convertToInvoice(p)}>
                            <FileText className="mr-2 h-4 w-4" /> Convertir a factura
                          </DropdownMenuItem>
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

      <PresupuestoFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        presupuesto={editing}
      />
      <PresupuestoDetailDialog
        open={!!detail}
        onOpenChange={(v) => { if (!v) setDetail(null); }}
        presupuesto={detail}
      />
    </div>
  );
}
