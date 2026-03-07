import { useAuth } from '@/contexts/AuthContext';
import { Building2, Users, FileText, Package, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const StatCard = ({ title, value, icon: Icon, trend }: { title: string; value: string; icon: React.ElementType; trend?: string }) => (
  <Card className="glass-panel animate-fade-in">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {trend && (
        <p className="text-xs text-success flex items-center gap-1 mt-1">
          <ArrowUpRight className="h-3 w-3" /> {trend}
        </p>
      )}
    </CardContent>
  </Card>
);

const DashboardPage = () => {
  const { userRole, profile } = useAuth();
  const role = userRole?.role;

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', role],
    queryFn: async () => {
      if (role === 'super_admin') {
        const [consultoras, empresas] = await Promise.all([
          supabase.from('consultoras').select('id', { count: 'exact', head: true }),
          supabase.from('empresas').select('id', { count: 'exact', head: true }),
        ]);
        return {
          consultoras: consultoras.count || 0,
          empresas: empresas.count || 0,
        };
      }
      if (role === 'consultora') {
        const [empresas, facturas] = await Promise.all([
          supabase.from('empresas').select('id', { count: 'exact', head: true }),
          supabase.from('facturas').select('id', { count: 'exact', head: true }),
        ]);
        return { empresas: empresas.count || 0, facturas: facturas.count || 0 };
      }
      if (role === 'empresa') {
        const [clientes, productos, facturas] = await Promise.all([
          supabase.from('clientes').select('id', { count: 'exact', head: true }),
          supabase.from('productos').select('id', { count: 'exact', head: true }),
          supabase.from('facturas').select('id', { count: 'exact', head: true }),
        ]);
        return {
          clientes: clientes.count || 0,
          productos: productos.count || 0,
          facturas: facturas.count || 0,
        };
      }
      return {};
    },
  });

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Administrador',
    consultora: 'Panel de Consultora',
    empresa: 'Panel de Empresa',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Bienvenido, {profile?.full_name || 'Usuario'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {role ? roleLabels[role] : 'Cargando...'}
        </p>
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
        {role === 'empresa' && (
          <>
            <StatCard title="Clientes" value={String(stats?.clientes || 0)} icon={Users} />
            <StatCard title="Productos" value={String(stats?.productos || 0)} icon={Package} />
            <StatCard title="Facturas" value={String(stats?.facturas || 0)} icon={FileText} />
            <StatCard title="Ventas del Mes" value="—" icon={TrendingUp} />
          </>
        )}
      </div>

      {/* Recent activity placeholder */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-foreground">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No hay actividad reciente para mostrar.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
