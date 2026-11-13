# NexusAI Stock

## 1. Descripción del proyecto

En este proyecto desarrollé NexusAI Stock, un sistema web para ayudar a pequeñas y medianas empresas (PyMEs) a llevar el control de su inventario, compras, ventas y clientes. También incluye una función para estimar la demanda de los productos y generar facturas en PDF y XML.

La idea nació de un problema común: cuando el inventario y las ventas se registran en lugares distintos o manualmente, cuesta saber qué productos se están agotando y cuándo reponerlos. Con esta aplicación busco reunir esa información y mostrar datos de ventas e inventario en un solo lugar.

## 2. Tecnologías

- **Frontend:** utilicé Angular y TypeScript. Para los gráficos usé Chart.js y ng2-charts.
- **Backend:** utilicé Node.js, Express y TypeScript. Organicé el código en rutas, controladores, servicios y repositorios.
- **Base de datos:** utilicé PostgreSQL y el paquete `pg` para ejecutar consultas SQL.
- **Autenticación y validación:** usé JSON Web Tokens con `jsonwebtoken`, `bcryptjs` para guardar contraseñas con hash y `zod` para validar los datos.
- **Ejecución local:** utilicé Docker Compose para iniciar PostgreSQL.
- **Otras librerías del backend:** `helmet`, `cors` y `express-rate-limit` para aspectos de seguridad y solicitudes HTTP; `fast-xml-parser` para el XML; `pdfkit` para el PDF; `nodemailer` para el correo; y `dotenv` para cargar variables de entorno.

La predicción la calculé usando el historial de ventas. Las ventas recientes tienen más peso que las antiguas, y con el resultado se muestran alertas de stock. No conecté un servicio externo de inteligencia artificial.

## 3. Perfiles de usuario y responsabilidades

En el sistema hay dos roles: `admin` y `vendedor`. Las rutas protegidas primero comprueban que el usuario tenga un JWT válido y después revisan si su rol le permite hacer la operación.

- **Administrador (`admin`):** puede administrar productos, categorías y proveedores; crear y gestionar pedidos; administrar clientes; registrar y consultar ventas, y anularlas; gestionar facturas y regenerar el XML; además de crear usuarios y cambiar la configuración o recalcular las predicciones.
- **Vendedor (`vendedor`):** puede consultar el catálogo, clientes, ventas, pedidos, facturas, dashboard y predicciones. También puede crear clientes y ventas, generar facturas y enviarlas por correo. No puede modificar el catálogo, anular ventas, administrar pedidos, regenerar XML ni cambiar la configuración de predicción.

El registro desde la aplicación crea una cuenta de vendedor. Solo un administrador puede crear usuarios asignándoles un rol. El inicio de sesión y el registro tienen un límite de intentos.

## 4. Endpoints de la API

La API usa `/api` como prefijo. Las rutas marcadas como públicas no necesitan iniciar sesión; para las demás se requiere un token. En la lista indico si una ruta es pública o qué rol puede utilizarla.

### Salud

- GET /api/health — comprueba la conexión con PostgreSQL (Público).

### Autenticación y usuarios

- POST /api/auth/register — registra una cuenta de vendedor (Público).
- POST /api/auth/login — inicia sesión y devuelve el JWT (Público).
- GET /api/auth/me — obtiene el usuario asociado al token (Admin y vendedor).
- POST /api/auth/usuarios — crea un usuario con rol asignado (Admin).

### Categorías

- GET /api/categorias — lista categorías (Admin y vendedor).
- GET /api/categorias/{id} — obtiene una categoría (Admin y vendedor).
- POST /api/categorias — crea una categoría (Admin).
- PUT /api/categorias/{id} — actualiza una categoría (Admin).
- DELETE /api/categorias/{id} — elimina una categoría (Admin).

### Clientes

- GET /api/clientes — lista y busca clientes (Admin y vendedor).
- GET /api/clientes/buscar — busca un cliente por identificación (Admin y vendedor).
- GET /api/clientes/{id} — obtiene un cliente (Admin y vendedor).
- POST /api/clientes — crea un cliente (Admin y vendedor).
- PUT /api/clientes/{id} — actualiza un cliente (Admin).
- DELETE /api/clientes/{id} — elimina un cliente (Admin).

### Productos

- GET /api/productos — lista y filtra productos (Admin y vendedor).
- GET /api/productos/bajo-stock — lista productos con existencias bajas (Admin y vendedor).
- GET /api/productos/por-caducar — lista productos próximos a caducar (Admin y vendedor).
- GET /api/productos/{id} — obtiene un producto (Admin y vendedor).
- POST /api/productos — crea un producto (Admin).
- PUT /api/productos/{id} — actualiza un producto (Admin).
- DELETE /api/productos/{id} — elimina un producto (Admin).

### Proveedores

- GET /api/proveedores — lista proveedores (Admin y vendedor).
- GET /api/proveedores/{id} — obtiene un proveedor (Admin y vendedor).
- POST /api/proveedores — crea un proveedor (Admin).
- PUT /api/proveedores/{id} — actualiza un proveedor (Admin).
- DELETE /api/proveedores/{id} — elimina un proveedor (Admin).

### Ventas

- GET /api/ventas — lista ventas (Admin y vendedor).
- GET /api/ventas/{id} — obtiene una venta y su detalle (Admin y vendedor).
- POST /api/ventas — registra una venta (Admin y vendedor).
- POST /api/ventas/{id}/anular — anula una venta (Admin).

### Pedidos

- GET /api/pedidos — lista pedidos (Admin y vendedor).
- GET /api/pedidos/{id} — obtiene un pedido y su detalle (Admin y vendedor).
- POST /api/pedidos — crea un pedido (Admin).
- PUT /api/pedidos/{id} — actualiza un pedido pendiente (Admin).
- DELETE /api/pedidos/{id} — elimina un pedido pendiente (Admin).
- PATCH /api/pedidos/{id}/recibir — registra la recepción de un pedido (Admin).
- PATCH /api/pedidos/{id}/cancelar — cancela un pedido pendiente (Admin).

### Facturas

- GET /api/facturas — lista facturas (Admin y vendedor).
- GET /api/facturas/{id} — obtiene una factura (Admin y vendedor).
- POST /api/facturas/generar/{id} — genera la factura para una venta (Admin y vendedor).
- POST /api/facturas/{id}/enviar-correo — envía la factura por correo (Admin y vendedor).
- GET /api/facturas/{id}/pdf — descarga el PDF de la factura (Admin y vendedor).
- GET /api/facturas/{id}/xml — descarga el XML generado (Admin y vendedor).
- POST /api/facturas/{id}/regenerar-xml — regenera el XML de una factura existente (Admin).

### Dashboard

- GET /api/dashboard/resumen-ventas — obtiene indicadores de ventas (Admin y vendedor).
- GET /api/dashboard/resumen-compras — obtiene indicadores de compras (Admin y vendedor).
- GET /api/dashboard/resumen-inventario — obtiene indicadores de inventario (Admin y vendedor).
- GET /api/dashboard/resumen-productos — obtiene indicadores de productos, proveedores y categorías (Admin y vendedor).
- GET /api/dashboard/ventas-historicas — consulta la serie histórica de ventas (Admin y vendedor).

### Predicción

- GET /api/prediccion — lista predicciones y resumen de alertas (Admin y vendedor).
- GET /api/prediccion/alertas — lista productos con alertas de stock (Admin y vendedor).
- GET /api/prediccion/serie — consulta ventas históricas y proyección (Admin y vendedor).
- GET /api/prediccion/producto/{id} — obtiene la predicción de un producto (Admin y vendedor).
- POST /api/prediccion/recalcular — recalcula y guarda las predicciones (Admin).

### Configuración de predicción

- GET /api/configuracion-ia — consulta los parámetros de predicción (Admin y vendedor).
- PUT /api/configuracion-ia — actualiza los parámetros de predicción (Admin).

## 5. Cómo ejecutar el proyecto

### Requisitos

- Node.js compatible con Angular 22: versión `22.22.3` o superior dentro de la rama 22, o `24.15.0` o superior dentro de la rama 24.
- npm.
- Docker Desktop con Docker Compose.
- Git.

### Clonar y configurar

En PowerShell, sustituye `<URL_DEL_REPOSITORIO>` por la dirección del repositorio:

```powershell
git clone <URL_DEL_REPOSITORIO> nexusai-stock
Set-Location .\nexusai-stock
Copy-Item .env.example .env
```

Después de copiar el archivo, completa en `.env` las variables necesarias para tu equipo, como la clave JWT y los datos del administrador. No publiques ese archivo porque contiene configuración privada.

### Iniciar PostgreSQL y aplicar migraciones

```powershell
docker compose up -d postgres
docker compose ps
```

La primera vez que se crea el volumen de PostgreSQL, Docker ejecuta `database/init/001_schema.sql` para crear las tablas y cargar datos de ejemplo. Después, hay que aplicar las migraciones `002` a `008`, en orden:

```powershell
Get-ChildItem .\database\migrations\*.sql | Sort-Object Name | ForEach-Object {
    Write-Host "Aplicando $($_.Name)"
    Get-Content -Raw $_.FullName | docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
    if ($LASTEXITCODE -ne 0) {
        throw "Falló la migración $($_.Name)"
    }
}
```

La migración `007_fase6_datos_demo.sql` agrega ventas de ejemplo y puede ajustar el stock para que se puedan probar las alertas de predicción.

### Instalar y ejecutar el backend

```powershell
Set-Location .\backend
npm install
npm run seed:admin
npm run dev
```

El comando `npm run seed:admin` crea el usuario administrador con los datos configurados en `.env`, si todavía no existe. Al iniciar el backend, la API queda disponible normalmente en `http://localhost:4000/api`.

### Instalar y ejecutar el frontend

En otra terminal de PowerShell, desde la raíz del proyecto:

```powershell
Set-Location .\frontend
npm install
npx ng serve
```

La aplicación queda disponible normalmente en `http://localhost:4200`. Se puede comprobar que el backend responde en `http://localhost:4000/api/health`.

## 6. Estructura de carpetas

```text
nexusai-stock/
├── backend/
│   ├── scripts/                 # Carga inicial del administrador
│   └── src/
│       ├── config/              # Configuración de entorno y base de datos
│       ├── controllers/         # Controladores HTTP
│       ├── middlewares/         # Autenticación, roles y límites de intentos
│       ├── providers/           # Proveedores de facturación y PDF/correo
│       ├── repositories/        # Consultas PostgreSQL
│       ├── routes/              # Endpoints de la API
│       ├── services/            # Lógica de negocio
│       ├── types/               # Tipos TypeScript
│       └── utils/               # Validación, cálculos y generación XML
├── database/
│   ├── init/                    # Esquema y datos iniciales
│   └── migrations/              # Migraciones SQL numeradas
├── docs/                        # Documentación y ejemplo de XML
├── frontend/
│   └── src/app/                 # Aplicación Angular
├── storage/                     # PDF y XML generados localmente
├── docker-compose.yml
├── .env.example
└── README.md
```

## 7. Estado del proyecto

**Lo que ya funciona:** administración del catálogo y clientes según los permisos; inicio de sesión con los roles `admin` y `vendedor`; registro de ventas que actualiza el inventario; pedidos a proveedores; dashboard y predicción de demanda; generación de facturas PDF y envío por correo si se configura SMTP. También se genera un XML con una clave de acceso de 49 dígitos. Si falla la generación del XML, la venta y el PDF pueden continuar.

**Lo que falta:** firmar electrónicamente el XML, enviarlo al SRI y recibir una autorización real. Por ahora, generar el XML no significa que la factura esté autorizada por el SRI. También falta desplegar el sistema en un entorno de producción.

## 8. Autor

- **Nombre:** Freddy Baque
- **Semestre:** 5to semestre
- **Carrera:** Desarrollo de Software
- **Materia:** Full Stack
