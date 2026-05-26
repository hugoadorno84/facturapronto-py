import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Receipt, CreditCard, TrendingUp } from 'lucide-react';

const fmt = (n: number, c = 'PYG') =>
  new Intl.NumberFormat('es-PY', { minimumFractionDigits: c === 'PYG' ? 0 : 2 }).format(Number(n) || 0);

const StatCard = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Card className="glass-panel">
    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
    <CardContent>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

const FacturacionReport = ({ empresaId }: { empresaId: string }) => {
  const { data: facturas = [] } = useQuery({
    queryKey: ['rep-facturas', empresaId],
    queryFn: async () => {
      const { data } = await supabase.from('facturas').select('numero, fecha, total, moneda, estado, clientes(nombre)')
        .eq('empresa_id', empresaId).order('fecha', { ascending: false });
      return data || [];
    },
  });

  const totalEmitido = facturas.filter((f: any) => f.estado !== 'borrador' && f.estado !== 'anulada')
    .reduce((s: number, f: any) => s + Number(f.total || 0), 0);
  const totalPagado = facturas.filter((f: any) => f.estado === 'pagada')
    .reduce((s: number, f: any) => s + Number(f.total || 0), 0);
  const totalPendiente = facturas.filter((f: any) => ['emitida', 'pago_parcial'].includes(f.estado))
    .reduce((s: number, f: any) => s + Number(f.total || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total emitido" value={fmt(totalEmitido) + ' PYG'} hint={`${facturas.length} facturas`} />
        <StatCard label="Cobrado" value={fmt(totalPagado) + ' PYG'} />
        <StatCard label="Pendiente de cobro" value={fmt(totalPendiente) + ' PYG'} />
      </div>
      <Card className="glass-panel">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>N°</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facturas.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin facturas</TableCell></TableRow>
              ) : facturas.slice(0, 50).map((f: any) => (
                <TableRow key={f.numero}>
                  <TableCell>{f.fecha}</TableCell>
                  <TableCell className="font-mono">{f.numero}</TableCell>
                  <TableCell>{f.clientes?.nombre || '—'}</TableCell>
                  <TableCell className="capitalize">{f.estado}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(f.total, f.moneda)} {f.moneda}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const CobrosReport = ({ empresaId }: { empresaId: string }) => {
  const { data: pagos = [] } = useQuery({
    queryKey: ['rep-pagos', empresaId],
    queryFn: async () => {
      const { data } = await supabase.from('pagos').select('*').eq('empresa_id', empresaId);
      return data || [];
    },
  });

  const cobros = pagos.filter((p: any) => p.tipo === 'cobro').reduce((s: number, p: any) => s + Number(p.monto || 0), 0);
  const pagosTot = pagos.filter((p: any) => p.tipo === 'pago').reduce((s: number, p: any) => s + Number(p.monto || 0), 0);
  const neto = cobros - pagosTot;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard label="Total cobros" value={fmt(cobros) + ' PYG'} hint={`${pagos.filter((p: any) => p.tipo === 'cobro').length} mov.`} />
      <StatCard label="Total pagos" value={fmt(pagosTot) + ' PYG'} hint={`${pagos.filter((p: any) => p.tipo === 'pago').length} mov.`} />
      <StatCard label="Flujo neto" value={fmt(neto) + ' PYG'} hint={neto >= 0 ? 'Positivo' : 'Negativo'} />
    </div>
  );
};

const FinancieroReport = ({ empresaId }: { empresaId: string }) => {
  const { data: facturas = [] } = useQuery({
    queryKey: ['rep-fin-fact', empresaId],
    queryFn: async () => {
      const { data } = await supabase.from('facturas').select('fecha, total, estado, moneda').eq('empresa_id', empresaId);
      return data || [];
    },
  });

  const byMonth = facturas.reduce((acc: Record<string, number>, f: any) => {
    if (f.estado === 'borrador' || f.estado === 'anulada') return acc;
    const m = (f.fecha || '').slice(0, 7);
    if (!m) return acc;
    acc[m] = (acc[m] || 0) + Number(f.total || 0);
    return acc;
  }, {});
  const meses = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a));

  return (
    <Card className="glass-panel">
      <CardHeader><CardTitle>Facturación por mes</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Mes</TableHead><TableHead className="text-right">Total facturado</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {meses.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">Sin datos</TableCell></TableRow>
            ) : meses.map(([m, total]) => (
              <TableRow key={m}>
                <TableCell className="font-mono">{m}</TableCell>
                <TableCell className="text-right font-mono">{fmt(total)} PYG</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const ReportesPage = () => {
  const { userRole } = useAuth();
  const empresaId = userRole?.empresa_id;

  if (!empresaId) {
    return <p className="text-muted-foreground">Sin empresa asociada.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
        <p className="text-muted-foreground mt-1">Análisis de facturación, cobros y resultados</p>
      </div>

      <Tabs defaultValue="facturacion" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="facturacion" className="gap-2"><Receipt className="h-4 w-4" /> Facturación</TabsTrigger>
          <TabsTrigger value="cobros" className="gap-2"><CreditCard className="h-4 w-4" /> Cobros/Pagos</TabsTrigger>
          <TabsTrigger value="financiero" className="gap-2"><TrendingUp className="h-4 w-4" /> Financiero</TabsTrigger>
        </TabsList>
        <TabsContent value="facturacion"><FacturacionReport empresaId={empresaId} /></TabsContent>
        <TabsContent value="cobros"><CobrosReport empresaId={empresaId} /></TabsContent>
        <TabsContent value="financiero"><FinancieroReport empresaId={empresaId} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportesPage;
