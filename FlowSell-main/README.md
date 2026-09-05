# Flow Sell

Panel empresarial para vendedores de Mercado Libre. Centraliza publicaciones, automatizaciones posventa, plantillas, campañas y estadísticas en un espacio de trabajo multiusuario.

## Qué incluye esta versión

- Interfaz completamente rediseñada y responsive.
- Navegación reorganizada en **Resumen**, **Ventas**, **Publicaciones**, **Flujos**, **Plantillas** y **Campañas**.
- Acceso permanente a soporte por WhatsApp.
- Estadísticas por la cuenta de Mercado Libre autenticada: facturación, órdenes, unidades, ticket promedio, compradores, evolución diaria, productos destacados y últimas operaciones.
- Exportación de ventas a CSV compatible con Excel.
- Automatizaciones inmediatas y diferidas con control de orden y demora.
- Campañas guiadas en cuatro pasos, con seguimiento de progreso.
- Aislamiento de productos, plantillas, campañas y reportes por usuario.
- Sesiones persistentes, renovación de tokens y validaciones reforzadas.

> Esta versión no incorpora cobros ni suscripciones dentro de la aplicación, tal como se definió para esta etapa.

## Arquitectura

```text
FlowSell-main/
├── frontend/   React 19 + React Router
└── backend/    Express + MongoDB + BullMQ + Mercado Libre + Firebase Storage
```

El backend sirve el build de React ubicado en `backend/public/build`, por lo que puede desplegarse todo como un único servicio.

## Requisitos

- Node.js 22 o superior.
- MongoDB.
- Redis.
- Aplicación creada en Mercado Libre con OAuth configurado.
- Proyecto de Firebase con Storage habilitado, para los adjuntos de las plantillas.

## Puesta en marcha local

1. Copiá `backend/.env.example` como `backend/.env` y completá los valores.
2. Copiá `frontend/.env.example` como `frontend/.env`.
3. Instalá las dependencias:

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. Iniciá el backend:

   ```bash
   cd backend
   npm run dev
   ```

5. En otra terminal, iniciá el frontend:

   ```bash
   cd frontend
   npm start
   ```

El frontend quedará en `http://localhost:3000` y la API en `http://localhost:8080`.

## Build de producción

```bash
cd frontend
npm run build

cd ..
rsync -a --delete frontend/build/ backend/public/build/

cd backend
npm start
```

En el panel de desarrolladores de Mercado Libre, la URL de redirección debe coincidir exactamente con `REDIRECT_URI`, por ejemplo:

```text
https://tu-dominio.com/api/auth/callback
```

## Estadísticas y exportación

La pantalla **Ventas y estadísticas** consulta las órdenes pagadas directamente desde la cuenta de Mercado Libre de la sesión actual. El backend valida un rango máximo de 366 días, pagina los resultados, agrega métricas y mantiene una caché privada breve para evitar solicitudes repetidas.

El botón **Exportar CSV** descarga el detalle por artículo de cada orden dentro del mismo período seleccionado. Ningún usuario puede consultar el reporte o los trabajos de campaña de otra cuenta.

## Soporte

Los accesos de soporte abren WhatsApp con un mensaje precargado al número **+54 9 2342 51-0893**.

## Verificación

```bash
cd backend && npm test
cd ../frontend && CI=true npm test -- --watchAll=false
cd ../frontend && CI=true npm run build
```

Consultá los README de `frontend/` y `backend/` para detalles específicos de cada parte.
