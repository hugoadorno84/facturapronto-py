import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from 'lucide-react';

const FacturacionConsultoraPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Facturación</h1>
        <p className="text-muted-foreground mt-1">Resumen de facturación de sus empresas</p>
      </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Resumen de Consumo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Aquí se mostrará el resumen de facturación de todas las empresas bajo su consultora.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FacturacionConsultoraPage;
