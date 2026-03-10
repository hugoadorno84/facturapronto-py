# FacturaProonto - Arquitectura On-Premise

## Índice
1. [Esquema PostgreSQL](#1-esquema-postgresql)
2. [API REST (Node.js/Express)](#2-api-rest)
3. [Autenticación JWT](#3-autenticación-jwt)
4. [Realtime con WebSocket](#4-realtime-websocket)
5. [Docker Compose](#5-docker-compose)
6. [Variables de entorno](#6-variables-de-entorno)
7. [Conexión desde el Frontend](#7-conexión-frontend)

---

## 1. Esquema PostgreSQL

```sql
-- ============================================
-- EXTENSIONES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE app_role AS ENUM ('super_admin', 'consultora', 'empresa');
CREATE TYPE entity_status AS ENUM ('activo', 'inactivo', 'suspendido');
CREATE TYPE invoice_status AS ENUM ('borrador', 'emitida', 'anulada', 'pagada');
CREATE TYPE iva_type AS ENUM ('10', '5', 'exento');

-- ============================================
-- TABLA: users (reemplaza auth.users de Supabase)
-- ============================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email_confirmed_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON public.users(email);

-- ============================================
-- TABLA: profiles
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- ============================================
-- TABLA: user_roles
-- ============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    consultora_id UUID,
    empresa_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_consultora_id ON public.user_roles(consultora_id);
CREATE INDEX idx_user_roles_empresa_id ON public.user_roles(empresa_id);

-- ============================================
-- TABLA: consultoras
-- ============================================
CREATE TABLE public.consultoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    ruc TEXT NOT NULL,
    direccion TEXT,
    email TEXT,
    telefono TEXT,
    estado entity_status NOT NULL DEFAULT 'activo',
    max_empresas INTEGER DEFAULT 5,
    plan TEXT DEFAULT 'basico',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_consultoras_ruc ON public.consultoras(ruc);

-- ============================================
-- TABLA: empresas
-- ============================================
CREATE TABLE public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultora_id UUID NOT NULL REFERENCES public.consultoras(id) ON DELETE RESTRICT,
    razon_social TEXT NOT NULL,
    ruc TEXT NOT NULL,
    direccion TEXT,
    email TEXT,
    telefono TEXT,
    estado entity_status NOT NULL DEFAULT 'activo',
    timbrado TEXT,
    fecha_inicio_timbrado DATE,
    fecha_fin_timbrado DATE,
    numero_establecimiento TEXT DEFAULT '001',
    punto_expedicion TEXT DEFAULT '001',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_empresas_consultora_id ON public.empresas(consultora_id);
CREATE UNIQUE INDEX idx_empresas_ruc ON public.empresas(ruc);

-- Foreign keys para user_roles (después de crear consultoras y empresas)
ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_consultora_id_fkey
    FOREIGN KEY (consultora_id) REFERENCES public.consultoras(id) ON DELETE SET NULL;

ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;

-- ============================================
-- TABLA: clientes
-- ============================================
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    ruc TEXT NOT NULL,
    direccion TEXT,
    email TEXT,
    telefono TEXT,
    tipo_documento TEXT DEFAULT 'RUC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_empresa_id ON public.clientes(empresa_id);

-- ============================================
-- TABLA: productos
-- ============================================
CREATE TABLE public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    codigo TEXT,
    descripcion TEXT NOT NULL,
    precio NUMERIC NOT NULL DEFAULT 0,
    iva iva_type NOT NULL DEFAULT '10',
    unidad_medida TEXT DEFAULT 'UNI',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_productos_empresa_id ON public.productos(empresa_id);

-- ============================================
-- TABLA: facturas
-- ============================================
CREATE TABLE public.facturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    created_by UUID REFERENCES public.users(id),
    numero TEXT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    timbrado TEXT,
    condicion TEXT DEFAULT 'contado',
    estado invoice_status NOT NULL DEFAULT 'borrador',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    total_iva NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_facturas_empresa_id ON public.facturas(empresa_id);
CREATE INDEX idx_facturas_cliente_id ON public.facturas(cliente_id);
CREATE INDEX idx_facturas_created_by ON public.facturas(created_by);
CREATE UNIQUE INDEX idx_facturas_numero_empresa ON public.facturas(empresa_id, numero);

-- ============================================
-- TABLA: factura_items
-- ============================================
CREATE TABLE public.factura_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id UUID NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES public.productos(id),
    descripcion TEXT NOT NULL,
    cantidad NUMERIC NOT NULL DEFAULT 1,
    precio_unitario NUMERIC NOT NULL DEFAULT 0,
    iva iva_type NOT NULL DEFAULT '10',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_factura_items_factura_id ON public.factura_items(factura_id);

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para verificar rol de usuario
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    );
$$;

-- Función para obtener consultora_id del usuario
CREATE OR REPLACE FUNCTION public.get_user_consultora_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT consultora_id FROM public.user_roles
    WHERE user_id = _user_id AND consultora_id IS NOT NULL
    LIMIT 1;
$$;

-- Función para obtener empresa_id del usuario
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT empresa_id FROM public.user_roles
    WHERE user_id = _user_id AND empresa_id IS NOT NULL
    LIMIT 1;
$$;

-- ============================================
-- TRIGGERS: auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_consultoras_updated_at BEFORE UPDATE ON public.consultoras
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_empresas_updated_at BEFORE UPDATE ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON public.productos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_facturas_updated_at BEFORE UPDATE ON public.facturas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- TRIGGERS: notificaciones realtime
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_table_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    channel TEXT;
    empresa_uuid UUID;
    consultora_uuid UUID;
BEGIN
    -- Determinar empresa_id según la tabla
    IF TG_TABLE_NAME = 'facturas' OR TG_TABLE_NAME = 'clientes' OR TG_TABLE_NAME = 'productos' THEN
        empresa_uuid := COALESCE(NEW.empresa_id, OLD.empresa_id);
    ELSIF TG_TABLE_NAME = 'factura_items' THEN
        SELECT f.empresa_id INTO empresa_uuid
        FROM public.facturas f
        WHERE f.id = COALESCE(NEW.factura_id, OLD.factura_id);
    END IF;

    -- Obtener consultora_id de la empresa
    IF empresa_uuid IS NOT NULL THEN
        SELECT e.consultora_id INTO consultora_uuid
        FROM public.empresas e WHERE e.id = empresa_uuid;
    END IF;

    payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'action', TG_OP,
        'data', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE row_to_json(NEW)::jsonb END,
        'empresa_id', empresa_uuid,
        'consultora_id', consultora_uuid
    );

    -- Notificar al canal de la empresa
    IF empresa_uuid IS NOT NULL THEN
        PERFORM pg_notify('empresa_' || empresa_uuid::text, payload::text);
    END IF;

    -- Notificar al canal de la consultora
    IF consultora_uuid IS NOT NULL THEN
        PERFORM pg_notify('consultora_' || consultora_uuid::text, payload::text);
    END IF;

    -- Notificar al canal global (super_admin)
    PERFORM pg_notify('global_changes', payload::text);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas relevantes
CREATE TRIGGER trg_facturas_notify AFTER INSERT OR UPDATE OR DELETE ON public.facturas
    FOR EACH ROW EXECUTE FUNCTION public.notify_table_changes();

CREATE TRIGGER trg_factura_items_notify AFTER INSERT OR UPDATE OR DELETE ON public.factura_items
    FOR EACH ROW EXECUTE FUNCTION public.notify_table_changes();

CREATE TRIGGER trg_clientes_notify AFTER INSERT OR UPDATE OR DELETE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.notify_table_changes();

CREATE TRIGGER trg_productos_notify AFTER INSERT OR UPDATE OR DELETE ON public.productos
    FOR EACH ROW EXECUTE FUNCTION public.notify_table_changes();

-- ============================================
-- SEED: usuario super_admin inicial
-- ============================================
-- Contraseña: Admin123! (cambiar inmediatamente en producción)
INSERT INTO public.users (id, email, password_hash, email_confirmed_at)
VALUES (
    gen_random_uuid(),
    'admin@facturapronto.com',
    crypt('Admin123!', gen_salt('bf', 12)),
    now()
);

INSERT INTO public.profiles (user_id, full_name, email)
SELECT id, 'Super Administrador', email FROM public.users WHERE email = 'admin@facturapronto.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin' FROM public.users WHERE email = 'admin@facturapronto.com';
```

---

## 2. API REST (Node.js/Express)

### Estructura de archivos del backend

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # Pool de conexión PostgreSQL
│   ├── middleware/
│   │   ├── auth.ts              # Middleware JWT
│   │   └── tenancy.ts           # Middleware multi-tenant
│   ├── routes/
│   │   ├── auth.routes.ts       # Login, refresh token
│   │   ├── users.routes.ts      # CRUD usuarios
│   │   ├── consultoras.routes.ts
│   │   ├── empresas.routes.ts
│   │   ├── clientes.routes.ts
│   │   ├── productos.routes.ts
│   │   └── facturas.routes.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── realtime.service.ts  # WebSocket + LISTEN/NOTIFY
│   │   └── tenancy.service.ts
│   ├── types/
│   │   └── index.ts
│   └── app.ts                   # Entry point
├── package.json
├── tsconfig.json
└── Dockerfile
```

### Código principal

```typescript
// src/config/database.ts
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'facturapronto',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  role: 'super_admin' | 'consultora' | 'empresa';
  consultora_id: string | null;
  empresa_id: string | null;
}

declare global {
  namespace Express {
    interface Request { user?: AuthUser; }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Middleware para verificar roles
export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }
    next();
  };
}

// src/middleware/tenancy.ts
import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

// Filtra automáticamente por empresa_id según el rol del usuario
export function tenancyFilter(tableName: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user!;

    if (user.role === 'super_admin') {
      // Sin filtro, ve todo
      req.tenancyWhere = '';
      req.tenancyParams = [];
    } else if (user.role === 'consultora') {
      // Ve datos de todas las empresas de su consultora
      const result = await pool.query(
        'SELECT id FROM empresas WHERE consultora_id = $1',
        [user.consultora_id]
      );
      const empresaIds = result.rows.map(r => r.id);
      if (empresaIds.length === 0) {
        req.tenancyWhere = `AND ${tableName}.empresa_id = '00000000-0000-0000-0000-000000000000'`;
        req.tenancyParams = [];
      } else {
        const placeholders = empresaIds.map((_, i) => `$${i + 1}`).join(', ');
        req.tenancyWhere = `AND ${tableName}.empresa_id IN (${placeholders})`;
        req.tenancyParams = empresaIds;
      }
    } else if (user.role === 'empresa') {
      req.tenancyWhere = `AND ${tableName}.empresa_id = $1`;
      req.tenancyParams = [user.empresa_id];
    }

    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      tenancyWhere?: string;
      tenancyParams?: any[];
    }
  }
}

// src/routes/auth.routes.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Obtener rol
    const roleResult = await pool.query(
      'SELECT role, consultora_id, empresa_id FROM user_roles WHERE user_id = $1',
      [user.id]
    );
    const roleData = roleResult.rows[0];
    if (!roleData) return res.status(403).json({ error: 'Usuario sin rol asignado' });

    // Obtener perfil
    const profileResult = await pool.query(
      'SELECT full_name, avatar_url FROM profiles WHERE user_id = $1',
      [user.id]
    );
    const profile = profileResult.rows[0];

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: roleData.role,
      consultora_id: roleData.consultora_id,
      empresa_id: roleData.empresa_id,
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
      expiresIn: '8h',
    });

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    // Actualizar last_sign_in
    await pool.query(
      'UPDATE users SET last_sign_in_at = now() WHERE id = $1',
      [user.id]
    );

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: roleData.role,
        consultora_id: roleData.consultora_id,
        empresa_id: roleData.empresa_id,
        profile: {
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET!) as { id: string };

    const roleResult = await pool.query(
      'SELECT role, consultora_id, empresa_id FROM user_roles WHERE user_id = $1',
      [decoded.id]
    );
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [decoded.id]);

    const roleData = roleResult.rows[0];
    const user = userResult.rows[0];

    const accessToken = jwt.sign(
      { id: decoded.id, email: user.email, ...roleData },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    res.json({ access_token: accessToken });
  } catch {
    res.status(401).json({ error: 'Refresh token inválido' });
  }
});

router.post('/change-password', async (req, res) => {
  // Requiere auth middleware antes
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user!.id;

    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const valid = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);

    res.json({ message: 'Contraseña actualizada' });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;

// src/routes/facturas.routes.ts (ejemplo CRUD con multi-tenancy)
import { Router } from 'express';
import { pool } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { tenancyFilter } from '../middleware/tenancy';

const router = Router();

router.use(authMiddleware);

// Listar facturas (filtrado automáticamente por tenant)
router.get('/', tenancyFilter('facturas'), async (req, res) => {
  try {
    const query = `
      SELECT f.*, c.nombre AS cliente_nombre, c.ruc AS cliente_ruc
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      WHERE 1=1 ${req.tenancyWhere}
      ORDER BY f.created_at DESC
    `;
    const result = await pool.query(query, req.tenancyParams);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
});

// Crear factura
router.post('/', async (req, res) => {
  const user = req.user!;
  const { cliente_id, numero, fecha, timbrado, condicion, observacion, items } = req.body;

  // Verificar permisos
  let empresa_id = req.body.empresa_id;
  if (user.role === 'empresa') {
    empresa_id = user.empresa_id;
  } else if (user.role === 'consultora') {
    // Verificar que la empresa pertenece a su consultora
    const check = await pool.query(
      'SELECT id FROM empresas WHERE id = $1 AND consultora_id = $2',
      [empresa_id, user.consultora_id]
    );
    if (check.rows.length === 0) return res.status(403).json({ error: 'Empresa no autorizada' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insertar factura
    const facturaResult = await client.query(
      `INSERT INTO facturas (empresa_id, cliente_id, created_by, numero, fecha, timbrado, condicion, observacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [empresa_id, cliente_id, user.id, numero, fecha, timbrado, condicion, observacion]
    );
    const factura = facturaResult.rows[0];

    // Insertar items
    let subtotal = 0, totalIva = 0;
    for (const item of items) {
      const itemSubtotal = item.cantidad * item.precio_unitario;
      subtotal += itemSubtotal;

      let ivaAmount = 0;
      if (item.iva === '10') ivaAmount = itemSubtotal / 11;
      else if (item.iva === '5') ivaAmount = itemSubtotal / 21;
      totalIva += ivaAmount;

      await client.query(
        `INSERT INTO factura_items (factura_id, producto_id, descripcion, cantidad, precio_unitario, iva, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [factura.id, item.producto_id, item.descripcion, item.cantidad, item.precio_unitario, item.iva, itemSubtotal]
      );
    }

    // Actualizar totales
    await client.query(
      'UPDATE facturas SET subtotal = $1, total_iva = $2, total = $3 WHERE id = $4',
      [subtotal, totalIva, subtotal, factura.id]
    );

    await client.query('COMMIT');

    const updated = await pool.query('SELECT * FROM facturas WHERE id = $1', [factura.id]);
    res.status(201).json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando factura:', err);
    res.status(500).json({ error: 'Error al crear factura' });
  } finally {
    client.release();
  }
});

export default router;

// src/routes/users.routes.ts (crear usuarios - solo admin/consultora)
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.post('/', requireRole('super_admin', 'consultora'), async (req, res) => {
  const { email, password, full_name, role, consultora_id, empresa_id } = req.body;
  const creator = req.user!;

  // Validaciones de permisos
  if (creator.role === 'consultora') {
    if (role === 'super_admin') return res.status(403).json({ error: 'No autorizado' });
    if (role === 'consultora' && consultora_id !== creator.consultora_id) {
      return res.status(403).json({ error: 'Solo puede crear usuarios para su consultora' });
    }
    if (role === 'empresa') {
      const check = await pool.query(
        'SELECT id FROM empresas WHERE id = $1 AND consultora_id = $2',
        [empresa_id, creator.consultora_id]
      );
      if (check.rows.length === 0) return res.status(403).json({ error: 'Empresa no pertenece a su consultora' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hash = await bcrypt.hash(password, 12);
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash, email_confirmed_at) VALUES ($1, $2, now()) RETURNING id',
      [email, hash]
    );
    const userId = userResult.rows[0].id;

    await client.query(
      'INSERT INTO profiles (user_id, full_name, email) VALUES ($1, $2, $3)',
      [userId, full_name, email]
    );

    await client.query(
      'INSERT INTO user_roles (user_id, role, consultora_id, empresa_id) VALUES ($1, $2, $3, $4)',
      [userId, role, consultora_id || null, empresa_id || null]
    );

    await client.query('COMMIT');
    res.status(201).json({ id: userId, email, role });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: 'Error al crear usuario' });
  } finally {
    client.release();
  }
});

export default router;
```

---

## 3. Autenticación JWT

### Flujo completo

```
1. POST /api/auth/login { email, password }
   → Valida credenciales con bcrypt
   → Retorna { access_token (8h), refresh_token (7d), user }

2. Cada request envía: Authorization: Bearer <access_token>
   → authMiddleware valida y decodifica

3. Cuando el access_token expira:
   POST /api/auth/refresh { refresh_token }
   → Retorna nuevo access_token

4. Logout: El frontend borra los tokens del localStorage
```

### Payload del JWT

```json
{
  "id": "uuid-del-usuario",
  "email": "usuario@empresa.com",
  "role": "empresa",
  "consultora_id": "uuid-o-null",
  "empresa_id": "uuid-o-null",
  "iat": 1710000000,
  "exp": 1710028800
}
```

---

## 4. Realtime (WebSocket)

```typescript
// src/services/realtime.service.ts
import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import { Client } from 'pg';
import jwt from 'jsonwebtoken';

export function setupRealtime(httpServer: Server) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  // Autenticación WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token requerido'));

    try {
      const user = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`Usuario conectado: ${user.email} (${user.role})`);

    // Suscribir a canales según rol
    if (user.role === 'super_admin') {
      socket.join('global');
    } else if (user.role === 'consultora' && user.consultora_id) {
      socket.join(`consultora:${user.consultora_id}`);
    } else if (user.role === 'empresa' && user.empresa_id) {
      socket.join(`empresa:${user.empresa_id}`);
    }

    socket.on('disconnect', () => {
      console.log(`Usuario desconectado: ${user.email}`);
    });
  });

  // Escuchar notificaciones de PostgreSQL
  const pgListener = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  pgListener.connect().then(() => {
    pgListener.query('LISTEN global_changes');
    console.log('Escuchando notificaciones de PostgreSQL');

    pgListener.on('notification', (msg) => {
      if (!msg.payload) return;

      try {
        const payload = JSON.parse(msg.payload);
        const { empresa_id, consultora_id } = payload;

        // Emitir a super_admins
        io.to('global').emit('db_change', payload);

        // Emitir a la consultora
        if (consultora_id) {
          io.to(`consultora:${consultora_id}`).emit('db_change', payload);
        }

        // Emitir a la empresa
        if (empresa_id) {
          io.to(`empresa:${empresa_id}`).emit('db_change', payload);
        }
      } catch (err) {
        console.error('Error parseando notificación:', err);
      }
    });
  });

  // Escuchar notificaciones por empresa/consultora
  // (Los triggers de PostgreSQL notifican a canales dinámicos)
  const setupDynamicListeners = async () => {
    const pgDynamic = new Client({ connectionString: process.env.DATABASE_URL });
    await pgDynamic.connect();

    // Obtener todas las empresas y consultoras activas
    const empresas = await pgDynamic.query("SELECT id FROM empresas WHERE estado = 'activo'");
    const consultoras = await pgDynamic.query("SELECT id FROM consultoras WHERE estado = 'activo'");

    for (const e of empresas.rows) {
      await pgDynamic.query(`LISTEN "empresa_${e.id}"`);
    }
    for (const c of consultoras.rows) {
      await pgDynamic.query(`LISTEN "consultora_${c.id}"`);
    }

    pgDynamic.on('notification', (msg) => {
      if (!msg.payload) return;
      try {
        const payload = JSON.parse(msg.payload);
        const channel = msg.channel; // e.g. "empresa_uuid-xxx"
        io.to(channel.replace('_', ':')).emit('db_change', payload);
      } catch {}
    });

    console.log(`Escuchando ${empresas.rows.length} empresas y ${consultoras.rows.length} consultoras`);
  };

  setupDynamicListeners().catch(console.error);

  return io;
}

// src/app.ts (entry point)
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { setupRealtime } from './services/realtime.service';
import authRoutes from './routes/auth.routes';
import facturasRoutes from './routes/facturas.routes';
import usersRoutes from './routes/users.routes';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/facturas', facturasRoutes);
app.use('/api/users', usersRoutes);
// ... otras rutas: /api/consultoras, /api/empresas, /api/clientes, /api/productos

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// WebSocket + Realtime
const io = setupRealtime(httpServer);

const PORT = parseInt(process.env.PORT || '3000');
httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
```

---

## 5. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: facturapronto-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: facturapronto
      POSTGRES_USER: facturapronto_user
      POSTGRES_PASSWORD: ${DB_PASSWORD:-CambiarEnProduccion123!}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/01-schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U facturapronto_user -d facturapronto"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: facturapronto-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: facturapronto
      DB_USER: facturapronto_user
      DB_PASSWORD: ${DB_PASSWORD:-CambiarEnProduccion123!}
      DATABASE_URL: postgresql://facturapronto_user:${DB_PASSWORD:-CambiarEnProduccion123!}@postgres:5432/facturapronto
      JWT_SECRET: ${JWT_SECRET:-CambiarEsteSecretoEnProduccion}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:-OtroSecretoRefresh}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:8080}
    ports:
      - "3000:3000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: facturapronto-web
    restart: unless-stopped
    depends_on:
      - api
    environment:
      VITE_API_URL: ${API_URL:-http://localhost:3000}
    ports:
      - "8080:80"

volumes:
  pgdata:
```

### Dockerfile del backend

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

### Dockerfile del frontend

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx config

```nginx
# frontend/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API
    location /api/ {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy WebSocket
    location /socket.io/ {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 6. Variables de Entorno

```bash
# .env (producción)
# Base de datos
DB_PASSWORD=TuPasswordSeguro2024!
DB_HOST=postgres
DB_PORT=5432
DB_NAME=facturapronto
DB_USER=facturapronto_user

# JWT
JWT_SECRET=clave-secreta-de-al-menos-32-caracteres-random
JWT_REFRESH_SECRET=otra-clave-secreta-diferente-32-chars

# Frontend
FRONTEND_URL=https://tudominio.com
API_URL=https://api.tudominio.com

# Opcional
DB_SSL=false
```

---

## 7. Conexión desde el Frontend

### Cliente API (reemplaza supabase client)

```typescript
// src/lib/api-client.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(`${API_URL}/api${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Intentar refresh
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers.Authorization = `Bearer ${this.getToken()}`;
        const retry = await fetch(`${API_URL}/api${path}`, { ...options, headers });
        if (!retry.ok) throw new Error('Error después de refresh');
        return retry.json();
      }
      // Redirigir al login
      window.location.href = '/login';
      throw new Error('Sesión expirada');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Error del servidor');
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('access_token', data.access_token);
      return true;
    } catch {
      return false;
    }
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body: any) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }
  put<T>(path: string, body: any) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }
  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
```

### Cliente WebSocket (realtime)

```typescript
// src/lib/realtime-client.ts
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class RealtimeClient {
  private socket: Socket | null = null;

  connect() {
    const token = localStorage.getItem('access_token');
    if (!token || this.socket?.connected) return;

    this.socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => console.log('Realtime conectado'));
    this.socket.on('disconnect', () => console.log('Realtime desconectado'));
  }

  // Escuchar cambios en una tabla específica
  onTableChange(
    table: string,
    callback: (data: { action: string; data: any }) => void
  ) {
    this.socket?.on('db_change', (payload: any) => {
      if (payload.table === table) callback(payload);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const realtime = new RealtimeClient();
```

### Uso con React Query (invalidación automática)

```typescript
// src/hooks/useRealtimeInvalidation.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtime } from '@/lib/realtime-client';

export function useRealtimeInvalidation(table: string, queryKey: string[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    realtime.connect();
    realtime.onTableChange(table, () => {
      queryClient.invalidateQueries({ queryKey });
    });

    return () => {
      // Cleanup si es necesario
    };
  }, [table, queryKey, queryClient]);
}

// Uso en un componente:
// useRealtimeInvalidation('facturas', ['facturas']);
```

---

## Comandos para desplegar

```bash
# 1. Clonar y configurar
cp .env.example .env
# Editar .env con tus valores

# 2. Levantar todo
docker compose up -d

# 3. Verificar
docker compose ps
curl http://localhost:3000/api/health

# 4. Login inicial
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@facturapronto.com","password":"Admin123!"}'
```
