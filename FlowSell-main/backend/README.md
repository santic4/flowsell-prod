# Backend Flow Sell

La implementación activa está en src/core, src/http y src/models.

- src/server.js inicia HTTP; src/worker.js permite separar el procesamiento.
- scripts/generate-secrets.mjs genera claves locales.
- scripts/migrate.mjs migra/rota tokens e imágenes existentes.
- scripts/check-redis.mjs verifica Redis sin imprimir credenciales.
- test/security.test.js comprueba permisos, planes, cifrado, archivos, sesiones y workers con bases temporales.
- qa/browser-check.mjs comprueba pantallas con datos ficticios y no crea rutas especiales en producción.

Configuración completa: ../CONFIGURACION.md. Actualizaciones: ../MIGRACION.md.
