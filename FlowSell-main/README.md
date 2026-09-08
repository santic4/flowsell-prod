# Flow Sell · Seguridad, planes y guía

Código completo actualizado. React + Vite, Express, MongoDB, Redis/BullMQ y Cloudinary.

## Qué incluye

- Login responsive con información comercial y comparación de planes.
- Resumen, publicaciones, flujos, plantillas, campañas y estadísticas por cuenta.
- Guía pública e interna, privacidad y términos con aceptación versionada.
- Mi cuenta: consumos, actividad de envíos, exportación, cierre de sesiones, desconexión y eliminación.
- Planes Gratuito, Premium y Plus con restricciones reales en servidor y workers.
- Administración exclusiva por ID de Mercado Libre + autenticador TOTP; cambios de plan y métricas sin contenido de clientes.
- Tokens cifrados, CSRF, permisos por propietario, controles de archivos, cuotas, webhook validado y deduplicación de envíos.
- Imágenes privadas authenticated en Cloudinary; scripts de migración y rotación.
- Pruebas con MongoDB y Redis temporales; QA visual; flujo CI.

Los cobros se coordinan por fuera de la app. Solicitar un plan exige iniciar sesión y no lo activa automáticamente.

## Planes iniciales

| Capacidad | Gratuito | Premium | Plus |
| --- | ---: | ---: | ---: |
| Precio mensual de referencia | USD 0 | USD 19 | USD 39 |
| Flujos activos | 3 | 30 | 150 |
| Plantillas | 3 | 50 | 200 |
| Intentos de mensaje/mes | 100 | 3000 | 10000 |
| Campañas/mes | 0 | 5 | 20 |
| Compradores/campaña | — | 500 | 2000 |
| Almacenamiento | 25 MB | 250 MB | 1024 MB |
| Historial de ventas | 7 días | 90 días | 366 días |
| CSV y mensajes diferidos | No | Sí | Sí |

Los precios se configuran con PREMIUM_PRICE_USD y PLUS_PRICE_USD; el precio final, impuestos y condiciones se confirman antes de contratar. Los límites de cargas/transferencia también se detallan en Mi plan. Un downgrade conserva configuraciones y limita su ejecución.

## Por dónde empezar

1. Si ya usabas Flow Sell, leé [MIGRACION.md](MIGRACION.md) antes de actualizar.
2. Seguí [CONFIGURACION.md](CONFIGURACION.md): todas las envs, Redis en Render, Cloudinary, login y despliegue.
3. Completá las tareas reales de [SEGURIDAD-Y-PRIVACIDAD.md](SEGURIDAD-Y-PRIVACIDAD.md).
4. Revisá [VALIDACION.md](VALIDACION.md) para el alcance y límites de las pruebas.

## Comandos

Backend, desde backend:

```bash
npm ci
npm run secrets
npm run dev
```

Frontend, desde frontend:

```bash
npm ci
npm start
```

Usá Node.js 22.12 o superior dentro de 22 LTS, o 24 LTS. Frontend local en localhost:3000, backend en localhost:8080. Las envs no están incluidas con secretos reales.

Pruebas: npm --prefix backend test. Compilación: npm --prefix frontend run build. La salida se mantiene en frontend/build para conservar tu despliegue Render.

## Responsabilidades antes del lanzamiento

Los controles del código no activan MFA en cuentas externas, no contratan backups ni registran bases ante la AAIP. Completá datos del responsable, regiones reales, garantías de transferencias y revisión jurídica; luego LEGAL_READY=true habilita la aceptación y operación. Nunca publiques datos legales ficticios.

No se promete seguridad absoluta ni entrega exactamente una vez entre proveedores. Un envío incierto se detiene para revisión; los errores y cuotas se muestran en Mi cuenta.

## Actualización de login para cuentas existentes

Esta entrega corrige el regreso silencioso a /login cuando la cuenta anterior no tenía sessionVersion guardado. Reemplazá el código con esta versión, conservá tus envs y desplegá nuevamente. No regeneres SESSION_SECRET ni las claves de cifrado. Después iniciá sesión desde /login. La corrección no sustituye la migración de imágenes ni los pasos generales de MIGRACION.md.
