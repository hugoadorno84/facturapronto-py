export interface PlantillaFactura {
  logo_url?: string | null;
  color_primario: string;
  titulo_documento: string;
  mostrar_timbrado: boolean;
  mostrar_observacion: boolean;
  mostrar_datos_empresa: boolean;
  pie_pagina?: string | null;
  notas_legales?: string | null;
  email_asunto: string;
  email_cuerpo: string;
}

export const defaultPlantilla: PlantillaFactura = {
  logo_url: '',
  color_primario: '#2563eb',
  titulo_documento: 'FACTURA',
  mostrar_timbrado: true,
  mostrar_observacion: true,
  mostrar_datos_empresa: true,
  pie_pagina: 'Gracias por su preferencia.',
  notas_legales: '',
  email_asunto: 'Factura {numero}',
  email_cuerpo: 'Estimado cliente, adjuntamos su factura {numero}.',
};

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const num = (n: unknown) =>
  new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));

export interface FacturaPrintData {
  factura: any;
  items: any[];
  cliente?: any;
  empresa?: any;
  plantilla: PlantillaFactura;
}

export function resolveVars(text: string, factura: any, cliente?: any) {
  return (text || '')
    .replace(/\{numero\}/g, factura?.numero ?? '')
    .replace(/\{cliente\}/g, cliente?.nombre ?? '')
    .replace(/\{total\}/g, `${num(factura?.total)} ${factura?.moneda || 'PYG'}`)
    .replace(/\{fecha\}/g, factura?.fecha ?? '');
}

export function buildFacturaHtml({ factura, items, cliente, empresa, plantilla }: FacturaPrintData) {
  const p = { ...defaultPlantilla, ...plantilla };
  const moneda = factura.moneda || 'PYG';

  const rows = items
    .map(
      (it) => `<tr>
        <td>${esc(it.descripcion)}</td>
        <td class="c">${esc(Number(it.cantidad))}</td>
        <td class="r">${num(it.precio_unitario)}</td>
        <td class="c">${it.iva === 'exento' ? 'Exento' : `${esc(it.iva)}%`}</td>
        <td class="r">${num(it.subtotal)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" />
<title>${esc(p.titulo_documento)} ${esc(factura.numero)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; padding: 32px; font-size: 12px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${esc(p.color_primario)}; padding-bottom: 16px; }
  .logo { max-height: 64px; max-width: 200px; }
  .doc-title { color: ${esc(p.color_primario)}; font-size: 22px; font-weight: bold; margin: 0; text-align: right; }
  .muted { color: #6b7280; }
  h2 { font-size: 13px; margin: 20px 0 6px; color: ${esc(p.color_primario)}; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: ${esc(p.color_primario)}; color: #fff; text-align: left; padding: 8px; font-size: 11px; }
  td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; }
  td.r, th.r { text-align: right; } td.c, th.c { text-align: center; }
  .totals { margin-top: 12px; width: 260px; margin-left: auto; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .total { border-top: 2px solid ${esc(p.color_primario)}; font-size: 14px; font-weight: bold; }
  footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #6b7280; white-space: pre-line; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <div class="head">
    <div>
      ${p.logo_url ? `<img class="logo" src="${esc(p.logo_url)}" alt="Logo" />` : ''}
      ${
        p.mostrar_datos_empresa
          ? `<div style="margin-top:8px">
              <strong>${esc(empresa?.razon_social || '')}</strong><br/>
              ${empresa?.ruc ? `RUC: ${esc(empresa.ruc)}<br/>` : ''}
              ${empresa?.direccion ? `${esc(empresa.direccion)}<br/>` : ''}
              ${empresa?.telefono ? `Tel: ${esc(empresa.telefono)} ` : ''}${empresa?.email ? esc(empresa.email) : ''}
            </div>`
          : ''
      }
    </div>
    <div>
      <p class="doc-title">${esc(p.titulo_documento)}</p>
      <div style="text-align:right">
        <strong>Nº ${esc(factura.numero)}</strong><br/>
        Fecha: ${esc(factura.fecha)}<br/>
        ${p.mostrar_timbrado && (factura.timbrado || empresa?.timbrado) ? `Timbrado: ${esc(factura.timbrado || empresa?.timbrado)}<br/>` : ''}
        Condición: ${esc(factura.condicion || '')}
      </div>
    </div>
  </div>

  <h2>Datos del cliente</h2>
  <div class="grid">
    <div><span class="muted">Nombre:</span> ${esc(cliente?.nombre || '')}</div>
    <div><span class="muted">RUC/CI:</span> ${esc(cliente?.ruc || '')}</div>
    <div><span class="muted">Sucursal:</span> ${esc(cliente?.sucursal || '—')}</div>
    <div><span class="muted">Dirección:</span> ${esc(cliente?.direccion || '—')}</div>
    <div><span class="muted">Teléfono:</span> ${esc(cliente?.telefono || '—')}</div>
    <div><span class="muted">Factura electrónica:</span> ${cliente?.factura_electronica ? 'Sí' : 'No'}</div>
  </div>

  <table>
    <thead><tr>
      <th>Descripción</th><th class="c">Cant.</th><th class="r">Precio</th><th class="c">IVA</th><th class="r">Subtotal</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${num(factura.subtotal)}</span></div>
    <div><span>IVA</span><span>${num(factura.total_iva)}</span></div>
    <div class="total"><span>Total</span><span>${num(factura.total)} ${esc(moneda)}</span></div>
  </div>

  ${p.mostrar_observacion && factura.observacion ? `<h2>Observación</h2><div>${esc(factura.observacion)}</div>` : ''}
  ${p.notas_legales ? `<footer>${esc(p.notas_legales)}</footer>` : ''}
  ${p.pie_pagina ? `<footer>${esc(p.pie_pagina)}</footer>` : ''}
</body></html>`;
}

export function printFacturaHtml(html: string) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
  return true;
}

export function buildMailtoLink(email: string, asunto: string, cuerpo: string) {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
