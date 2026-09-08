# Migración desde Flow Sell con Cloudinary público

No hay que empezar de cero ni cambiar la base actual. Las plantillas y asignaciones se conservan. Los usuarios existentes quedan con plan Gratuito por defecto; el administrador puede asignar otro plan. No se agregan cobros automáticos.

## Orden de actualización

1. Guardá un backup consistente de MongoDB y una copia de las envs y del código anterior. Probá que el backup se pueda leer. Los backups con tokens antiguos también requieren protección.
2. Prepará un servicio staging con copia de datos de prueba, claves distintas y envs nuevas. Verificá login, catálogo, imágenes y un envío permitido con una cuenta de prueba.
3. Coordiná una ventana de mantenimiento. Detené el servicio anterior y sus workers. No basta con cambiar la URL del webhook: puede haber diferidos viejos pendientes.
4. Conservá el Redis antiguo hasta inventariar sus colas y decidir sobre trabajos pendientes. La versión nueva usa flowsell-v2 y **no ejecuta automáticamente trabajos antiguos**, porque podían contener mensajes, compradores y permisos antiguos. No vuelques colas de una versión a otra ni ejecutes FLUSHALL sobre un Redis compartido.
5. Completá las envs nuevas, incluyendo las claves de cifrado, antes de correr la migración. No cambies CLOUDINARY_FOLDER o el cloud name respecto del origen.
6. Con el servicio detenido, desde backend ejecutá:

```bash
npm ci
npm run migrate
npm run migrate -- --media
```

Esas dos ejecuciones simulan sin escribir. Revisá los contadores. Después de verificar tu respaldo y origen:

```bash
npm run migrate -- --apply --media
```

7. La migración cifra accessToken y refreshToken; invalida sesiones; crea el índice compuesto propietario + publicación y quita únicamente el índice antiguo id_1; agrega vencimiento a campañas anteriores y cancela sus estados de ejecución; elimina el caché de tokens sin propietario que esta versión no utiliza. Conserva los comprobantes de órdenes previas para no reenviarlas.
8. En Cloudinary descarga únicamente URLs originales del cloud/carpeta/propietario esperados, normaliza la imagen, crea una copia authenticated y actualiza la plantilla. **Sólo después** elimina la copia pública con invalidación. Si la eliminación falla, queda registro para reintentar. La caché externa puede tardar en purgarse y copias ya descargadas no se pueden revocar.
9. Repetí el comando si hay fallos transitorios; es reejecutable. La migración de imágenes usa temporalmente el cupo Plus (hasta 1 GB y 1500 cargas mensuales) para conservar archivos de cuentas existentes. Si una cuenta lo supera, requiere un proceso supervisado de migración; no se recortan sus datos en silencio.
10. Si unsupportedMedia es mayor que cero, hay URLs no reconocidas, de otro cloud o de Firebase. No se descargan direcciones arbitrarias. Verificá esos archivos en un entorno controlado, resubilos de forma privada y eliminá el origen desde el proveedor propietario. No inventes permisos ni borres archivos de otra cuenta. Las plantillas con vínculos antiguos no enviarán esas imágenes; el aviso aparece en Plantillas.
11. Actualizá el callback de notificaciones en Mercado Libre a /api/payments/WEBHOOK_SECRET y mantené el callback OAuth en /api/auth/callback.
12. Iniciá la nueva versión, volvé a ingresar y aceptá los documentos vigentes. Todos los vendedores necesitan aceptar la versión actual antes de volver a operar.
13. Probá con la cuenta propietaria: crear/editar/eliminar una plantilla con imagen, asignación, plan, CSV, webhook de una orden de prueba y diferido. No uses compras reales de terceros como pruebas.
14. Revisá fallidos y resultados inciertos. No relances campañas antiguas completas sin conciliar los mensajes ya enviados.

## Qué ocurre si algo falla

- El script no imprime tokens ni URLs privadas. Contadores mediaPending/unsupportedMedia y código de salida distinto de cero requieren atención.
- El borrado de una cuenta queda pendiente si todavía tiene archivos de la integración anterior. Ejecutá la migración --apply --media para retirar esos orígenes y luego dejá actuar al mantenimiento. Mientras tanto la cuenta no puede operar.
- Una imagen huérfana de una operación interrumpida se elimina por mantenimiento; las copias públicas pendientes se resuelven con la migración.
- No restaures código anterior sobre una base cuyos tokens ya están cifrados. Para volver atrás, mantené todo detenido y restaurá el backup compatible. Revisá primero las órdenes que ya se hayan enviado para no duplicarlas.
- El cifrado no borra copias anteriores de un backup. Protegé/rotá esos backups y evaluá revocar credenciales si pudieron estar expuestas.

## Rotar las claves de cifrado

1. Agregá una clave nueva de 32 bytes Base64 en TOKEN_ENCRYPTION_KEYS manteniendo todas las claves anteriores. Poné su ID en TOKEN_ENCRYPTION_ACTIVE_KEY.
2. Aplicá el mismo keyring al servidor y todos los workers.
3. Con los procesos detenidos, ejecutá npm run migrate y luego npm run migrate -- --apply. Cada token se abre con su clave anterior y se guarda con la activa.
4. Conservá las claves anteriores mientras existan backups cifrados que puedan necesitarlas. Guardalas separadas de los backups y con acceso limitado.
5. SESSION_SECRET invalida sesiones si cambia. WEBHOOK_SECRET exige actualizar la URL en Mercado Libre. Son claves distintas; no reutilices una en varias funciones.
