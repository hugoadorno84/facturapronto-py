import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Palette, Printer } from 'lucide-react';
import { toast } from 'sonner';
import {
  buildFacturaHtml, defaultPlantilla, printFacturaHtml, PlantillaFactura,
} from '@/lib/facturaTemplate';

const PlantillaFacturaPage = () => {
  const { userRole } = useAuth();
  const qc = useQueryClient();
  const empresaId = userRole?.empresa_id;
  const [form, setForm] = useState<PlantillaFactura>(defaultPlantilla);

  const { data: plantilla } = useQuery({
    queryKey: ['factura_plantilla', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factura_plantillas').select('*').eq('empresa_id', empresaId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: empresa } = useQuery({
    queryKey: ['empresa', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('*').eq('id', empresaId!).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (plantilla) setForm({ ...defaultPlantilla, ...plantilla } as PlantillaFactura);
  }, [plantilla]);

  const save = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Sin empresa');
      const payload = {
        empresa_id: empresaId,
        logo_url: form.logo_url || null,
        color_primario: form.color_primario,
        titulo_documento: form.titulo_documento,
        mostrar_timbrado: form.mostrar_timbrado,
        mostrar_observacion: form.mostrar_observacion,
        mostrar_datos_empresa: form.mostrar_datos_empresa,
        pie_pagina: form.pie_pagina || null,
        notas_legales: form.notas_legales || null,
        email_asunto: form.email_asunto,
        email_cuerpo: form.email_cuerpo,
      };
      const { error } = await supabase
        .from('factura_plantillas').upsert(payload, { onConflict: 'empresa_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factura_plantilla'] });
      toast.success('Formato de factura guardado');
    },
    onError: (e: any) => toast.error(e.message || 'Error al guardar'),
  });

  const preview = () => {
    const html = buildFacturaHtml({
      plantilla: form,
      empresa,
      cliente: {
        nombre: 'Cliente de Ejemplo S.A.', ruc: '80012345-6', sucursal: 'Casa Central',
        direccion: 'Avda. Mcal. López 1234', telefono: '0981 123 456', factura_electronica: true,
      },
      factura: {
        numero: '001-001-0000001', fecha: new Date().toISOString().slice(0, 10),
        condicion: 'contado', moneda: 'PYG', subtotal: 1000000, total_iva: 100000,
        total: 1100000, observacion: 'Ejemplo de observación.',
      },
      items: [
        { descripcion: 'Servicio de consultoría', cantidad: 1, precio_unitario: 700000, iva: '10', subtotal: 770000 },
        { descripcion: 'Soporte mensual', cantidad: 1, precio_unitario: 300000, iva: '10', subtotal: 330000 },
      ],
    });
    if (!printFacturaHtml(html)) toast.error('Permita las ventanas emergentes para ver la vista previa');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Formato de factura</h1>
          <p className="text-muted-foreground mt-1">Personalice la impresión y el envío por email de sus facturas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={preview}><Printer className="h-4 w-4 mr-2" /> Vista previa</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Palette className="h-5 w-5 text-primary" /> Diseño del documento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Título del documento</Label>
              <Input value={form.titulo_documento}
                onChange={(e) => setForm({ ...form, titulo_documento: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>URL del logo</Label>
              <Input value={form.logo_url || ''} placeholder="https://..."
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Color principal</Label>
              <div className="flex gap-2">
                <Input type="color" className="w-16 p-1" value={form.color_primario}
                  onChange={(e) => setForm({ ...form, color_primario: e.target.value })} />
                <Input value={form.color_primario}
                  onChange={(e) => setForm({ ...form, color_primario: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Mostrar datos de la empresa</Label>
              <Switch checked={form.mostrar_datos_empresa}
                onCheckedChange={(v) => setForm({ ...form, mostrar_datos_empresa: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Mostrar timbrado</Label>
              <Switch checked={form.mostrar_timbrado}
                onCheckedChange={(v) => setForm({ ...form, mostrar_timbrado: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Mostrar observación</Label>
              <Switch checked={form.mostrar_observacion}
                onCheckedChange={(v) => setForm({ ...form, mostrar_observacion: v })} />
            </div>
            <div className="space-y-2">
              <Label>Pie de página</Label>
              <Textarea rows={2} value={form.pie_pagina || ''}
                onChange={(e) => setForm({ ...form, pie_pagina: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notas legales</Label>
              <Textarea rows={2} value={form.notas_legales || ''}
                onChange={(e) => setForm({ ...form, notas_legales: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-foreground">Envío por email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Variables disponibles: <code>{'{numero}'}</code>, <code>{'{cliente}'}</code>,{' '}
              <code>{'{total}'}</code>, <code>{'{fecha}'}</code>.
            </p>
            <div className="space-y-2">
              <Label>Asunto</Label>
              <Input value={form.email_asunto}
                onChange={(e) => setForm({ ...form, email_asunto: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cuerpo del mensaje</Label>
              <Textarea rows={8} value={form.email_cuerpo}
                onChange={(e) => setForm({ ...form, email_cuerpo: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlantillaFacturaPage;
