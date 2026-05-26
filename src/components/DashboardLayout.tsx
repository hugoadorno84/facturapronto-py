import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2, Users, FileText, Package, UserCheck, LayoutDashboard,
  LogOut, Settings, ChevronLeft, ChevronRight, Receipt, BarChart3, Hash
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { userRole, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const role = userRole?.role;

  const navItems: NavItem[] = (() => {
    const items: NavItem[] = [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ];

    if (role === 'super_admin') {
      items.push(
        { label: 'Consultoras', href: '/consultoras', icon: Building2 },
        { label: 'Empresas', href: '/empresas', icon: Building2 },
        { label: 'Usuarios', href: '/usuarios', icon: Users },
        { label: 'Métricas', href: '/metricas', icon: BarChart3 },
      );
    }

    if (role === 'consultora') {
      items.push(
        { label: 'Empresas', href: '/empresas', icon: Building2 },
        { label: 'Usuarios', href: '/usuarios', icon: Users },
        { label: 'Facturación', href: '/facturacion', icon: Receipt },
      );
    }

    if (role === 'empresa') {
      items.push(
        { label: 'Clientes', href: '/clientes', icon: UserCheck },
        { label: 'Productos', href: '/productos', icon: Package },
        { label: 'Facturas', href: '/facturas', icon: FileText },
        { label: 'Series', href: '/series', icon: Hash },
      );
    }

    items.push({ label: 'Configuración', href: '/configuracion', icon: Settings });
    return items;
  })();

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    consultora: 'Consultora',
    empresa: 'Empresa',
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <FileText className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && <span className="text-lg font-bold text-sidebar-primary-foreground">FacturaPY</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          {!collapsed && (
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                {profile?.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-sidebar-foreground">
                {role ? roleLabels[role] : ''}
              </p>
            </div>
          )}
          <button
            onClick={async () => { await signOut(); navigate('/login'); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar flex items-center justify-center text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Main content */}
      <main className={cn('flex-1 transition-all duration-300', collapsed ? 'ml-16' : 'ml-64')}>
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
