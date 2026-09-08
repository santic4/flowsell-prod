# Operación segura y obligaciones del titular

El código incluye controles y pruebas. No convierte una instalación en invulnerable ni sustituye configuración de proveedores, revisión legal o una auditoría independiente del servicio desplegado.

## Controles implementados

| Área | Medida |
| --- | --- |
| Aislamiento | Todas las rutas operativas requieren sesión y filtran propietario. Se verifican propietarios de plantillas, flujos, imágenes, campañas y órdenes consultadas a Mercado Libre |
| Rutas internas | Se retiró el CRUD público/antiguo de usuarios, tokens, jobs y mensajes; las colas sólo se ejecutan desde procesos internos |
| Tokens ML | AES-256-GCM, IV distinto por cifrado, AAD por cuenta, claves versionadas fuera de MongoDB; no se incluyen en respuestas |
| Sesión | Passport conserva sólo ID y versión; cookie HTTPOnly, Lax, Secure en producción; máximo de inactividad y vida absoluta; revocación global por versión |
| Solicitudes | CSRF + origen exacto, validación Zod, cuerpos pequeños, errores sin detalles del proveedor, CSP y demás cabeceras |
| Admin | Allowlist de ID ML en servidor y TOTP con caducidad, límite de intentos y protección de reutilización; panel sin contenido de mensajes, imágenes ni compradores |
| Webhook | Secreto en callback, app ID, tópico y recurso permitidos; orden reconsultada con token del propietario; inbox persistido y ledger por envío |
| Duplicados | Reserva única de envío antes del POST; resultado incierto no se repite automáticamente |
| Cuotas | Plan comprobado en rutas y workers; contadores atómicos MongoDB y reservas distribuidas Redis para operaciones concurrentes |
| Cloudinary | Imágenes authenticated, proxy con sesión y dueño, descarga interna firmada por 60 s, límites de tamaño/píxeles/archivos/cargas/transferencia, reencodificación sin EXIF |
| Salida | Exportación de datos, desconexión, cierre de sesiones, eliminación de cuenta y archivos con recuperación de fallos |
| Retención | Vencimientos MongoDB, mantenimiento de archivos y sesiones, colas con retención acotada, auditoría sin cuerpos ni secretos |

La sesión administrativa ve identificadores y apodos porque necesita asignar planes. “Sin datos sensibles” no significa “sin ningún dato personal”. El acceso directo del titular a las consolas de infraestructura puede alcanzar más datos que el panel; debe restringirse y auditarse.

## Antes de abrir ventas: tareas reales en tus cuentas

1. **MFA en Render, GitHub, el proveedor MongoDB y Cloudinary**: activá verificación en dos pasos en cada cuenta, preferí autenticador o llave de seguridad, guardá códigos de recuperación fuera del equipo habitual. El código de Flow Sell no puede activar esos controles por vos.
2. **Accesos mínimos**: usuario de MongoDB exclusivo, sólo permisos sobre la base Flow Sell; ambientes separados para producción y pruebas; miembros de Render/Cloudinary/GitHub con el rol necesario; no compartir cuentas.
3. **Red**: Redis interno autenticado sin acceso externo; MongoDB por TLS con allowlist de las IP de salida reales de Render o red privada compatible. No uses 0.0.0.0/0 en producción. Los cambios de región requieren revisar estas reglas.
4. **Secretos**: sólo envs privadas del backend. Repositorio privado cuando corresponda, revisión de accesos y protección de rama. Si un secreto se publicó alguna vez, rotarlo y revisar el incidente; quitarlo del archivo actual no lo quita del historial.
5. **Backups**: habilitá backups del proveedor MongoDB en un plan que los soporte, cifrados, con acceso separado y ventana máxima de 30 días según lo declarado en la política. Conservá las claves de token fuera del mismo backup. Probá una restauración en una base aislada antes del lanzamiento y luego mensualmente. No uses el disco efímero del Web Service como respaldo.
6. **Monitoreo**: alertas de disponibilidad (/api/health/ready), RAM de Redis, disco/conexiones MongoDB, jobs fallidos, errores y cuotas Cloudinary. Vigilá costos en cada proveedor. Un límite de la app no evita cargos de servicios usados fuera de ella.
7. **Logs**: no imprimir cuerpos, cookies, OAuth code, URLs del webhook ni tokens. El código sólo registra eventos acotados. Revisá por separado logs HTTP/proxy, observabilidad y soporte de Render: pueden capturar rutas o query strings antes de que la app las procese. Restringí acceso y configurá retención mínima, objetivo 30 días. No habilites DEBUG de OAuth/Cloudinary en producción.
8. **Disponibilidad**: servidor y Redis con persistencia/ejecución continua para uso comercial. Journal + Snapshot puede perder las últimas escrituras ante ciertos fallos; conciliá tareas si hay una caída. Alerta si no hay workers. No se garantizan envíos exactamente una vez entre sistemas externos: frente a duda se prefiere no duplicar y exigir revisión.
9. **Actualizaciones**: ejecutá CI, revisión de dependencias y pruebas antes de desplegar. Las dependencias de desarrollo tampoco deben ejecutarse expuestas a Internet; Render sólo sirve el build estático.

## Datos y ubicación

| Registro | Dónde |
| --- | --- |
| Usuarios, tokens cifrados, plan y aceptación | MongoDB → users |
| Texto de plantillas y referencias de archivos | MongoDB → templates |
| Publicaciones configuradas, variantes, mensajes y espera | MongoDB → products |
| Metadata privada de imágenes | MongoDB → media |
| Bytes de las imágenes | Cloudinary, delivery type authenticated |
| Audiencias y estado de campañas | MongoDB → jobs, TTL 90 días |
| Límites y consumos | MongoDB → usages, TTL 400 días |
| Registro de envíos/deduplicación | MongoDB → deliveries, TTL 400 días |
| Órdenes de la versión anterior | MongoDB → orders; conservadas para evitar reenvíos, TTL tras migración |
| Inbox de notificaciones | MongoDB → notices, TTL 30 días |
| Pedidos de cambio de plan | MongoDB → planrequests |
| Cambios administrativos / exportaciones | MongoDB → audits, TTL 180 días |
| Sesiones | MongoDB → sessions, vencimiento por cookie/TTL |
| Colas, reservas, límites temporales, anti-replay TOTP | Redis/Key Value |

La app no revela ni adivina el proveedor o la región de tu MongoDB. Los determina tu MONGO_URI y el panel del servicio contratado. Cloudinary almacena imágenes; no reemplaza a MongoDB.

## Documentación legal

La app incorpora /privacy y /terms públicas, enlace previo a OAuth y aceptación explícita versionada dentro de la cuenta. Los textos cubren finalidad, datos necesarios/opcionales, destinatarios, encargo sobre datos de compradores, conservación, derechos, proveedores, transferencias, uso permitido, planes y contratación externa.

Antes de poner LEGAL_READY=true:

- Completá identidad, domicilio, correo, identificación fiscal si corresponde y destinos reales de datos. No pongas un país “a modo de ejemplo”.
- Revisá con asesoramiento local si corresponde registrar responsable/base ante la AAIP y completá el trámite aplicable. El software no presenta solicitudes ni otorga certificados.
- Revisá contratos de tratamiento con Render, proveedor MongoDB, Cloudinary y sus subencargados; documentá garantías de transferencias internacionales según los destinos reales. Una política publicada o aceptar OAuth no sustituyen estos acuerdos.
- Definí y documentá cómo recibís, verificás y respondés solicitudes de acceso, rectificación y supresión, incluyendo pedidos de compradores canalizados por el vendedor.
- Confirmá condiciones comerciales de los planes: moneda de cobro, precio final, impuestos, facturación, fecha de activación/vencimiento, cancelación y reintegros aplicables. Los precios iniciales de 19/39 USD son editables.
- Alineá efectivamente los backups y logs con lo publicado. Si tu proveedor obliga a retenciones diferentes, revisá la política antes de abrir el servicio.

El tratamiento existe aunque no quieras explotar datos con fines ajenos: atender compradores y operar cuentas usa datos personales. La minimización reduce el alcance, no elimina esas obligaciones.

Fuentes consultadas: [obligaciones AAIP](https://www.argentina.gob.ar/aaip/datospersonales/responsables/obligaciones), [derechos de los titulares](https://www.argentina.gob.ar/aaip/datospersonales/derechos), [Render Key Value](https://render.com/docs/key-value), [Cloudinary: acceso a medios](https://cloudinary.com/documentation/control_access_to_media).

## Respuesta a incidentes y pedidos de privacidad

1. Recibí la solicitud/incidente en LEGAL_EMAIL y registrá fecha, alcance y responsable de respuesta en un registro privado.
2. Verificá identidad con acceso a la cuenta o un mecanismo proporcionado. No pidas contraseñas, tokens ni copias de documentos sensibles innecesarias.
3. Ante riesgo, pausá workers/operación, revocá sesiones y credenciales comprometidas; preservá evidencia mínima con acceso limitado.
4. Determiná cuentas y datos afectados, avisá a proveedores cuando corresponda y evaluá comunicaciones a titulares/autoridades con asesoramiento local.
5. Para derechos, atendé los plazos aplicables; como referencia AAIP, acceso en diez días corridos y rectificación/supresión en cinco hábiles. El botón de borrado inicia el proceso, no reemplaza tu responsabilidad de resolver fallos del proveedor.
6. Verificá limpieza en Cloudinary, base, sesiones, colas y backups según retención. No borres la evidencia necesaria de una obligación legal sin analizar el caso.
7. Documentá cierre, restauración y mejoras. Una recuperación de backup debe volver a aplicar bajas y revocaciones posteriores: el backup no debe reactivar cuentas eliminadas.
