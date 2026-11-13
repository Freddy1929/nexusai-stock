# NexusAI Stock · Front-end

Aplicación web en Angular 22 con componentes standalone, rutas de carga diferida, formularios reactivos y gráficos con Chart.js. La interfaz está en español y consume el back-end local en `http://localhost:4000/api`.

## Requisitos

- Node.js compatible con Angular CLI 22.
- API de NexusAI Stock iniciada en `http://localhost:4000/api`.
- Base de datos PostgreSQL disponible para los flujos conectados.

## Instalar y ejecutar

Desde esta carpeta:

```powershell
npm install
npm run start
```

Abre `http://localhost:4200`. También se puede iniciar con `npx ng serve`. La URL de la API está en `src/environments/environment.ts`.

## Validar

```powershell
npm run build
npm test -- --watch=false
```

## Pantallas

- **Panel principal:** resúmenes de ventas, compras, inventario y catálogo con selector de rango de 7 días, 30 días o 6 meses (predeterminado); gráfico histórico semanal o mensual usando el mismo rango. La proyección IA aparece como serie vacía hasta que exista un endpoint de predicción.
- **Inventario:** consulta, búsqueda, filtros, paginación y CRUD para administradores.
- **Proveedores:** directorio y CRUD para administradores.
- **Clientes:** listado paginado y búsqueda con creación para el equipo de ventas, edición y eliminación para administradores.
- **Pedidos:** listado paginado, detalle, creación y recepción o cancelación para administradores.
- **Facturación:** registro de venta mediante búsqueda de cliente, selección de productos e historial. Por cada venta no anulada se puede generar su factura PDF, descargarla y enviarla al correo del cliente; el estado del envío queda visible.
- **Predicción IA y Configuración IA:** maquetas sin llamadas a endpoints que todavía no existen.

## Archivos principales

- `src/app/app.routes.ts`: rutas, guards y carga diferida de cada pantalla.
- `src/app/core/models/api.models.ts`: contratos TypeScript basados en las respuestas del backend.
- `src/app/core/services/entity-api.services.ts`: servicios HTTP para catálogo, operaciones y panel.
- El servicio HTTP de facturas usa las rutas `/api/facturas` para generar, listar, descargar y enviar comprobantes.
- `src/app/core/services/notification.service.ts`: alertas de stock bajo y productos próximos a caducar.
- `src/app/core/utils/subscribe-with-change-detection.ts`: actualiza la vista después de cada emisión HTTP en las pantallas con detección OnPush.
- `src/app/core/services/auth.service.ts`: inicio de sesión, token y usuario actual.
- `src/app/core/http.interceptors.ts` y `src/app/core/auth.guards.ts`: encabezado JWT, errores y control de acceso.
- `src/app/shared/ui.components.ts`: modal, tabla paginada, tarjeta de resumen, paginación, badge y toasts.
- `src/main.ts` y `src/app/app.config.ts`: configuración de Zone.js y detección de cambios.
- `src/app/features/`: pantallas independientes cargadas bajo demanda.
- `src/styles.scss`: tipografía, colores, componentes y diseño responsive.

Las pantallas de Panel, Inventario, Proveedores, Clientes, Pedidos y Facturación usan detección OnPush y notifican el cambio después de recibir respuestas HTTP. La campana abre un panel con alertas reales de stock y caducidad; los datos se consultan al iniciar la aplicación y después de operaciones que pueden cambiar el stock, no al pulsar la campana. También presentan estados visibles de carga, error y lista vacía. La API desactiva ETag y envía `Cache-Control: no-store` en `/api` para evitar respuestas sin cuerpo por caché. La API ya permite CORS desde `http://localhost:4200`; no se requieren cambios adicionales al back-end para ejecutar la aplicación con su configuración local predeterminada.

## Herramientas de apoyo
Este proyecto se desarrolló con apoyo de herramientas de IA (Claude y GitHub Copilot).
Revisé, probé y ajusté el código y la documentación.