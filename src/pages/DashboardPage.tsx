import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Users, FileText, Package, TrendingUp, ArrowUpRight,
  Receipt, CreditCard, AlertTriangle, FolderOpen, CalendarDays, X,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';

const typeLabels: Record<string, string> = {
  cobro: 'Cobro', pago: 'Pago', servicio: 'Servicio', general: 'General',
  facturacion: 'Facturación', presupuesto: 'Presupuesto',
};
const typeDotColors: Record<string, string> = {
  cobro: 'bg-green-500', pago: 'bg-orange-500', servicio: 'bg-violet-500',
  general: 'bg-muted-foreground', facturacion: 'bg-primary', presupuesto: 'bg-blue-500',
};
const typeColors: Record<string, string> = {
  cobro: 'bg-green-500/80 text-white', pago: 'bg-orange-500/80 text-white',
  servicio: 'bg-violet-500/80 text-white', general: 'bg-muted-foreground/60 text-white',
  facturacion: 'bg-primary/80 text-primary-foreground', presupuesto: 'bg-blue-500/80 text-white',
};

function getWeekRange(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d); start.setDate(d.getDate() - day);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

const StatCard = ({ title, value, icon: Icon, description, trend }: any) => (
  <Card className="glass-panel">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      {trend && (
        <p className="text-xs text-success flex items-center gap-1 mt-1">
          <ArrowUpRight className="h-3 w-3" /> {trend}
        </p>
      )}
    </CardContent>
  </Card>
);

function EmpresaDashboard() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthStart = `${currentMonth}-01`;
  const nextMonth = new Date(new Date(monthStart).setMonth(new Date(monthStart).getMonth() + 1))
    .toISOString().slice(0, 10);
  const week = getWeekRange(new Date());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const hasCustomRange = dateFrom || dateTo;
  const eventsFrom = hasCustomRange ? (dateFrom || '2000-01-01') : week.start;
  const eventsTo = hasCustomRange ? (dateTo || '2099-12-31') : week.end;

  const { data: facturas = [] } = useQuery({
    queryKey: ['dash_facturas'],
    queryFn: async () => {
      const { data } = await supabase.from('facturas').select('id, estado, fecha, total').neq('estado', 'anulada');
      return data || [];
    },
  });

  const { data: pagos = [] } = useQuery({
    queryKey: ['dash_pagos'],
    queryFn: async () => {
      const { data } = await supabase.from('pagos').select('id, tipo, fecha, monto').eq('tipo', 'cobro');
      return data || [];
    },
  });

  const { data: presupuestos = [] } = useQuery({
    queryKey: ['dash_presupuestos'],
    queryFn: async () => {
      const { data } = await supabase.from('presupuestos' as any).select('id, estado').in('estado', ['borrador', 'enviado']);
      return data || [];
    },
  });

  const { data: proyectos = [] } = useQuery({
    queryKey: ['dash_proyectos'],
    queryFn: async () => {
      const { data } = await supabase.from('proyectos' as any).select('id, estado').eq('estado', 'abierto');
      return data || [];
    },
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ['dash_eventos', eventsFrom, eventsTo],
    queryFn: async () => {
      const { data } = await supabase.from('eventos_calendario' as any)
        .select('id, titulo, fecha, hora, tipo, descripcion')
        .gte('fecha', eventsFrom).lte('fecha', eventsTo)
        .order('fecha').order('hora');
      return data || [];
    },
  });

  const kpis = useMemo(() => {
    const monthInv = facturas.filter((i: any) => i.fecha >= monthStart && i.fecha < nextMonth);
    const facturacionMes = monthInv.reduce((s: number, i: any) => s + Number(i.total), 0);
    const monthPay = pagos.filter((p: any) => p.fecha >= monthStart && p.fecha < nextMonth);
    const cobrosMes = monthPay.reduce((s: number, p: any) => s + Number(p.monto), 0);
    const pending = facturas.filter((i: any) => ['emitida', 'pago_parcial'].includes(i.estado));
    const cuentasPorCobrar = pending.reduce((s: number, i: any) => s + Number(i.total), 0) - cobrosMes;
    return {
      facturacionMes,
      cobrosMes,
      cuentasPorCobrar: Math.max(0, cuentasPorCobrar),
      pendingCount: pending.length,
    };
  }, [facturas, pagos, monthStart, nextMonth]);

  const chartData = useMemo(() => {
    const months: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const start = `${key}-01`;
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
      const label = d.toLocaleDateString('es', { month: 'short', year: '2-digit' });
      const facturado = facturas.filter((f: any) => f.fecha >= start && f.fecha < end)
        .reduce((s: number, f: any) => s + Number(f.total), 0);
      const cobrado = pagos.filter((p: any) => p.fecha >= start && p.fecha < end)
        .reduce((s: number, p: any) => s + Number(p.monto), 0);
      months.push({ label, facturado: Math.round(facturado / 1_000_000), cobrado: Math.round(cobrado / 1_000_000) });
    }
    return months;
  }, [facturas, pagos]);

  const formatPyg = (n: number) => '₲ ' + new Intl.NumberFormat('es-PY').format(Math.round(n));

  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    eventos.forEach((e: any) => {
      const list = map.get(e.fecha) || [];
      list.push(e); map.set(e.fecha, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [eventos]);

  const rangeLabel = hasCustomRange
    ? `${dateFrom || '...'} — ${dateTo || '...'}`
    : `Semana actual: ${new Date(week.start + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })} – ${new Date(week.end + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen de indicadores del negocio</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Agenda */}
        <Card className="glass-panel">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Agenda</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">{rangeLabel}</span>
            </div>
            <div className="flex items-end gap-3 pt-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Desde</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Hasta</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs" />
              </div>
              {hasCustomRange && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="max-h-[350px] overflow-y-auto">
            {eventos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay eventos en este período</p>
            ) : (
              <div className="space-y-4">
                {eventsByDate.map(([date, evs]) => (
                  <div key={date}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5 capitalize">
                      {new Date(date + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                    <div className="space-y-1.5">
                      {evs.map((ev: any) => (
                        <div key={ev.id} className="flex items-start gap-2 rounded-md border px-3 py-2">
                          <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', typeDotColors[ev.tipo] || typeDotColors.general)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{ev.titulo}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {ev.hora && <span className="text-xs text-muted-foreground">{ev.hora.slice(0, 5)}</span>}
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', typeColors[ev.tipo])}>{typeLabels[ev.tipo]}</Badge>
                            </div>
                            {ev.descripcion && <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.descripcion}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-base">Facturación vs Cobros (últimos 6 meses, millones ₲)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value}M ₲`} />
                <Legend />
                <Bar dataKey="facturado" name="Facturado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cobrado" name="Cobrado" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Facturación del mes" value={formatPyg(kpis.facturacionMes)} icon={Receipt} description="Total facturado (PYG)" />
        <StatCard title="Cobros del mes" value={formatPyg(kpis.cobrosMes)} icon={CreditCard} description="Total cobrado (PYG)" />
        <StatCard title="Cuentas por cobrar" value={formatPyg(kpis.cuentasPorCobrar)} icon={AlertTriangle} description={`${kpis.pendingCount} facturas pendientes`} />
        <StatCard title="Presupuestos activos" value={String(presupuestos.length)} icon={FileText} description="Borrador o enviados" />
        <StatCard title="Proyectos abiertos" value={String(proyectos.length)} icon={FolderOpen} description="En curso" />
      </div>
    </div>
  );
}

const DashboardPage = () => {
  const { userRole, profile } = useAuth();
  const role = userRole?.role;

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', role],
    enabled: role !== 'empresa',
    queryFn: async () => {
      if (role === 'super_admin') {
        const [consultoras, empresas] = await Promise.all([
          supabase.from('consultoras').select('id', { count: 'exact', head: true }),
          supabase.from('empresas').select('id', { count: 'exact', head: true }),
        ]);
        return { consultoras: consultoras.count || 0, empresas: empresas.count || 0 };
      }
      if (role === 'consultora') {
        const [empresas, facturas] = await Promise.all([
          supabase.from('empresas').select('id', { count: 'exact', head: true }),
          supabase.from('facturas').select('id', { count: 'exact', head: true }),
        ]);
        return { empresas: empresas.count || 0, facturas: facturas.count || 0 };
      }
      return {};
    },
  });

  if (role === 'empresa') return <EmpresaDashboard />;

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Administrador',
    consultora: 'Panel de Consultora',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Bienvenido, {profile?.full_name || 'Usuario'}</h1>
        <p className="text-muted-foreground mt-1">{role ? roleLabels[role] : 'Cargando...'}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {role === 'super_admin' && (
          <>
            <StatCard title="Consultoras" value={String(stats?.consultoras || 0)} icon={Building2} trend="+2 este mes" />
            <StatCard title="Empresas" value={String(stats?.empresas || 0)} icon={Building2} />
            <StatCard title="Usuarios Activos" value="—" icon={Users} />
            <StatCard title="Facturas del Mes" value="—" icon={FileText} />
          </>
        )}
        {role === 'consultora' && (
          <>
            <StatCard title="Empresas" value={String(stats?.empresas || 0)} icon={Building2} />
            <StatCard title="Facturas Emitidas" value={String(stats?.facturas || 0)} icon={FileText} />
            <StatCard title="Ingresos del Mes" value="—" icon={TrendingUp} />
            <StatCard title="Usuarios" value="—" icon={Users} />
          </>
        )}
      </div>
      <Card className="glass-panel">
        <CardHeader><CardTitle className="text-foreground">Actividad Reciente</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm">No hay actividad reciente para mostrar.</p></CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
