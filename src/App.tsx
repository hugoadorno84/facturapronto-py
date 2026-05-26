import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ConsultorasPage from "@/pages/ConsultorasPage";
import EmpresasPage from "@/pages/EmpresasPage";
import ClientesPage from "@/pages/ClientesPage";
import ProductosPage from "@/pages/ProductosPage";
import FacturasPage from "@/pages/FacturasPage";
import SeriesPage from "@/pages/SeriesPage";
import ProveedoresPage from "@/pages/ProveedoresPage";
import PagosPage from "@/pages/PagosPage";
import ReportesPage from "@/pages/ReportesPage";
import UsuariosPage from "@/pages/UsuariosPage";
import MetricasPage from "@/pages/MetricasPage";
import ConfiguracionPage from "@/pages/ConfiguracionPage";
import FacturacionConsultoraPage from "@/pages/FacturacionConsultoraPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const DashboardRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: Array<'super_admin' | 'consultora' | 'empresa'> }) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardRoute><DashboardPage /></DashboardRoute>} />
            <Route path="/consultoras" element={<DashboardRoute allowedRoles={['super_admin']}><ConsultorasPage /></DashboardRoute>} />
            <Route path="/empresas" element={<DashboardRoute allowedRoles={['super_admin', 'consultora']}><EmpresasPage /></DashboardRoute>} />
            <Route path="/usuarios" element={<DashboardRoute allowedRoles={['super_admin', 'consultora']}><UsuariosPage /></DashboardRoute>} />
            <Route path="/metricas" element={<DashboardRoute allowedRoles={['super_admin']}><MetricasPage /></DashboardRoute>} />
            <Route path="/clientes" element={<DashboardRoute allowedRoles={['empresa']}><ClientesPage /></DashboardRoute>} />
            <Route path="/productos" element={<DashboardRoute allowedRoles={['empresa']}><ProductosPage /></DashboardRoute>} />
            <Route path="/facturas" element={<DashboardRoute allowedRoles={['empresa']}><FacturasPage /></DashboardRoute>} />
            <Route path="/series" element={<DashboardRoute allowedRoles={['empresa']}><SeriesPage /></DashboardRoute>} />
            <Route path="/proveedores" element={<DashboardRoute allowedRoles={['empresa']}><ProveedoresPage /></DashboardRoute>} />
            <Route path="/pagos" element={<DashboardRoute allowedRoles={['empresa']}><PagosPage /></DashboardRoute>} />
            <Route path="/reportes" element={<DashboardRoute allowedRoles={['empresa']}><ReportesPage /></DashboardRoute>} />
            <Route path="/facturacion" element={<DashboardRoute allowedRoles={['consultora']}><FacturacionConsultoraPage /></DashboardRoute>} />
            <Route path="/configuracion" element={<DashboardRoute><ConfiguracionPage /></DashboardRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
