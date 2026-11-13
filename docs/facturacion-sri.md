# Facturación electrónica SRI — Etapas 1, 2 y 3

## Alcance actual

Las Etapas 1 y 2 generan claves y XML; la Etapa 3 integra esa generación con el flujo de facturas local. No se conecta a los servicios del SRI para firmar, recibir o autorizar comprobantes.

El estado generado es siempre **“XML generado, pendiente de firma y autorización SRI”**. No se crea una firma electrónica, no se envía el comprobante y no se simula una respuesta ni una autorización del SRI.

## Especificación consultada

Se eligió el XML de factura **2.1.0**, conforme al `factura_V2.1.0.xsd` incluido en el paquete oficial de factura publicado por el SRI. La ficha consultada es la **Ficha Técnica de Comprobantes Electrónicos, esquema offline, versión 2.34**.

| Dato | Código / versión |
|---|---|
| Factura | `codDoc=01` |
| Identificación: RUC | `04` |
| Identificación: cédula | `05` |
| Identificación: pasaporte | `06` |
| Identificación: consumidor final | `07`; identificación `9999999999999`, nombre `CONSUMIDOR FINAL` |
| IVA | Código de impuesto `2`; tarifa 0%: código `0`; tarifa 15%: código `4` |
| Formas de pago aceptadas | `01` Sin utilización del sistema financiero; `15` Compensación de deudas; `16` Tarjeta de débito; `17` Dinero electrónico; `18` Tarjeta prepago; `19` Tarjeta de crédito; `20` Otros con utilización del sistema financiero; `21` Endoso de títulos |

La utilidad admite además los códigos de IVA que constan en la tabla consultada: 5% (`5`), 12% (`2`), 13% (`10`) y 14% (`3`). Para ventas, el backend usa la tarifa global configurada en `IVA_PORCENTAJE`; la aplicación no mantiene una tarifa por producto. La forma de pago sí se recoge en el registro de ventas; para ventas antiguas la migración asigna `01`.

Fuentes oficiales:

- [Portal de Facturación Electrónica del SRI](https://www.sri.gob.ec/facturacion-electronica)
- [Ficha técnica de comprobantes electrónicos, esquema offline, versión 2.34](https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/f8d9bb36-5632-4f96-b463-b9265b55338c/FICHA%20TE%cc%81CNICA%20COMPROBANTES%20ELECTRO%cc%81NICOS%20ESQUEMA%20OFFLINE%20Versio%cc%81n%202.34.pdf)
- [Paquete oficial XML y XSD de factura](https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/05546998-6f29-4870-be3b-62650f312a6c/XML%20y%20XSD%20Factura.zip)

## Clave de acceso

`backend/src/utils/facturas-sri.ts` arma la clave con fecha `ddmmaaaa`, tipo de comprobante, RUC, ambiente, establecimiento, punto de emisión, secuencial, código numérico y tipo de emisión normal. Los componentes numéricos de serie y secuencial se rellenan con ceros a la izquierda; el RUC del emisor debe tener 13 dígitos y terminar en `001`.

El dígito verificador se calcula sobre los primeros 48 dígitos: se recorre de derecha a izquierda con pesos cíclicos de 2 a 7, se resta la suma ponderada del siguiente múltiplo de 11 y se usa el residuo; si el resultado es 11 se convierte en 0, y si es 10, en 1. La utilidad de bajo nivel para probar claves permite recibir un código numérico explícito; en cambio, el generador de XML de facturas no acepta ese campo y genera siempre uno aleatorio con `crypto.randomInt`.

## XML, cálculos y datos requeridos

`crearXmlFacturaSri` produce `factura` versión `2.1.0`, en el orden definido por el esquema: `infoTributaria`, `infoFactura`, `detalles` y, cuando hay correo o dirección del comprador, `infoAdicional`. La librería `fast-xml-parser` construye el XML y escapa los caracteres especiales.

En `infoFactura`, `obligadoContabilidad` es opcional en el XSD (`minOccurs="0"`, valor `SI` o `NO`). En `infoTributaria`, `contribuyenteRimpe` también es opcional (`minOccurs="0"`, texto `CONTRIBUYENTE RÉGIMEN RIMPE`). Por tanto, el esquema no los exige para todos los emisores; deben incluirse cuando corresponda a la condición tributaria registrada del emisor. El generador todavía no recibe ni emite esos datos.

El generador requiere los datos del emisor, fecha, ambiente, serie, secuencial, comprador, al menos un detalle, tarifa global de IVA y una forma de pago explícita. Los campos opcionales como nombre comercial, dirección del establecimiento, correo, dirección del comprador y propina se incluyen cuando corresponda; una propina omitida se trata como cero. Cantidad y precio unitario conservan hasta seis decimales, conforme al XSD; los importes se redondean a dos decimales por línea y luego se agrupan por tarifa para los subtotales de impuesto y el total. La integración ajusta diferencias de centavos por redondeo de línea para hacer coincidir el IVA con el valor persistido en la venta.

Los identificadores distintos de consumidor final se validan usando la utilidad ecuatoriana existente del backend. La identificación `9999999999999` se normaliza al tipo y nombre oficiales de consumidor final.

## Variables de entorno

Las variables de emisor y ambiente están ejemplificadas en `.env.example` y el backend las lee para generar el XML. `SRI_AMBIENTE=1` corresponde a pruebas y `SRI_AMBIENTE=2` a producción.

```dotenv
SRI_AMBIENTE=1
EMISOR_RUC=
EMISOR_RAZON_SOCIAL=
EMISOR_NOMBRE_COMERCIAL=
EMISOR_DIRECCION_MATRIZ=
EMISOR_ESTABLECIMIENTO=001
EMISOR_PUNTO_EMISION=001
SRI_CERT_PATH=
SRI_CERT_PASSWORD=
```

En esta etapa, las variables del certificado son solo preparatorias: el generador no las lee ni firma. No poner contraseñas o certificados en el código o en el repositorio. `.gitignore` excluye `*.p12`, `*.pfx` y `/storage/xml/`.

## Etapa 3: integración local

Al emitir una factura, el backend intenta crear el XML con datos de la venta y guarda `001-001-secuencial.xml` en `/storage/xml`. El registro conserva número, clave, ambiente, estado SRI y mensaje; un error de XML queda explícito como `estado_sri=error`. La creación del PDF y de la factura continúa aunque la generación o escritura del XML falle. En ese caso el PDF indica que la clave es simulada; nunca se confunde con una clave SRI guardada.

La forma de pago se registra en `ventas.forma_pago`, acepta los códigos incluidos arriba y usa `01` por defecto para solicitudes antiguas. Los datos históricos reciben ese mismo valor al aplicar la migración.

Rutas protegidas:

- `GET /api/facturas/:id/xml`: descarga el XML a usuarios autenticados con rol admin o vendedor.
- `POST /api/facturas/:id/regenerar-xml`: regenera el XML (y actualiza el PDF con la clave real) para la misma factura/número; requiere rol admin y no crea otra factura. No permite regenerar una venta anulada.

El PDF muestra la clave real y el ambiente cuando el XML se generó correctamente. Mientras no exista una autorización real, mantiene el aviso “Documento de prueba sin autorización del SRI”. Si un correo tiene XML, adjunta PDF y XML; si el XML no está disponible, el intento de correo continúa con el PDF y la incidencia se registra, para no bloquear el envío existente.

La interfaz ofrece un selector de forma de pago, estado SRI con color, detalle de clave/ambiente/mensaje, descarga del XML y regeneración para admin. La firma y el envío al SRI no se invocan ni simulan.

### Aplicar la migración

En Windows PowerShell, desde la raíz del proyecto:

```powershell
docker cp .\database\migrations\008_fase9_sri_integracion.sql nexusai-postgres:/tmp/008_fase9_sri_integracion.sql
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U nexusai -d nexusai_stock -f /tmp/008_fase9_sri_integracion.sql
```

La migración es idempotente. El backend de esta etapa espera que se aplique antes de ejecutar rutas de ventas/facturas; aquí no se aplicó a la base de datos del usuario.

## Verificación y limitaciones

- Las pruebas unitarias cubren longitud y formato de la clave, módulo 11, ceros a la izquierda, ambientes 1 y 2, validación de RUC, mapeo de identificaciones, formas de pago, redondeo, agrupación y ajuste de centavos del IVA, y escape/estructura del XML.
- El XML de muestra está en [`ejemplos/factura-sri-ejemplo.xml`](./ejemplos/factura-sri-ejemplo.xml); fue validado con el XSD oficial `factura_V2.1.0.xsd` y el XSD XMLDSig complementario, con cero errores. La validación XSD no equivale a firma, recepción o autorización del SRI.
- El build y las pruebas automatizadas se ejecutaron para backend y frontend. No se conectó la aplicación a una base de datos para probar la migración ni el ciclo completo HTTP contra PostgreSQL.
- No se ha probado conectividad con servicios del SRI ni se ha usado un certificado `.p12`. Firma XAdES, envío SOAP y estados de autorización reales siguen pendientes.
- La venta existente solo tiene una tasa global de IVA. La forma de pago guardada inicialmente se usa para la factura; el usuario puede elegirla al registrar ventas nuevas. `obligadoContabilidad` y `contribuyenteRimpe` no se generan aún: son etiquetas opcionales del XSD, y deben agregarse en una etapa posterior con los datos tributarios reales del emisor.
