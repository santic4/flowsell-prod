# Backend de Flow Sell

API Express para autenticación OAuth con Mercado Libre, automatizaciones posventa, plantillas, campañas y estadísticas por vendedor.

## Comandos

```bash
npm install
npm run dev
npm test
npm start
```

`npm start` levanta la API, sirve `public/build` y ejecuta los workers de BullMQ incluidos en la aplicación.

## Módulos principales

- `src/router`: endpoints HTTP y controles de autenticación.
- `src/services`: lógica de productos, plantillas, mensajes, seguimiento y estadísticas.
- `src/models`: persistencia multiusuario en MongoDB.
- `src/workers` y `src/utils/queue.js`: campañas, webhooks y mensajes diferidos.
- `src/integrations`: clientes de Mercado Libre y almacenamiento de imágenes en Cloudinary.

## Variables de entorno

Usá `.env.example` como base. Son obligatorios MongoDB, Redis, las credenciales OAuth de Mercado Libre, el secreto de sesión y las credenciales de Cloudinary.

En producción, configurá:

- `APP_URL` con el origen público de la aplicación, sin barra final.
- `REDIRECT_URI` con la URL completa `/api/auth/callback` registrada en Mercado Libre.
- `NODE_ENV=production` para cookies seguras.
- `COOKIE_DOMAIN` solo cuando la sesión deba compartirse entre subdominios.

Para Cloudinary configurá `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`. `CLOUDINARY_FOLDER` es opcional y por defecto usa `flowsell/templates`. Las credenciales se utilizan únicamente en el backend.

## Endpoints de estadísticas

- `GET /api/statistics/sales?from=AAAA-MM-DD&to=AAAA-MM-DD`
- `GET /api/statistics/sales/export?from=AAAA-MM-DD&to=AAAA-MM-DD`

Ambos requieren una sesión autenticada y siempre utilizan el `meliId` del usuario de esa sesión.
