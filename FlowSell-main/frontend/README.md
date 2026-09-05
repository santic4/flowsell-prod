# Frontend de Flow Sell

Aplicación React responsive para operar Flow Sell desde escritorio, tablet o celular.

## Comandos

```bash
npm install
npm start
CI=true npm test -- --watchAll=false
CI=true npm run build
```

## Configuración

Copiá `.env.example` a `.env` y definí `REACT_APP_HOST_HOOKS` con el origen del backend. En un despliegue de origen único puede dejarse vacío.

## Secciones

- **Resumen:** indicadores y accesos rápidos.
- **Ventas:** métricas por período, evolución, ranking y exportación CSV.
- **Publicaciones:** catálogo sincronizado desde Mercado Libre.
- **Flujos:** mensajes inmediatos y posventa diferida.
- **Plantillas:** biblioteca, editor y adjuntos.
- **Campañas:** selección de publicaciones, audiencia, contenido y envío.

El build final se genera en `frontend/build` y debe copiarse a `backend/public/build` para que Express lo sirva en producción.
