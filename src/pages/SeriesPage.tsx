import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil } from 'lucide-react';

const empty = {
  codigo: '001-001',
  descripcion: '',
  timbrado: '',
  fecha_inicio_timbrado: '',
  fecha_fin_timbrado: '',
  numero_actual: 0,
  predeterminada: false,
  activo: true,
};

export default function SeriesPage() {
  const qc = useQueryClient();
  const { userRole } = useAuth();
  const empresa_id = userRole?.empresa_id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['factura_series', empresa_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factura_series').select('*')
        .eq('empresa_id', empresa_id!).order('codigo');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa_id,
  });

  useEffect(() => {
    if (editing) setForm({ ...empty, ...editing });
    else setForm(empty);
  }, [editing]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        empresa_id,
        numero_actual: Number(form.numero_actual) || 0,
        fecha_inicio_timbrado: form.fecha_inicio_timbrado || null,
        fecha_fin_timbrado: form.fecha_fin_timbrado || null,
      };
      if (editing) {
        const { error } = await supabase.from('factura_series').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('factura_series').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Serie actualizada' : 'Serie creada');
      qc.invalidateQueries({ queryKey: ['factura_series'] });
      setOpen(false); setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Series de facturación</h1>
          <p className="text-muted-foreground">Gestiona las series y timbrados de tu empresa.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nueva serie</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar serie' : 'Nueva serie'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código (ej: 001-001)</Label>
                <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={form.descripcion || ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Timbrado</Label>
                <Input value={form.timbrado || ''} onChange={(e) => setForm({ ...form, timbrado: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Último número emitido</Label>
                <Input type="number" min={0} value={form.numero_actual}
                  onChange={(e) => setForm({ ...form, numero_actual: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Inicio timbrado</Label>
                <Input type="date" value={form.fecha_inicio_timbrado || ''}
                  onChange={(e) => setForm({ ...form, fecha_inicio_timbrado: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fin timbrado</Label>
                <Input type="date" value={form.fecha_fin_timbrado || ''}
                  onChange={(e) => setForm({ ...form, fecha_fin_timbrado: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.predeterminada}
                  onCheckedChange={(v) => setForm({ ...form, predeterminada: v })} />
                <Label>Predeterminada</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.activo}
                  onCheckedChange={(v) => setForm({ ...form, activo: v })} />
                <Label>Activa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Timbrado</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Último Nº</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center">Cargando...</TableCell></TableRow>
            ) : series.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Sin series</TableCell></TableRow>
            ) : series.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono">{s.codigo}</TableCell>
                <TableCell>{s.descripcion || '—'}</TableCell>
                <TableCell>{s.timbrado || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {s.fecha_inicio_timbrado ? `${s.fecha_inicio_timbrado} → ${s.fecha_fin_timbrado || '∞'}` : '—'}
                </TableCell>
                <TableCell className="font-mono">{String(s.numero_actual).padStart(7, '0')}</TableCell>
                <TableCell className="space-x-1">
                  <Badge variant={s.activo ? 'default' : 'secondary'}>{s.activo ? 'Activa' : 'Inactiva'}</Badge>
                  {s.predeterminada && <Badge variant="outline">Predet.</Badge>}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
