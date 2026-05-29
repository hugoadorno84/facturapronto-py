export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          activo: boolean
          created_at: string
          direccion: string | null
          email: string | null
          empresa_id: string
          id: string
          nombre: string
          plazo_pago_dias: number
          ruc: string
          sucursal: string | null
          telefono: string | null
          tipo_documento: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          nombre: string
          plazo_pago_dias?: number
          ruc: string
          sucursal?: string | null
          telefono?: string | null
          tipo_documento?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
          plazo_pago_dias?: number
          ruc?: string
          sucursal?: string | null
          telefono?: string | null
          tipo_documento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      consultoras: {
        Row: {
          created_at: string
          direccion: string | null
          email: string | null
          estado: Database["public"]["Enums"]["entity_status"]
          id: string
          max_empresas: number | null
          nombre: string
          plan: string | null
          ruc: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["entity_status"]
          id?: string
          max_empresas?: number | null
          nombre: string
          plan?: string | null
          ruc: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["entity_status"]
          id?: string
          max_empresas?: number | null
          nombre?: string
          plan?: string | null
          ruc?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          consultora_id: string
          created_at: string
          direccion: string | null
          email: string | null
          estado: Database["public"]["Enums"]["entity_status"]
          fecha_fin_timbrado: string | null
          fecha_inicio_timbrado: string | null
          id: string
          numero_establecimiento: string | null
          punto_expedicion: string | null
          razon_social: string
          ruc: string
          telefono: string | null
          timbrado: string | null
          updated_at: string
        }
        Insert: {
          consultora_id: string
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["entity_status"]
          fecha_fin_timbrado?: string | null
          fecha_inicio_timbrado?: string | null
          id?: string
          numero_establecimiento?: string | null
          punto_expedicion?: string | null
          razon_social: string
          ruc: string
          telefono?: string | null
          timbrado?: string | null
          updated_at?: string
        }
        Update: {
          consultora_id?: string
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["entity_status"]
          fecha_fin_timbrado?: string | null
          fecha_inicio_timbrado?: string | null
          id?: string
          numero_establecimiento?: string | null
          punto_expedicion?: string | null
          razon_social?: string
          ruc?: string
          telefono?: string | null
          timbrado?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_consultora_id_fkey"
            columns: ["consultora_id"]
            isOneToOne: false
            referencedRelation: "consultoras"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_calendario: {
        Row: {
          created_at: string
          created_by: string | null
          descripcion: string | null
          empresa_id: string
          factura_id: string | null
          fecha: string
          hora: string | null
          id: string
          orden_id: string | null
          pago_id: string | null
          presupuesto_id: string | null
          tipo: Database["public"]["Enums"]["evento_tipo"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          empresa_id: string
          factura_id?: string | null
          fecha: string
          hora?: string | null
          id?: string
          orden_id?: string | null
          pago_id?: string | null
          presupuesto_id?: string | null
          tipo?: Database["public"]["Enums"]["evento_tipo"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          empresa_id?: string
          factura_id?: string | null
          fecha?: string
          hora?: string | null
          id?: string
          orden_id?: string | null
          pago_id?: string | null
          presupuesto_id?: string | null
          tipo?: Database["public"]["Enums"]["evento_tipo"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_calendario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_calendario_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_calendario_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_calendario_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_calendario_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      factura_items: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string
          factura_id: string
          id: string
          iva: Database["public"]["Enums"]["iva_type"]
          precio_unitario: number
          producto_id: string | null
          subtotal: number
        }
        Insert: {
          cantidad?: number
          created_at?: string
          descripcion: string
          factura_id: string
          id?: string
          iva?: Database["public"]["Enums"]["iva_type"]
          precio_unitario?: number
          producto_id?: string | null
          subtotal?: number
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          factura_id?: string
          id?: string
          iva?: Database["public"]["Enums"]["iva_type"]
          precio_unitario?: number
          producto_id?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "factura_items_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factura_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      factura_series: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          empresa_id: string
          fecha_fin_timbrado: string | null
          fecha_inicio_timbrado: string | null
          id: string
          numero_actual: number
          predeterminada: boolean
          timbrado: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          empresa_id: string
          fecha_fin_timbrado?: string | null
          fecha_inicio_timbrado?: string | null
          id?: string
          numero_actual?: number
          predeterminada?: boolean
          timbrado?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          empresa_id?: string
          fecha_fin_timbrado?: string | null
          fecha_inicio_timbrado?: string | null
          id?: string
          numero_actual?: number
          predeterminada?: boolean
          timbrado?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      facturas: {
        Row: {
          cliente_id: string
          condicion: string | null
          created_at: string
          created_by: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["invoice_status"]
          fecha: string
          fx_rate: number
          id: string
          moneda: string
          numero: string
          observacion: string | null
          serie_id: string | null
          subtotal: number
          timbrado: string | null
          total: number
          total_iva: number
          updated_at: string
        }
        Insert: {
          cliente_id: string
          condicion?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["invoice_status"]
          fecha?: string
          fx_rate?: number
          id?: string
          moneda?: string
          numero: string
          observacion?: string | null
          serie_id?: string | null
          subtotal?: number
          timbrado?: string | null
          total?: number
          total_iva?: number
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          condicion?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["invoice_status"]
          fecha?: string
          fx_rate?: number
          id?: string
          moneda?: string
          numero?: string
          observacion?: string | null
          serie_id?: string | null
          subtotal?: number
          timbrado?: string | null
          total?: number
          total_iva?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_rates: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          rate: number
          rate_date: string
          source: string | null
        }
        Insert: {
          created_at?: string
          currency_code: string
          id?: string
          rate: number
          rate_date?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          rate?: number
          rate_date?: string
          source?: string | null
        }
        Relationships: []
      }
      ordenes_servicio: {
        Row: {
          created_at: string
          created_by: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["orden_status"]
          factura_id: string | null
          fecha_programada: string | null
          fx_rate: number
          id: string
          moneda: string
          monto: number
          monto_pyg: number
          notas: string | null
          proyecto_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["orden_status"]
          factura_id?: string | null
          fecha_programada?: string | null
          fx_rate?: number
          id?: string
          moneda?: string
          monto?: number
          monto_pyg?: number
          notas?: string | null
          proyecto_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["orden_status"]
          factura_id?: string | null
          fecha_programada?: string | null
          fx_rate?: number
          id?: string
          moneda?: string
          monto?: number
          monto_pyg?: number
          notas?: string | null
          proyecto_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_servicio_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_servicio_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_servicio_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string | null
          empresa_id: string
          factura_id: string | null
          fecha: string
          id: string
          metodo: string | null
          moneda: string
          monto: number
          observacion: string | null
          proveedor_id: string | null
          referencia: string | null
          tipo: Database["public"]["Enums"]["pago_tipo"]
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id: string
          factura_id?: string | null
          fecha?: string
          id?: string
          metodo?: string | null
          moneda?: string
          monto?: number
          observacion?: string | null
          proveedor_id?: string | null
          referencia?: string | null
          tipo: Database["public"]["Enums"]["pago_tipo"]
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          factura_id?: string | null
          fecha?: string
          id?: string
          metodo?: string | null
          moneda?: string
          monto?: number
          observacion?: string | null
          proveedor_id?: string | null
          referencia?: string | null
          tipo?: Database["public"]["Enums"]["pago_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuesto_items: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string
          id: string
          iva: Database["public"]["Enums"]["iva_type"]
          precio_unitario: number
          presupuesto_id: string
          producto_id: string | null
          subtotal: number
        }
        Insert: {
          cantidad?: number
          created_at?: string
          descripcion: string
          id?: string
          iva?: Database["public"]["Enums"]["iva_type"]
          precio_unitario?: number
          presupuesto_id: string
          producto_id?: string | null
          subtotal?: number
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          iva?: Database["public"]["Enums"]["iva_type"]
          precio_unitario?: number
          presupuesto_id?: string
          producto_id?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_items_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuestos: {
        Row: {
          cliente_id: string
          condicion: string | null
          created_at: string
          created_by: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["presupuesto_status"]
          fecha: string
          fx_rate: number
          id: string
          moneda: string
          numero: string
          observacion: string | null
          subtotal: number
          total: number
          total_iva: number
          updated_at: string
          valido_hasta: string | null
        }
        Insert: {
          cliente_id: string
          condicion?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["presupuesto_status"]
          fecha?: string
          fx_rate?: number
          id?: string
          moneda?: string
          numero: string
          observacion?: string | null
          subtotal?: number
          total?: number
          total_iva?: number
          updated_at?: string
          valido_hasta?: string | null
        }
        Update: {
          cliente_id?: string
          condicion?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["presupuesto_status"]
          fecha?: string
          fx_rate?: number
          id?: string
          moneda?: string
          numero?: string
          observacion?: string | null
          subtotal?: number
          total?: number
          total_iva?: number
          updated_at?: string
          valido_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean | null
          codigo: string | null
          created_at: string
          descripcion: string
          empresa_id: string
          id: string
          iva: Database["public"]["Enums"]["iva_type"]
          precio: number
          unidad_medida: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string
          descripcion: string
          empresa_id: string
          id?: string
          iva?: Database["public"]["Enums"]["iva_type"]
          precio?: number
          unidad_medida?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string
          descripcion?: string
          empresa_id?: string
          id?: string
          iva?: Database["public"]["Enums"]["iva_type"]
          precio?: number
          unidad_medida?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          activo: boolean
          created_at: string
          direccion: string | null
          email: string | null
          empresa_id: string
          id: string
          nombre: string
          plazo_pago_dias: number
          ruc: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          nombre: string
          plazo_pago_dias?: number
          ruc?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
          plazo_pago_dias?: number
          ruc?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proyectos: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["proyecto_status"]
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["proyecto_status"]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["proyecto_status"]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          consultora_id: string | null
          created_at: string
          empresa_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          consultora_id?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          consultora_id?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_consultora_id_fkey"
            columns: ["consultora_id"]
            isOneToOne: false
            referencedRelation: "consultoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_consultora_id: { Args: { _user_id: string }; Returns: string }
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_factura_estado_from_pagos: {
        Args: { _factura_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "consultora" | "empresa"
      entity_status: "activo" | "inactivo" | "suspendido"
      evento_tipo:
        | "general"
        | "cobro"
        | "pago"
        | "servicio"
        | "facturacion"
        | "presupuesto"
      invoice_status:
        | "borrador"
        | "emitida"
        | "anulada"
        | "pagada"
        | "pago_parcial"
      iva_type: "10" | "5" | "exento"
      orden_status: "abierta" | "en_progreso" | "completada" | "cancelada"
      pago_tipo: "cobro" | "pago"
      presupuesto_status:
        | "borrador"
        | "enviado"
        | "aprobado"
        | "aceptado"
        | "rechazado"
        | "expirado"
      proyecto_status: "abierto" | "en_pausa" | "cerrado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "consultora", "empresa"],
      entity_status: ["activo", "inactivo", "suspendido"],
      evento_tipo: [
        "general",
        "cobro",
        "pago",
        "servicio",
        "facturacion",
        "presupuesto",
      ],
      invoice_status: [
        "borrador",
        "emitida",
        "anulada",
        "pagada",
        "pago_parcial",
      ],
      iva_type: ["10", "5", "exento"],
      orden_status: ["abierta", "en_progreso", "completada", "cancelada"],
      pago_tipo: ["cobro", "pago"],
      presupuesto_status: [
        "borrador",
        "enviado",
        "aprobado",
        "aceptado",
        "rechazado",
        "expirado",
      ],
      proyecto_status: ["abierto", "en_pausa", "cerrado"],
    },
  },
} as const
