# Frontend Flow Sell

React + Vite. npm start usa localhost:3000 y un proxy /api hacia localhost:8080. npm run build genera build/ sin mapas de código fuente.

El único ajuste público opcional es REACT_APP_HOST_HOOKS. Vacío funciona con el mismo origen en Render y mediante proxy en desarrollo. No declares secretos en variables públicas.

Las rutas /privacy, /terms y /guide son públicas. /app usa sesión del backend. Los controles visuales de planes acompañan las restricciones obligatorias de la API.

Ver ../CONFIGURACION.md.
