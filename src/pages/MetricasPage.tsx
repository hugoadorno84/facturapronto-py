import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const MetricasPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Métricas Globales</h1>
        <p className="text-muted-foreground mt-1">Vista general del rendimiento del sistema</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Facturación Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Los gráficos se poblarán con datos reales.</p>
            <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-lg mt-4">
              <span className="text-muted-foreground text-sm">Gráfico de facturación</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-foreground">Crecimiento de Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-lg">
              <span className="text-muted-foreground text-sm">Gráfico de crecimiento</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-foreground">Consumo por Consultora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-lg">
              <span className="text-muted-foreground text-sm">Gráfico de consumo</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-foreground">Estado de Facturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-lg">
              <span className="text-muted-foreground text-sm">Gráfico de estados</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MetricasPage;
