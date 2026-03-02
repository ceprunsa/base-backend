# Sistema Base — NestJS + Supabase Auth + Prisma

Proyecto base con autenticación robusta y gestión de usuarios.

## Requisitos Previos

- Node.js v20+
- Instancia de Supabase (PostgreSQL + Auth)
- Cuenta de Google para OAuth

## Variables de Entorno (.env)

Configura las siguientes variables en un archivo `.env`:

```env
# PostgreSQL connection string (Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Supabase project URL
SUPABASE_URL="https://[PROJECT_REF].supabase.co"

# Supabase JWKS URL (para verificación de JWT)
SUPABASE_JWKS_URL="https://[PROJECT_REF].supabase.co/auth/v1/jwks"

# Frontend URL (para CORS)
FRONTEND_URL="http://localhost:3000"

# Entorno (development/production)
NODE_ENV="development"
```

## Instalación y Configuración

1. **Instalar dependencias**:

   ```bash
   npm install
   ```

2. **Generar cliente de Prisma**:

   ```bash
   npx prisma generate
   ```

3. **Ejecutar Seed** (Opcional):
   Asegúrate de tener la base de datos configurada y los usuarios existentes en Supabase Auth si quieres asignarles roles automáticamente.
   ```bash
   npx tsx prisma/seed.ts
   ```

### Endpoints y Guía Detallada

Para una explicación completa de los flujos de datos, modelos y autenticación, consulta la:
👉 **[Guía de Integración para Frontend](FRONTEND_GUIDE.md)**

#### Resumen de Rutas:

- `POST /auth/session`: Iniciar sesión (intercambio de token).
- `GET /auth/me` / `GET /me`: Perfil del usuario actual.
- `GET /users`: Listado de usuarios (ADMIN).
- `POST /users`: Crear/Invitar usuario (ADMIN).
- `GET /roles`: Listado de roles (ADMIN).

## Documentación API

Accede a Swagger en:
[http://localhost:3000/api/docs](http://localhost:3000/api/docs)

El sistema usa `@ApiCookieAuth('sb-access-token')`. En Swagger UI, puedes "Authorize" si pegas el token manualmente o simplemente usa el endpoint `/auth/session` para activar la cookie.
