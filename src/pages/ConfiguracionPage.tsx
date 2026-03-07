import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

const ConfiguracionPage = () => {
  const { profile, user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-1">Ajustes de su cuenta y perfil</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={profile?.full_name || ''} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input value={user?.email || ''} readOnly />
            </div>
            <Button variant="secondary" disabled>Guardar cambios</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfiguracionPage;
