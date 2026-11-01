# Pruebas de autenticación

Ejecuta `npm test` después de instalar las dependencias. No necesita una cuenta de Cloudflare, credenciales remotas ni un despliegue previo.

La suite arranca el código real del Worker con Wrangler, aplica las migraciones reales sobre D1 local y utiliza los Durable Objects locales. Crea un directorio temporal, un identificador de base de datos aleatorio, un secreto aleatorio y un puerto libre para cada ejecución. Al terminar cierra únicamente su proceso de Wrangler y elimina su estado temporal. No utiliza `.dev.vars` ni `.wrangler/state` del proyecto.

Se usa HTTPS local con `ENVIRONMENT=production` para comprobar las cookies `Secure`, `HttpOnly` y `SameSite=Lax` emitidas por Better Auth. El cliente de pruebas acepta el certificado autofirmado únicamente para su servidor `127.0.0.1`; no desactiva globalmente la verificación TLS.

La suite comprueba registro, validación, sesión persistente, rechazo de cookies manipuladas, logout, aislamiento de clientes, permisos de administrador, CSRF, suspensión, revocación y reactivación. La promoción del administrador se hace mediante SQL únicamente en la base temporal. Los datos del listado y los detalles de clientes proceden de esa base y de sus Durable Objects.

Los límites de peticiones de producción permanecen habilitados. La suite comprueba el rechazo `429` y espera el tiempo indicado en `X-Retry-After` (o `Retry-After`) antes de continuar. Por eso la ejecución completa tarda algo más de un minuto.
