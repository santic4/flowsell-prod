# Configuración de Flow Sell

Esta versión usa MongoDB para datos y sesiones, Cloudinary para imágenes privadas y Redis/Render Key Value para colas, reservas y límites. Los pagos siguen fuera de la app. No necesita Firebase.

## Antes de actualizar una instalación existente

Leé MIGRACION.md. Hacé un respaldo de MongoDB, conservá las variables actuales y detené los workers anteriores. No ejecutes simultáneamente la versión anterior y ésta: la anterior no respeta cifrado, nuevos permisos ni cupos.

## Variables del backend

Copiá backend/.env.example a backend/.env para desarrollo. En Render se cargan en Web Service → Environment, sin subir archivos .env al repositorio.

| Variable | Qué poner |
| --- | --- |
| NODE_ENV | production en Render; development local |
| APP_URL | https://flowsell-prod.onrender.com (sin barra final) |
| API_URL | Igual a APP_URL en Render; http://localhost:8080 local |
| REDIRECT_URI | https://flowsell-prod.onrender.com/api/auth/callback |
| CLIENT_ID / CLIENT_SECRET | ID y secreto de tu aplicación de Mercado Libre, no de Cloudinary |
| MELI_PKCE | false si la casilla PKCE está desmarcada en Mercado Libre; true si habilitaste S256 allí |
| MONGO_URI | Tu conexión MongoDB actual, con base explícita, usuario exclusivo y TLS. Atlas suele usar mongodb+srv:// |
| REDIS_URL | URL interna autenticada de Render Key Value, completa, copiada desde Connect |
| SESSION_SECRET | Aleatorio de al menos 48 caracteres; genera uno el comando de abajo |
| TOKEN_ENCRYPTION_KEYS | JSON con claves AES de 32 bytes en Base64; conservar las anteriores al rotar |
| TOKEN_ENCRYPTION_ACTIVE_KEY | Identificador de la clave activa, por ejemplo v1 |
| WEBHOOK_SECRET | Secreto aleatorio de al menos 48 caracteres; forma parte de la URL de notificaciones |
| CLOUDINARY_CLOUD_NAME | Cloud name del Product Environment |
| CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET | Credenciales privadas de Cloudinary; sólo backend |
| CLOUDINARY_FOLDER | flowsell/templates; mantené el valor anterior durante la migración |
| CLOUDINARY_GLOBAL_MONTHLY_MB | Corte de transferencia de imágenes para toda la instalación; 100000 por defecto. Elegí según tu presupuesto real |
| ADMIN_MELI_IDS | Tu ID numérico de vendedor de Mercado Libre. Para un solo admin: un solo número |
| ADMIN_TOTP_SECRET | Clave Base32 del autenticador de tu panel |
| RUN_WORKERS | true si el Web Service también procesa las tareas; opción más simple |
| PREMIUM_PRICE_USD / PLUS_PRICE_USD | 19 y 39 inicialmente. Cambialos según tu oferta comercial |
| LEGAL_NAME | Nombre completo o razón social real del responsable |
| LEGAL_TAX_ID | CUIT/identificación tributaria, si corresponde |
| LEGAL_ADDRESS | Domicilio legal/de contacto real que debe mostrarse |
| LEGAL_EMAIL | Correo real donde vas a recibir y responder solicitudes de privacidad |
| DATA_REGIONS | Texto con proveedor MongoDB, regiones/países reales de Render, MongoDB y Cloudinary y destinos verificados de subproveedores |
| LEGAL_READY | false hasta completar y revisar datos, contratos y obligaciones. true después de esa revisión |

Los datos LEGAL_* de contacto, DATA_REGIONS y precios son públicos. No pongas claves ni contraseñas allí. LEGAL_READY es una declaración operativa del titular; el programa no certifica cumplimiento ni verifica contratos o registros.

No uses COOKIE_DOMAIN, REACT_APP_*REDIS*, claves de Firebase ni claves de Cloudinary en el frontend. Eliminá variables antiguas que ya no se utilicen. No cambies CLIENT_SECRET ni MONGO_URI porque sí: mantené tus conexiones válidas.

Desde backend:

```bash
npm ci
npm run secrets
```

El comando muestra secretos nuevos una sola vez en tu terminal: guardalos en tu gestor de contraseñas y cargalos en las envs. En Render, cada valor se pega sin comillas envolventes; el JSON de TOKEN_ENCRYPTION_KEYS sí conserva sus comillas internas. En un .env local podés escribir el JSON entre comillas simples.

**No regeneres la clave activa cada vez que desplegás.** Si perdés las claves, no podremos descifrar los tokens anteriores. Nunca compartas su salida en capturas, tickets, Git o chats.

## Tu panel de administrador

1. Ingresá a Flow Sell y mirá tu ID en Mi cuenta y privacidad. También aparece en el perfil de la versión anterior. Si las altas están cerradas por LEGAL_READY=false, podés obtenerlo en tu MongoDB actual: colección users, registro con tu apodo, campo meliId. No uses el _id de MongoDB ni el CLIENT_ID.
2. Poné ese ID en ADMIN_MELI_IDS. No es el CLIENT_ID de la aplicación.
3. Generá ADMIN_TOTP_SECRET con npm run secrets.
4. En tu autenticador (por ejemplo, el que ya uses), agregá manualmente una cuenta: nombre Flow Sell; clave ADMIN_TOTP_SECRET; basado en tiempo; SHA1; 6 dígitos; 30 segundos.
5. Guardá la clave de recuperación en un lugar privado y sincronizá la hora del teléfono.
6. Desplegá las variables e ingresá a Administración. Introducí el código actual. Se habilita durante 15 minutos.
7. Para cambiar un plan, buscá el ID ML, verificá la cuenta, elegí plan y vencimiento y confirmá. La solicitud comercial se resuelve y el cambio se registra.

No hay contraseña universal, rol asignable por el navegador ni botón para hacerse administrador. Si perdés el autenticador, rotá la clave desde Render; cerrá las sesiones existentes mediante cambio de SESSION_SECRET si necesitás revocación inmediata.

## Redis en Render: sí, volvé a conectarlo como servicio separado

1. En Render elegí **New → Key Value**. Los nuevos servicios usan Valkey compatible con Redis.
2. Asignale un nombre como flowsell-redis. Elegí el **mismo workspace y región** de tu Web Service.
3. Para producción usá una instancia con persistencia. El plan gratuito puede perder trabajos al reiniciarse.
4. Elegí **Maxmemory Policy: noeviction**. Así no se expulsan trabajos para hacer espacio; si se llena, se rechazan operaciones y hay que ampliar capacidad.
5. Elegí persistencia **Journal + Snapshot** si tu plan la ofrece. Es una protección ante reinicios; no reemplaza un respaldo ni garantiza pérdida cero.
6. Una vez creada, abrí **Info → Connections → Enable Internal Authentication**. En una instancia nueva hacelo antes de conectar Flow Sell. Render la reinicia y la URL interna pasa a incluir usuario y contraseña.
7. Abrí **Connect → Internal URL** y copiá el valor completo a **REDIS_URL** del Web Service.
8. Conservá exactamente el esquema y puerto proporcionados. Una URL interna redis:// utiliza la red privada. No la conviertas a rediss:// a mano. Para accesos externos se requiere TLS.
9. En **Networking / IP allow list** dejá el acceso externo deshabilitado/lista vacía. No habilites 0.0.0.0/0.
10. Guardá y desplegá Flow Sell. En la Shell del Web Service, ubicado en FlowSell-main/backend, ejecutá:

```bash
npm run check:redis
```

Debe indicar conexión y escritura OK, autenticación y noeviction. No imprime la URL. Si aparece error, revisá región/workspace, contraseña y que hayas usado la URL interna desde Render. Esa URL **no funciona desde tu PC**.

Para un Redis existente con clientes activos, seguí primero la transición a URL autenticada de la documentación de Render; activar autenticación sin actualizar clientes corta sus conexiones. No uses el Redis de otra aplicación con una política de memoria incompatible.

Configurá avisos en Render para memoria, reinicios, trabajos fallidos y gastos. El corte global de imágenes de Flow Sell limita sus descargas; **no es un límite contractual de facturación de Cloudinary**, ni controla otras apps que usen tu cuenta.

Referencia: [Render Key Value](https://render.com/docs/key-value).

## Mercado Libre

- Redirect URI en el portal: exactamente el mismo REDIRECT_URI, incluyendo /api/auth/callback.
- Authorization Code y Refresh Token habilitados. La configuración PKCE del portal y MELI_PKCE deben coincidir.
- Negocio Mercado Libre. Pedí los permisos mínimos para usuarios, consulta de publicaciones, ventas y mensajería posventa. Si habilitás confirmación de entrega, revisá también el permiso correspondiente a la operación de venta.
- Tópico usado por esta versión: orders_v2.
- Callback de notificaciones: **APP_URL + /api/payments/ + WEBHOOK_SECRET**. Ejemplo de forma: https://flowsell-prod.onrender.com/api/payments/EL_SECRETO_GENERADO. El texto de ejemplo no es una clave para usar.
- El secreto de la ruta es compartido con el proveedor y debe tratarse como credencial. No se implementó una supuesta firma de Mercado Pago: es una integración de Mercado Libre. Además se valida aplicación, propietario y recurso, se vuelve a consultar la orden con la cuenta autorizada y se deduplican los envíos.
- No reutilices el enlace de callback con code= de un ingreso anterior. Iniciá cada login desde la web.

## Cloudinary

Las mismas cuatro envs siguen vigentes. No hace falta un upload preset unsigned. El servidor sube con API autenticada y delivery type authenticated. El navegador accede a /api/media/:id con su sesión, sin recibir enlaces de descarga firmados ni el secreto.

Deshabilitá presets unsigned que no uses, habilitá MFA de tu cuenta, limitá miembros y ambientes y configurá alertas de uso. Strict transformations puede ayudar con costos de transformaciones pero **no convierte por sí solo un archivo público en privado**. Los archivos públicos anteriores necesitan MIGRACION.md.

Cada imagen: JPG/PNG/WEBP estática, hasta 2 MB de entrada, límite de píxeles y hasta 5 por plantilla. Se reencoda a WEBP y se quitan metadatos. El servicio no guarda facturas, documentos ni videos. Límite mensual de cargas/transferencia por cuenta: Gratuito 30/250 MB, Premium 500/5000 MB, Plus 1500/20000 MB. Los intentos fallidos también consumen reservas.

Referencia: [control de acceso de Cloudinary](https://cloudinary.com/documentation/control_access_to_media).

## Desarrollo local

Usá Node.js 22.12 o superior dentro de 22 LTS, o 24 LTS, MongoDB y Redis locales o de pruebas. No uses datos productivos.

1. Levantá MongoDB y Redis. Con Docker Desktop podés usar el compose.local.yml incluido; requiere configurar primero las claves del .env de Docker siguiendo el archivo.
2. Copiá backend/.env.example a backend/.env, completá secretos y poné:

```dotenv
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:8080
REDIRECT_URI=http://localhost:8080/api/auth/callback
MONGO_URI=mongodb://flowsell:TU_CLAVE_MONGO@127.0.0.1:27017/flowsell?authSource=admin
REDIS_URL=redis://:TU_CLAVE_REDIS@127.0.0.1:6379
RUN_WORKERS=true
```

3. En frontend/.env dejá REACT_APP_HOST_HOOKS vacío. El servidor de desarrollo redirige /api al backend de localhost:8080.
4. Terminal backend: npm ci y npm run dev.
5. Terminal frontend: npm ci y npm start.
6. Abrí http://localhost:3000.

Mercado Libre puede exigir una URL HTTPS pública para OAuth. Si el portal rechaza localhost, probá en un servicio staging de Render con otra base y otro Cloudinary/Redis, o utilizá un túnel HTTPS que lleve al frontend local y su proxy /api. En ese caso APP_URL, API_URL y REDIRECT_URI deben usar ese mismo origen HTTPS y éste debe registrarse en Mercado Libre. No desactives CSRF ni Secure para resolverlo.

## Despliegue en Render

Para tu repositorio que contiene la carpeta FlowSell-main:

- Tipo: Web Service Node.
- Root Directory: FlowSell-main.
- Node: 22 (la .node-version incluida fija la familia).
- Build Command:

```bash
npm --prefix frontend ci --include=dev && npm --prefix frontend run build && npm --prefix backend ci --omit=dev && node scripts/copy-build.mjs
```

- Start Command: npm --prefix backend start
- Health Check Path: /api/health/ready
- REACT_APP_HOST_HOOKS: vacío; usa el mismo dominio.
- NODE_ENV=production
- RUN_WORKERS=true

Si tu repositorio ya tiene backend y frontend en la raíz, Root Directory queda vacío.

Render asigna PORT automáticamente. Evitá el plan web que duerme por inactividad para una operación comercial con webhooks/colas. Si separás el procesamiento en un Background Worker: mismo código/envs/región, comando npm --prefix backend run worker; Web Service con RUN_WORKERS=false. Conservá al menos un worker activo. Las colas nuevas se llaman flowsell-v2.

Para pruebas: npm --prefix backend ci y npm --prefix backend test. Usan MongoDB 7 temporal y Redis temporal, no tu base productiva; la primera ejecución descarga binarios. Para QA visual: compilá/copiá frontend y, desde backend, npx playwright install chromium seguido de node qa/browser-check.mjs.

## Verificaciones y GitHub Actions

El workflow incluido se debe ubicar en `.github/workflows/verify.yml` **en la raíz del repositorio Git**. Si subís la carpeta FlowSell-main dentro del repositorio flowsell-prod, mové sólo esa carpeta .github al nivel superior del repositorio. El workflow detecta si backend/frontend están en la raíz o dentro de FlowSell-main.

El CI no utiliza secretos de producción: prueba MongoDB/Redis temporales, compila la aplicación, revisa dependencias y comprueba pantallas con cuentas ficticias. En Linux instalá redis-server o configurá REDISMS_SYSTEM_BINARY con el ejecutable local para evitar compilar Redis durante los tests. En Windows, ejecutá las pruebas de backend en WSL o en el CI.

La comprobación básica `node scripts/check-source.mjs` detecta algunos archivos/secretos que no deben entregarse. Habilitá también secret scanning y protección de ramas en el repositorio según las capacidades de tu cuenta; la comprobación incluida no sustituye esas herramientas.
