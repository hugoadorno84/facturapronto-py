import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const EmpresasPage = () => {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    razon_social: '', ruc: '', direccion: '', telefono: '', email: '',
    timbrado: '', numero_establecimiento: '001', punto_expedicion: '001', consultora_id: ''
  });

  const { data: consultoras } = useQuery({
    queryKey: ['consultoras-select'],
    queryFn: async () => {
      const { data } = await supabase.from('consultoras').select('id, nombre');
      return data || [];
    },
    enabled: userRole?.role === 'super_admin',
  });

  const { data: empresas, isLoading } = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('*, consultoras(nombre)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const consultora_id = userRole?.role === 'super_admin' ? form.consultora_id : userRole?.consultora_id;
      if (!consultora_id) throw new Error('No consultora');
      const { error } = await supabase.from('empresas').insert({ ...form, consultora_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      setOpen(false);
      setForm({ razon_social: '', ruc: '', direccion: '', telefono: '', email: '', timbrado: '', numero_establecimiento: '001', punto_expedicion: '001', consultora_id: '' });
      toast.success('Empresa creada exitosamente');
    },
    onError: () => toast.error('Error al crear empresa'),
  });

  const filtered = empresas?.filter(e =>
    e.razon_social.toLowerCase().includes(search.toLowerCase()) || e.ruc.includes(search)
  );

  const statusColors: Record<string, string> = {
    activo: 'bg-success/10 text-success border-success/20',
    inactivo: 'bg-muted text-muted-foreground border-border',
    suspendido: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Empresas</h1>
          <p className="text-muted-foreground mt-1">Gestione las empresas clientes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nueva Empresa</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Empresa</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              {userRole?.role === 'super_admin' && (
                <div className="space-y-2">
                  <Label>Consultora</Label>
                  <Select value={form.consultora_id} onValueChange={v => setForm({ ...form, consultora_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar consultora" /></SelectTrigger>
                    <SelectContent>
                      {consultoras?.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Razón Social</Label>
                  <Input value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>RUC</Label>
                  <Input value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Timbrado</Label>
                  <Input value={form.timbrado} onChange={e => setForm({ ...form, timbrado: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Establecimiento</Label>
                  <Input value={form.numero_establecimiento} onChange={e => setForm({ ...form, numero_establecimiento: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Punto Expedición</Label>
                  <Input value={form.punto_expedicion} onChange={e => setForm({ ...form, punto_expedicion: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando...' : 'Crear Empresa'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o RUC..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card className="glass-panel">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razón Social</TableHead>
                <TableHead>RUC</TableHead>
                <TableHead>Consultora</TableHead>
                <TableHead>Timbrado</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay empresas registradas</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered?.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-foreground">{e.razon_social}</TableCell>
                    <TableCell className="font-mono text-sm">{e.ruc}</TableCell>
                    <TableCell>{(e.consultoras as any)?.nombre || '—'}</TableCell>
                    <TableCell className="font-mono text-sm">{e.timbrado || '—'}</TableCell>
                    <TableCell><Badge className={statusColors[e.estado]}>{e.estado}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmpresasPage;
