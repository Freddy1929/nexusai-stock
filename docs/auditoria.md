# Auditoría de NexusAI Stock

## Alcance y resultado

Se revisaron las rutas, servicios, validaciones y consultas del API, además de la carga de datos, formularios, permisos, sesión, navegación y modales del frontend. Las correcciones mantienen el diseño existente, excepto la incorporación necesaria de la pantalla y el acceso a Clientes.

La causa común de varias pantallas que aparecían vacías era que Angular utilizaba componentes `OnPush` y algunas respuestas RxJS actualizaban propiedades sin notificar de forma fiable a la vista. Esto podía hacer que los datos parecieran aparecer después de un clic. Se centralizó la notificación de cambios al recibir, fallar o completar esas peticiones. El ETag y `Cache-Control: no-store` ya estaban configurados en el API y se conservaron.

## Hallazgos y correcciones

| Problema encontrado | Causa | Archivo(s) corregido(s) o revisado(s) | Cómo probarlo |
|---|---|---|---|
| Listas y panel podían quedarse vacíos hasta una interacción | Los componentes `OnPush` no siempre detectaban los cambios hechos desde algunas suscripciones HTTP. Se añadió una utilidad común de notificación de cambios y se usó en las pantallas de datos. | `frontend/src/app/core/utils/subscribe-with-change-detection.ts`; `frontend/src/app/features/dashboard/dashboard.component.ts`; `frontend/src/app/features/inventario/inventario.component.ts`; `frontend/src/app/features/proveedores/proveedores.component.ts`; `frontend/src/app/features/pedidos/pedidos.component.ts`; `frontend/src/app/features/facturacion/facturacion.component.ts` | Iniciar sesión y abrir cada pantalla; comprobar que los datos y contadores aparecen sin hacer clic en la campana ni ejecutar otra acción. |
| Un error HTTP o una lista vacía podía parecer una pantalla sin respuesta | Los estados de carga, error y vacío no estaban diferenciados consistentemente en las listas. Se agregaron mensajes y opciones de reintento donde corresponde. | Los componentes de Panel, Inventario, Proveedores, Pedidos y Facturación listados arriba | Desconectar temporalmente el API para verificar el mensaje de error; restaurarlo y abrir una cuenta sin registros para verificar el estado vacío. |
| Riesgo de sobrescribir movimientos de stock concurrentes al editar un producto | La actualización guardaba una cantidad final sin confirmar que el stock seguía siendo el mismo que se había leído al abrir el formulario. La API ahora compara la cantidad original en la misma operación; si cambió, responde `409 Conflict`. | `backend/src/repositories/productos.repository.ts`; `backend/src/utils/schemas.ts`; `backend/src/controllers/productos.controller.ts`; `backend/src/services/productos.service.ts`; `frontend/src/app/features/inventario/inventario.component.ts`; `backend/src/utils/productos-schemas.test.ts` | Abrir la edición en dos sesiones, modificar stock desde una y guardar desde la otra. La segunda debe recibir un conflicto y no reemplazar el stock actualizado. |
| No había una pantalla para administrar clientes ni alta desde la venta | El flujo de venta necesitaba encontrar o crear clientes, pero faltaba una pantalla dedicada y el formulario de venta no permitía dar de alta a un cliente en contexto. | `frontend/src/app/features/clientes/clientes.component.ts`; `frontend/src/app/app.routes.ts`; `frontend/src/app/shell.component.ts`; `frontend/src/app/features/facturacion/facturacion.component.ts`; servicios y modelos de clientes en `frontend/src/app/core/` | Abrir Clientes, buscar y crear/editar/eliminar según el rol; desde una venta, crear un cliente y verificar que quede seleccionado. |
| El vendedor podía intentar editar clientes; el consumidor final es un registro reservado | La política de roles no restringía la edición de clientes al administrador. Se limitó editar y borrar a admin; se mantiene la creación por vendedor para el flujo de venta. El consumidor final reservado no ofrece acciones de edición/eliminación y la API protege ese registro y su identificación. | `backend/src/routes/clientes.routes.ts`; `backend/src/services/clientes.service.ts`; `frontend/src/app/features/clientes/clientes.component.ts` | Con usuario vendedor, comprobar que puede listar/crear clientes, pero no editar ni borrar; con admin comprobar las acciones permitidas. Confirmar que el cliente reservado no tiene acciones. |
| Se podía intentar vender más unidades que las disponibles | La interfaz no relacionaba la cantidad ingresada con el stock conocido antes de permitir registrar la venta. Se agregó validación visible y explicación junto al botón deshabilitado. | `frontend/src/app/features/facturacion/facturacion.component.ts` | Agregar un producto a la venta, ingresar una cantidad superior al stock y confirmar que no se permite registrar; probar luego una cantidad válida. |
| Modales podían dejar el fondo bloqueado o no cerrarse con los controles esperados | Faltaba gestionar de forma uniforme Escape, clic fuera y la restauración del scroll al cerrar o destruir el modal. | `frontend/src/app/shared/ui.components.ts`; `frontend/src/app/shared/ui.components.spec.ts` | Abrir un modal y cerrarlo con X, Cancelar, Escape y clic fuera; verificar que la página vuelve a desplazarse normalmente. |
| La campana no mostraba alertas de inventario útiles | La campana no presentaba alertas derivadas de los endpoints de bajo stock y caducidad; tampoco debía disparar recargas de las pantallas. Se conectó a las alertas disponibles, con contador y cierre al hacer clic fuera. | `frontend/src/app/core/services/notification.service.ts`; `frontend/src/app/shell.component.ts`; `frontend/src/app/shell.component.spec.ts` | Abrir y cerrar la campana: no debe recargar la tabla. Probar con productos bajo mínimo o por caducar y confirmar el contador; sin alertas debe aparecer “No tienes notificaciones nuevas”. |
| Token inválido o expirado debía terminar en una pantalla de carga | La sesión requiere manejar `401` centralmente para limpiar autenticación y regresar al login, y comunicar errores `403`/HTTP. Se cubrió el comportamiento del interceptor con pruebas y se conservaron los guards de autenticación/rol. | `frontend/src/app/core/http.interceptors.ts`; servicios de autenticación y guards en `frontend/src/app/core/`; `frontend/src/app/core/http.interceptors.spec.ts` | Iniciar sesión, invalidar o retirar el token y abrir una ruta protegida: debe volver al login; como vendedor, intentar una ruta de admin y confirmar que no se abre. |
| Se necesitaban defensas básicas adicionales en el API | No estaba habilitado Helmet ni existía el mismo límite de intentos para registro que para login. Se añadió Helmet y un límite de registro de 5 intentos por 15 minutos. | `backend/src/app.ts`; `backend/src/middlewares/login-limiter.ts`; `backend/src/routes/auth.routes.ts`; `backend/package.json`; `backend/package-lock.json` | Verificar encabezados HTTP en una respuesta del API y, en un ambiente de prueba, exceder el límite de registro para recibir una respuesta de limitación. |
| Riesgo de respuesta cacheada sin cuerpo en las rutas del API | Express podía responder `304` cuando el frontend esperaba JSON. La configuración ya estaba aplicada y se confirmó en la revisión: ETag desactivado y `Cache-Control: no-store` para `/api`. | `backend/src/app.ts` | Consultar un endpoint JSON, también enviando `If-None-Match` si se dispone de una herramienta como Bruno. Debe devolver JSON completo, no un `304` vacío. |
| Búsqueda global y opciones de menú no eran claras para todos los roles | La búsqueda superior no explicaba que se enfocaba en productos y el menú podía mostrar configuración de IA a vendedores. Se aclaró la búsqueda y se ocultó esa opción al vendedor. | `frontend/src/app/shell.component.ts` | Iniciar sesión como admin y vendedor; comprobar la etiqueta/uso de búsqueda y la visibilidad de Configuración IA según el rol. |

### Controles revisados que no necesitaron cambios

- Los endpoints principales usan validación Zod y consultas SQL parametrizadas; en la inspección no se encontró concatenación de datos del usuario para construir consultas.
- Las operaciones de ventas y recepción de pedidos ya usan transacciones y bloqueos de filas para proteger el stock. La API evita recibir de nuevo un pedido que ya no está pendiente.
- La configuración existente de CORS permite el origen del frontend en desarrollo. No se modificó porque no era necesario para la integración solicitada.
- El `.env` no se leyó ni se incluyó en el reporte. La raíz del proyecto ya lo excluye mediante `.gitignore`.
- La interfaz mantiene los formatos de moneda y fecha configurados para español y la API devuelve errores procesados por el interceptor para que no se conviertan en fallos silenciosos.

## Verificación automatizada

Verificación realizada después de las correcciones:

| Componente | Comando | Resultado |
|---|---|---|
| Frontend | `npm run build` | Correcto, compilación de producción exitosa. |
| Frontend | `npm test -- --watch=false` | 11 archivos y 21 pruebas pasaron. |
| Backend | `npm run build` | Correcto, compilación TypeScript exitosa. |
| Backend | `npm test` | 2 archivos y 12 pruebas pasaron. |

También se inició el frontend localmente y se comprobó la pantalla de login a 390 px y 768 px: el ancho de desplazamiento coincidió con el ancho visible, sin desbordamiento horizontal en esa pantalla. No se validaron visualmente todas las rutas protegidas en esos tamaños.

## Pendientes y límites de esta auditoría

- No se ejecutó una prueba de concurrencia real con dos transacciones simultáneas contra PostgreSQL. El control de conflicto está cubierto a nivel de lógica y validación; conviene ejercitarlo con la base de datos de pruebas.
- No se verificaron en esta pasada todos los permisos mediante peticiones HTTP contra una API en ejecución. Hacer la prueba manual indicada con cuentas reales de admin y vendedor.
- La comprobación de responsive en navegador cubrió el login, no cada tabla, modal y pantalla a 390 px y 768 px.
- El limitador de registro funciona por IP y memoria local: en despliegues con varios procesos/instancias se debe configurar un almacén compartido y revisar el proxy confiable.
- Antes de producción deben revisarse TLS, el origen CORS definitivo, `trust proxy`, políticas de alta de usuarios y la configuración del proveedor de base de datos. No se cambiaron porque dependen del entorno de despliegue.
- No se añadieron funcionalidades de PDF, correo ni IA; permanecen fuera del alcance de esta fase.

## Pruebas manuales recomendadas

1. En terminales separadas, iniciar PostgreSQL y el backend desde `backend` (`npm run dev`); iniciar el frontend desde `frontend` (`npm start`).
2. Abrir `http://localhost:4200`, iniciar sesión y recargar con `Ctrl + F5`. Confirmar que Panel, Inventario, Proveedores, Pedidos y Facturación carguen sin usar la campana para activar la vista.
3. En Inventario, crear, editar y eliminar un producto con una cuenta admin. Confirmar que la tabla e indicadores se vuelven a consultar y que una edición obsoleta de stock muestra conflicto.
4. En Proveedores, Clientes, Pedidos y Facturación, revisar carga, búsqueda, filtros/paginación, estados vacíos, errores del API y actualización de las listas después de guardar o completar acciones.
5. En una venta, probar un cliente existente, crear un cliente desde el modal y seleccionar cantidades válidas e inválidas para comprobar el límite de stock.
6. Abrir y cerrar un modal con X, Cancelar, clic fuera y Escape. Abrir la campana y verificar que presenta alertas reales o el mensaje vacío, sin recargar la pantalla.
7. Repetir las pruebas de navegación con un usuario vendedor. Confirmar que no puede acceder a operaciones de admin ni a Configuración IA y que un `401` lo devuelve al login.
8. Cambiar el tamaño del navegador a 390 px y 768 px y recorrer tablas y modales para detectar desbordamientos que no aparecen en la pantalla de login.
