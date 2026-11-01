# Setter — frontend y autenticación

Aplicación React/Vite con API Hono en Cloudflare Workers, autenticación Better Auth, base de datos D1 y un Durable Object privado por cliente.

## Alcance

- Landing y formularios de registro e inicio de sesión con el diseño verde petróleo y naranja.
- Registro público exclusivamente de clientes. Administradores globales creados mediante un comando interno.
- Sesiones con cookie HttpOnly; Secure en HTTPS y SameSite=Lax. El rol y el estado se consultan en D1 en cada operación protegida.
- Panel cliente con identidad real y resumen de su asistente.
- Panel de administración con clientes, detalle, fecha de alta, estado del asistente, conversaciones y activación/suspensión.
- Suspender una cuenta revoca sus sesiones y bloquea nuevos accesos.
- Durable Object SQLite independiente por cliente, con estado inicial `not_configured` y cero conversaciones.

Las secciones de conversaciones, contactos, configuración, simulador e integraciones del panel cliente siguen siendo vistas de demostración, señaladas como tales. Este cambio incorpora autenticación y administración de cuentas; todavía no conecta Instagram, un modelo de IA, el envío de emails ni la recuperación de contraseña.

## Desarrollo local

Se recomienda Node.js 22.12 o posterior compatible con la versión instalada de Wrangler. Instala las dependencias y prepara D1:

```bash
npm ci
npm run setup:local
npm run types:worker
npm run build
```

`setup:local` crea `.dev.vars` con un secreto aleatorio y aplica las migraciones **locales**. Si el archivo ya existe, lo conserva. Ningún secreto se guarda en Git.

Inicia la API en una terminal:

```bash
npm run dev:worker
```

Y React con recarga automática en otra:

```bash
npm run dev
```

Abre la dirección que muestre Vite, normalmente `http://localhost:5173`. Vite envía `/api/*` y `/agents/*` al Worker local en el puerto 8787, manteniendo frontend y API en el mismo origen para el navegador.

También puedes abrir `http://localhost:8787` para ver el último frontend compilado, servido directamente por el Worker. Después de editar el frontend, recompila si usas esta dirección. El setup permite los puertos 5173, 5174 y 8787 en localhost/127.0.0.1. Si eliges otro origen, actualiza `BETTER_AUTH_URL` y `TRUSTED_ORIGINS` en `.dev.vars` y reinicia el Worker.

## Primer administrador

1. Registra tu propia cuenta normalmente en `/registro`.
2. Promueve esa cuenta desde una terminal con acceso al proyecto:

```bash
npm run admin:create -- tu-correo@empresa.com --local
```

3. Vuelve a iniciar sesión. La cuenta accederá a `/admin`.

El comando no establece ni cambia contraseñas y solo promueve una cuenta activa existente. Para una cuenta de producción, el mismo comando requiere `--remote` y permisos sobre D1. No hay selector de rol en el registro ni un endpoint público para promocionar administradores.

## Rutas y permisos

| Ruta | Acceso |
| --- | --- |
| `/` | Landing pública |
| `/login`, `/registro` | Formularios públicos; redirección si ya hay sesión |
| `/app/*` | Cliente activo |
| `/admin` | Administrador global activo |
| `/api/auth/sign-up/email` | POST: registro como cliente |
| `/api/auth/sign-in/email` | POST: inicio de sesión |
| `/api/auth/sign-out` | POST: cierre de sesión |
| `/api/auth/get-session` | GET: sesión de Better Auth |
| `/api/me` | GET: identidad y perfil de la sesión |
| `/api/client/assistant` | GET: resumen del asistente propio |
| `/api/admin/clients` | GET: clientes reales y estado |
| `/api/admin/clients/:id` | GET: detalle; PATCH: activar o suspender cliente |
| `/agents/:clientId` | GET: resumen privado, solo propietario o administrador |

La API rechaza operaciones sin sesión, accesos a otros clientes, roles enviados al registro y escrituras de orígenes no autorizados. Las respuestas privadas no se almacenan en cachés compartidas. El estado de cada asistente se obtiene mediante RPC al Durable Object; no se expone un encaminador genérico ni un WebSocket público.

## Comprobaciones

```bash
npm run build
npm test
npm run deploy:check
```

`build` comprueba los tipos del frontend y Worker y compila React. `test` arranca un Worker HTTPS local con D1 y Durable Objects en almacenamiento temporal aislado; prueba registro, cookies, sesiones, roles, aislamiento, suspensión, reactivación y CSRF sin modificar la base local de desarrollo ni la remota. `deploy:check` empaqueta el Worker sin publicarlo.

## Configuración para Cloudflare

`wrangler.jsonc` debe apuntar al Worker `chatbot`, a su URL pública y a la base D1 remota correcta antes de desplegar.

1. Inicia sesión en Cloudflare con Wrangler y crea o selecciona la base D1:
   `npx wrangler d1 create setter-db`.
2. Copia el ID real en el binding `DB` de `wrangler.jsonc`.
3. Ajusta el nombre del Worker y `BETTER_AUTH_URL` al origen HTTPS final. Mantén `ENVIRONMENT=production`. Si frontend y API están en el mismo dominio, `TRUSTED_ORIGINS` puede quedar vacío.
4. Define un secreto aleatorio de al menos 32 caracteres mediante el prompt seguro:
   `npx wrangler secret put BETTER_AUTH_SECRET`.
5. Aplica las migraciones remotas: `npm run db:migrate:remote`.
6. Comprueba el empaquetado: `npm run deploy:check`.
7. Publica cuando decidas hacerlo: `npm run deploy`.

El frontend compilado se sirve con Workers Static Assets. `/api/*` y `/agents/*` siempre pasan primero por el Worker. Las migraciones de D1 están en `migrations/`; la migración de la clase SQLite `SetterAgent` está declarada en Wrangler.

Para un despliegue conectado a GitHub, configura `npm run build` como build y `npx wrangler deploy` como comando de despliegue, después de preparar D1 y los secretos. Un push por sí solo no crea esos recursos ni aplica sus migraciones.

## Archivos principales

- `src/router/AppRouter.tsx`: rutas públicas, cliente y administrador.
- `src/context/AuthContext.tsx`: sesión del navegador y registro/login/logout.
- `src/pages/auth/`: formularios y validaciones.
- `src/pages/admin/AdminDashboardPage.tsx`: administración de clientes.
- `worker/auth.ts`: configuración de Better Auth.
- `worker/middleware/`: sesión, rol y origen.
- `worker/routes/`: API de identidad, cliente y administración.
- `worker/agents/SetterAgent.ts`: estado SQLite independiente por cliente.
- `scripts/setup-local.mjs`: secretos y configuración local.
- `scripts/create-admin.mjs`: promoción interna de una cuenta.
