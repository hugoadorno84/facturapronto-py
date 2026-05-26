import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  factura: any;
}

const statusLabels: Record<string, string> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  anulada: 'Anulada',
  pagada: 'Pagada',
  pago_parcial: 'Pago parcial',
};

export function InvoiceDetailDialog({ open, onOpenChange, factura }: Props) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (factura && open) {
      supabase.from('factura_items').select('*').eq('factura_id', factura.id)
        .then(({ data }) => setItems(data || []));
    }
  }, [factura, open]);

  if (!factura) return null;

  const formatNum = (n: number) =>
    new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Factura {factura.numero}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{factura.clientes?.nombre}</span></div>
          <div><span className="text-muted-foreground">Sucursal:</span> {factura.clientes?.sucursal || '—'}</div>
          <div><span className="text-muted-foreground">Fecha:</span> {factura.fecha}</div>
          <div><span className="text-muted-foreground">Condición:</span> <span className="capitalize">{factura.condicion}</span></div>
          <div><span className="text-muted-foreground">Moneda:</span> {factura.moneda || 'PYG'}</div>
          <div><span className="text-muted-foreground">Estado:</span> <Badge variant="outline">{statusLabels[factura.estado] || factura.estado}</Badge></div>
        </div>

        <div className="rounded-lg border border-border overflow-auto mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-20">Cant.</TableHead>
                <TableHead className="w-32 text-right">Precio</TableHead>
                <TableHead className="w-20">IVA</TableHead>
                <TableHead className="w-32 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.descripcion}</TableCell>
                  <TableCell>{Number(it.cantidad)}</TableCell>
                  <TableCell className="text-right font-mono">{formatNum(it.precio_unitario)}</TableCell>
                  <TableCell>{it.iva === 'exento' ? 'Exento' : `${it.iva}%`}</TableCell>
                  <TableCell className="text-right font-mono">{formatNum(it.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end mt-4">
          <div className="text-sm space-y-1 text-right">
            <div>Subtotal: <span className="font-mono font-medium">{formatNum(factura.subtotal)}</span></div>
            <div>IVA: <span className="font-mono font-medium">{formatNum(factura.total_iva)}</span></div>
            <div className="text-base font-bold">
              Total: <span className="font-mono">{formatNum(factura.total)} {factura.moneda || 'PYG'}</span>
            </div>
          </div>
        </div>

        {factura.observacion && (
          <div className="text-sm mt-2">
            <div className="text-muted-foreground">Observación:</div>
            <div>{factura.observacion}</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
