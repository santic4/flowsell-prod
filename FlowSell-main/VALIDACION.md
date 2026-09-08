# Validación de la entrega

Fecha: 8 de septiembre de 2026. Código fuente completo en este paquete; no se realizó un despliegue ni se modificaron tus cuentas de proveedores.

## Resultados obtenidos

- Backend: **27 pruebas aprobadas, 0 fallos**, ejecutando las rutas reales de Express contra MongoDB 7 temporal y Redis temporal.
- Compilación frontend Vite de producción: **correcta**. Se incluye una copia compilada en backend/public/build, además del código fuente y los lockfiles.
- Navegador: login a **320, 375, 768, 1280 y 1905 px**; privacidad, términos y guía pública a 375 px; ocho secciones privadas a 375 y 1280 px. Sin desbordes horizontales ni errores de ejecución de React en esos recorridos. Se inspeccionaron visualmente capturas de login móvil y escritorio.
- Dependencias: **npm audit sin vulnerabilidades reportadas** en backend y frontend, incluyendo desarrollo, al realizar la revisión. Es una consulta de avisos conocidos de esa fecha, no una auditoría de seguridad de la aplicación.
- Revisión básica del paquete: sin .env reales, claves privadas, dependencias Firebase ni herramientas CRA antiguas. Las fuentes tipográficas se sirven localmente.

## Qué verifican las pruebas de backend

| Grupo | Comprobaciones |
| --- | --- |
| Cifrado | Tokens con IV distinto, AAD por cuenta, rechazo de alteración, dueño incorrecto y texto sin migrar |
| Permisos | Sesión obligatoria, retirada de CRUD público antiguo, IDOR entre cuentas en plantillas, archivos, publicaciones y campañas |
| Solicitudes | CSRF y origen exacto, solicitudes rechazadas sin mutación |
| Archivos | Upload Cloudinary de tipo authenticated, inspección del formato real, dueño, descarga privada breve y cupo previo a descarga |
| Planes | Cuotas concurrentes, downgrade sin pérdida de configuración, CSV/historial/diferidos/campañas controlados por API |
| Admin | Allowlist, TOTP, protección contra reutilización, auditoría y respuestas sin contenidos privados |
| Ventas | Estadísticas y CSV por vendedor, cálculos y escape CSV |
| Webhook | Secreto, app y recurso; consulta de propiedad de la orden; deduplicación |
| Workers | Pausa/desconexión, contención transitoria recuperable, envío incierto sin reintento automático |
| Salida | Invalidación de sesiones y borrado restringido al propietario con reautenticación |
| Migración | Dry run sin cambios; cifrado sobre base temporal, referencias conservadas, índice por propietario y reejecución |
| Redis | Fallo de conexión cierra operaciones; exclusión mutua del lock |

Mercado Libre y las llamadas de Cloudinary se sustituyen por respuestas controladas en las pruebas para no operar sobre ventas ni archivos reales. Se usa el SDK de Cloudinary para comprobar los parámetros de carga y las URLs privadas generadas. No se probó tu cuenta Cloudinary, el login OAuth real ni la recepción de notificaciones desde Mercado Libre en esta ejecución.

## Cómo reproducir

Desde la raíz del proyecto:

```bash
npm --prefix backend ci
npm --prefix backend test
npm --prefix frontend ci --include=dev
npm --prefix frontend run build
node scripts/copy-build.mjs
node scripts/check-source.mjs
```

Para QA visual, desde backend:

```bash
npx playwright install chromium
node qa/browser-check.mjs
```

Los tests inician bases temporales aisladas; no se usa MONGO_URI de producción. La primera ejecución necesita descargar MongoDB y disponer de un ejecutable Redis. En Linux, instalá redis-server y definí REDISMS_SYSTEM_BINARY con su ruta; en Windows usá WSL o GitHub Actions. La comprobación visual de esta entrega utilizó Chromium headless local; el script admite una ruta alternativa mediante QA_CHROMIUM_MODULE/QA_CHROMIUM_EXECUTABLE sólo para el entorno de pruebas.

El workflow de GitHub Actions está incluido pero no se ejecutó en tu repositorio. Ubicalo en la raíz Git como explica CONFIGURACION.md.

## Verificación necesaria en tu staging

Antes de abrir la venta, con claves y datos de prueba: completá las envs, migrá una copia de la base, verificá OAuth, carga/lectura/borrado de imagen privada, una orden autorizada, diferidos, campaña permitida y cambio/vencimiento de plan. Revisá las restricciones efectivas de Mercado Libre para tu cuenta y permisos. Confirmá TLS, autenticación Redis, política noeviction, backups restaurables, alertas y configuración legal real.

No se realizó pentesting externo, prueba de carga masiva ni certificación legal. La separación entre cuentas está ejercitada en las pruebas incluidas, pero la seguridad en producción también depende de las configuraciones y accesos descritos en SEGURIDAD-Y-PRIVACIDAD.md.
