-- Trigger to update factura estado based on associated pagos
CREATE OR REPLACE FUNCTION public.update_factura_estado_from_pagos(_factura_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_pagado numeric;
  factura_total numeric;
  current_estado invoice_status;
  new_estado invoice_status;
BEGIN
  IF _factura_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(monto), 0) INTO total_pagado
  FROM public.pagos
  WHERE factura_id = _factura_id AND tipo = 'cobro';

  SELECT total, estado INTO factura_total, current_estado
  FROM public.facturas WHERE id = _factura_id;

  IF factura_total IS NULL THEN RETURN; END IF;
  IF current_estado = 'anulada' OR current_estado = 'borrador' THEN RETURN; END IF;

  IF total_pagado >= factura_total AND factura_total > 0 THEN
    new_estado := 'pagada';
  ELSIF total_pagado > 0 THEN
    new_estado := 'pago_parcial';
  ELSE
    new_estado := 'emitida';
  END IF;

  IF new_estado <> current_estado THEN
    UPDATE public.facturas SET estado = new_estado, updated_at = now()
    WHERE id = _factura_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_pagos_update_factura_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_factura_estado_from_pagos(OLD.factura_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.factura_id IS DISTINCT FROM NEW.factura_id THEN
      PERFORM public.update_factura_estado_from_pagos(OLD.factura_id);
    END IF;
    PERFORM public.update_factura_estado_from_pagos(NEW.factura_id);
    RETURN NEW;
  ELSE
    PERFORM public.update_factura_estado_from_pagos(NEW.factura_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS pagos_update_factura_estado ON public.pagos;
CREATE TRIGGER pagos_update_factura_estado
AFTER INSERT OR UPDATE OR DELETE ON public.pagos
FOR EACH ROW EXECUTE FUNCTION public.trg_pagos_update_factura_estado();