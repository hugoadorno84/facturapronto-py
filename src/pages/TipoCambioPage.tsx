import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';

export default function TipoCambioPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [newRate, setNewRate] = useState({
    currency_code: 'USD', rate: 0,
    rate_date: new Date().toISOString().slice(0, 10), source: 'manual',
  });
  const [saving, setSaving] = useState(false);

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['fx_rates', currencyFilter],
    queryFn: async () => {
      let q = supabase.from('fx_rates' as any).select('*').order('rate_date', { ascending: false }).order('currency_code');
      if (currencyFilter !== 'all') q = q.eq('currency_code', currencyFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const handleSave = async () => {
    if (!newRate.rate || !newRate.rate_date) { toast.error('Completa todos los campos'); return; }
    setSaving(true);
    const { error } = await supabase.from('fx_rates' as any).insert({
      currency_code: newRate.currency_code, rate: newRate.rate,
      rate_date: newRate.rate_date, source: newRate.source || 'manual',
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Tipo de cambio registrado');
      qc.invalidateQueries({ queryKey: ['fx_rates'] });
      setFormOpen(false);
      setNewRate({ currency_code: 'USD', rate: 0, rate_date: new Date().toISOString().slice(0, 10), source: 'manual' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('fx_rates' as any).delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['fx_rates'] }); }
  };

  const formatNum = (n: number) =>
    new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tipo de cambio</h1>
          <p className="text-muted-foreground mt-1">Cotizaciones diarias USD y BRL a PYG</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Registrar cotización
        </Button>
      </div>

      <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="USD">USD</SelectItem>
          <SelectItem value="BRL">BRL</SelectItem>
          <SelectItem value="EUR">EUR</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : rates.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No hay cotizaciones registradas.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead className="text-right">Cotización (PYG)</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.rate_date}</TableCell>
                  <TableCell className="font-medium">{r.currency_code}</TableCell>
                  <TableCell className="text-right font-mono">{formatNum(r.rate)}</TableCell>
                  <TableCell className="text-muted-foreground">{r.source}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar cotización</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Moneda</Label>
              <Select value={newRate.currency_code} onValueChange={(v) => setNewRate({ ...newRate, currency_code: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cotización (1 unidad = X PYG)</Label>
              <Input type="number" min={0} step="0.01" value={newRate.rate || ''}
                onChange={(e) => setNewRate({ ...newRate, rate: Number(e.target.value) })} placeholder="Ej: 7350" />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={newRate.rate_date} onChange={(e) => setNewRate({ ...newRate, rate_date: e.target.value })} />
            </div>
            <div>
              <Label>Fuente</Label>
              <Input value={newRate.source} onChange={(e) => setNewRate({ ...newRate, source: e.target.value })} placeholder="manual, BCP, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
