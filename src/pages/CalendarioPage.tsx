import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeLabels: Record<string, string> = {
  general: 'General', cobro: 'Cobro', pago: 'Pago', servicio: 'Servicio',
  facturacion: 'Facturación', presupuesto: 'Presupuesto',
};
const typeColors: Record<string, string> = {
  general: 'bg-muted-foreground/60 text-white',
  cobro: 'bg-green-500/80 text-white',
  pago: 'bg-orange-500/80 text-white',
  servicio: 'bg-violet-500/80 text-white',
  facturacion: 'bg-primary/80 text-primary-foreground',
  presupuesto: 'bg-blue-500/80 text-white',
};
const typeDotColors: Record<string, string> = {
  general: 'bg-muted-foreground', cobro: 'bg-green-500', pago: 'bg-orange-500',
  servicio: 'bg-violet-500', facturacion: 'bg-primary', presupuesto: 'bg-blue-500',
};
const newEventTypes = ['general', 'cobro', 'pago', 'servicio'] as const;

function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function firstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

export default function CalendarioPage() {
  const qc = useQueryClient();
  const { userRole, user } = useAuth();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    titulo: '', descripcion: '', fecha: '', hora: '', tipo: 'general' as string,
  });
  const [saving, setSaving] = useState(false);

  const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const dim = daysInMonth(currentYear, currentMonth);
  const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${dim}`;

  const { data: eventos = [] } = useQuery({
    queryKey: ['eventos_calendario', currentYear, currentMonth],
    queryFn: async () => {
      const { data } = await supabase.from('eventos_calendario' as any)
        .select('*').gte('fecha', monthStart).lte('fecha', monthEnd)
        .order('fecha').order('hora');
      return (data as any[]) || [];
    },
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    eventos.forEach((e: any) => {
      const list = map.get(e.fecha) || [];
      list.push(e); map.set(e.fecha, list);
    });
    return map;
  }, [eventos]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };
  const goToday = () => {
    setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth());
    setSelectedDate(today.toISOString().slice(0, 10));
  };

  const openNew = (date?: string) => {
    setEditing(null);
    setForm({
      titulo: '', descripcion: '',
      fecha: date || selectedDate || today.toISOString().slice(0, 10),
      hora: '', tipo: 'general',
    });
    setFormOpen(true);
  };

  const openEdit = (ev: any) => {
    setEditing(ev);
    setForm({
      titulo: ev.titulo, descripcion: ev.descripcion || '',
      fecha: ev.fecha, hora: ev.hora || '', tipo: ev.tipo,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.fecha) { toast.error('Título y fecha son requeridos'); return; }
    const empresa_id = userRole?.empresa_id;
    if (!empresa_id) { toast.error('No se identificó la empresa'); return; }
    setSaving(true);
    try {
      const payload: any = {
        empresa_id, titulo: form.titulo,
        descripcion: form.descripcion || null,
        fecha: form.fecha, hora: form.hora || null, tipo: form.tipo,
      };
      if (editing) {
        const { error } = await supabase.from('eventos_calendario' as any).update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Evento actualizado');
      } else {
        const { error } = await supabase.from('eventos_calendario' as any).insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast.success('Evento creado');
      }
      qc.invalidateQueries({ queryKey: ['eventos_calendario'] });
      setFormOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('eventos_calendario' as any).delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Evento eliminado'); qc.invalidateQueries({ queryKey: ['eventos_calendario'] }); }
  };

  const fd = firstDayOfMonth(currentYear, currentMonth);
  const totalCells = Math.ceil((fd + dim) / 7) * 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - fd + 1;
    cells.push(day >= 1 && day <= dim ? day : null);
  }
  const todayStr = today.toISOString().slice(0, 10);
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('es', { month: 'long', year: 'numeric' });
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendario</h1>
          <p className="text-muted-foreground mt-1">Programación de eventos y recordatorios</p>
        </div>
        <Button onClick={() => openNew()}><Plus className="mr-2 h-4 w-4" /> Nuevo evento</Button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold capitalize">{monthName}</h2>
            <Button variant="outline" size="sm" onClick={goToday}>Hoy</Button>
          </div>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {dayNames.map((d) => (
            <div key={d} className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="bg-card/50 min-h-[80px]" />;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = eventsByDate.get(dateStr) || [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            return (
              <div key={i} onClick={() => setSelectedDate(dateStr)}
                className={cn('bg-card min-h-[80px] p-1.5 cursor-pointer transition-colors hover:bg-accent/30',
                  isSelected && 'ring-2 ring-primary ring-inset bg-accent/20')}>
                <div className={cn('text-sm mb-1 w-7 h-7 flex items-center justify-center rounded-full',
                  isToday && 'bg-primary text-primary-foreground font-bold')}>{day}</div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev: any) => (
                    <div key={ev.id} onDoubleClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                      className={cn('text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer',
                        typeColors[ev.tipo] || typeColors.general)}>
                      {ev.titulo}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t">
          {Object.keys(typeLabels).map((t) => (
            <div key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={cn('w-2.5 h-2.5 rounded-full', typeDotColors[t])} />
              {typeLabels[t]}
            </div>
          ))}
        </div>
      </div>

      {selectedDate && selectedEvents.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold mb-3">
            Eventos del {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <div className="space-y-2">
            {selectedEvents.map((ev: any) => (
              <div key={ev.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className={cn('w-2 h-2 rounded-full', typeDotColors[ev.tipo])} />
                  <div>
                    <p className="text-sm font-medium">{ev.titulo}</p>
                    {ev.hora && <p className="text-xs text-muted-foreground">{ev.hora.slice(0, 5)}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(ev)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ev.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar evento' : 'Nuevo evento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </div>
              <div>
                <Label>Hora (opcional)</Label>
                <Input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {newEventTypes.map((t) => (<SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
