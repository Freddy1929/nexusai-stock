# Facturación con Odoo y SRI — Fase 9

## Alcance actual: etapa 1

Se preparó un contenedor local de Odoo 18.0 y una base PostgreSQL exclusiva para Odoo. Esta etapa **no cambia el provider de facturación de NexusAI**: sigue seleccionado `PdfLocalProvider` y el backend no consulta Odoo todavía. Las etapas siguientes se implementarán después de que confirmes que Odoo inicia y se puede configurar.

El usuario indicó que dispone de Odoo Enterprise, pero el contenedor actual usa la imagen oficial `odoo:18.0-20261112`, que aporta el servidor Community. Una suscripción/licencia Enterprise no convierte por sí sola esta imagen en Enterprise: los addons Enterprise oficiales compatibles con la versión 18.0 deben colocarse localmente en `odoo/enterprise-addons/` y no se subirán a Git. Actualmente esa carpeta contiene solo `.gitkeep`.

## Hallazgos en fuentes oficiales

- La imagen oficial de Docker publica la rama 18.0, incluida la etiqueta `18.0-20261112`, y recomienda persistir `/var/lib/odoo` y los datos de PostgreSQL en volúmenes: [imagen oficial de Odoo](https://hub.docker.com/_/odoo).
- `l10n_ec` existe en el repositorio público de Odoo 18, está bajo licencia LGPL-3 y declara dependencias contables/localización de Latinoamérica: [manifiesto oficial de l10n_ec](https://github.com/odoo/odoo/blob/18.0/addons/l10n_ec/__manifest__.py). La localización incluye plan de cuentas, impuestos, tipos de identificación y datos ecuatorianos.
- El módulo base `l10n_ec` sí está en el árbol público Community de Odoo 18. La documentación oficial también enumera `l10n_ec_edi` para documentos electrónicos ecuatorianos, pero ese addon no está en el árbol público Community y pertenece a los addons Enterprise: debe obtenerse de la distribución Enterprise oficial de la misma versión. La carpeta montada por Compose está vacía (salvo `.gitkeep`), y `l10n_ec_edi` no está disponible en el contenedor actual; su instalación aún no se ha probado: [localización ecuatoriana](https://www.odoo.com/documentation/18.0/applications/finance/fiscal_localizations/ecuador.html).
- La documentación de la API externa describe XML-RPC en `/xmlrpc/2/common` y `/xmlrpc/2/object`. Una API key se usa en lugar de la contraseña, conservando el usuario; debe guardarse como una contraseña: [API externa y API keys](https://www.odoo.com/documentation/18.0/developer/reference/external_api.html).
- En la configuración ecuatoriana, Odoo indica que el certificado es de la compañía y que **Use production servers** debe quedar desmarcado para usar el ambiente de pruebas: [configuración de Ecuador](https://www.odoo.com/documentation/18.0/applications/finance/fiscal_localizations/ecuador.html).

La imagen elegida es Odoo 18.0 porque está soportada por la imagen oficial y es la opción más reciente entre 17.0 y 18.0 solicitadas. No se afirma que la conexión SRI haya sido probada ni autorizada.

## Preparación segura

1. Copia `.env.example` a `.env` solo si aún no tienes un `.env`. Si ya existe, conserva sus claves actuales y agrega únicamente las variables `ODOO_*` nuevas.
2. Usa contraseñas diferentes y aleatorias para `ODOO_DB_PASSWORD` y `ODOO_MASTER_PASSWORD`. En el `.env` local del workspace ya se generaron valores aleatorios para esas dos variables; no se han mostrado ni se han agregado al repositorio.
3. Copia los addons Enterprise oficiales de la misma versión 18.0 dentro de `odoo/enterprise-addons/`. No se incluyen ni se copian aquí porque son software licenciado.
4. `ODOO_USER` y `ODOO_API_KEY` se completan más adelante para integrar el backend; no son necesarios para iniciar la interfaz.

## Levantar Odoo

Desde PowerShell, en la raíz del proyecto:

```powershell
docker compose config
docker compose up -d odoo-postgres odoo
docker compose ps
docker compose logs --tail 100 odoo
```

Abre `http://localhost:8069`. Odoo usa el puerto local 8069; su PostgreSQL vive en el servicio `odoo-postgres`, no publica el puerto 5432 y no reutiliza `nexusai-postgres`. La API NexusAI continúa usando 4000. Los volúmenes `odoo_postgres_data` y `odoo_data` conservan la base y el filestore aunque se recreen los contenedores.

## Configuración inicial por interfaz de Odoo

Los siguientes pasos son manuales en la interfaz de Odoo:

1. En la primera pantalla crea la base `nexusai_odoo`. Para el **Master Password** usa el valor privado de `ODOO_MASTER_PASSWORD` en tu `.env`; crea el usuario administrador de Odoo y conserva sus credenciales. Desactiva los datos de demostración si se ofrece esa opción.
2. En la creación inicial selecciona **Ecuador** como país de la compañía. La localización fiscal predeterminada depende del país seleccionado al crear la base; no contabilices movimientos hasta confirmar que Ecuador aparece seleccionado.
3. Desde **Apps**, instala **Accounting** o **Invoicing**. Confirma que está disponible `l10n_ec` y que la localización muestra el plan de cuentas ecuatoriano. La localización instala sus impuestos y tipos documentales base.
4. Instala `l10n_ec_edi` desde Apps solo si aparece y sus dependencias Enterprise están presentes. Si no aparece, no inventes ni descargues un módulo de procedencia no oficial: confirma el origen/versión de tus addons Enterprise antes de continuar.
5. Ve a **Contabilidad → Configuración → Ajustes** y completa la compañía: razón social legal, RUC, dirección, régimen aplicable (Régimen General o RIMPE) y, si corresponde, condición de contribuyente especial y obligación de llevar contabilidad. Verifica los datos tributarios con el responsable contable.
6. En la sección de localización ecuatoriana, deja **Use production servers** desactivado; así se selecciona el servidor de pruebas. No se debe emitir ni asumir autorización real en producción durante esta etapa.
7. Revisa los diarios de ventas y el punto de emisión. Configura establecimiento `001` y punto `001` según la asignación real del SRI. La documentación indica que las secuencias de documentos se configuran por diario; no uses números de establecimiento que no correspondan a tu autorización.
8. Revisa en **Contabilidad → Configuración → Impuestos** que existan las tasas de IVA que aplican a tu caso, incluido 15% y 0%. La localización carga tasas preconfiguradas; confirma códigos y vigencia con tu contador antes de usarlas.
9. Para integración, crea un usuario técnico de Odoo con permisos mínimos necesarios. Desde ese usuario entra a **Preferencias / Mi perfil → Seguridad de la cuenta → API Keys**, genera una clave con una descripción identificable y cópiala una sola vez a `ODOO_API_KEY` en el `.env`. El usuario va en `ODOO_USER` y la base en `ODOO_DB`. Nunca pegues la clave en el chat ni en logs.

## Certificado SRI

No se ha cargado ningún certificado. Cuando tengas el `.p12`, la configuración documentada está en **Contabilidad → Configuración → Ajustes → Localización ecuatoriana → SRI Certificates**. Asocia el certificado a la compañía y registra su contraseña en Odoo. Para pruebas deja desactivados los servidores de producción. Sin certificado válido, RUC y respuesta del SRI no se puede afirmar que un documento está firmado o autorizado.

## Qué se ha probado y qué falta

`docker compose config -q` pasó. Tras recuperar espacio en disco, `docker compose up -d odoo-postgres odoo` inició ambos contenedores; los dos quedaron saludables y `http://localhost:8069/web/login` respondió HTTP 200. El primer arranque detectó finales CRLF incompatibles en `odoo/entrypoint.sh`; se normalizó ese script a LF y se reinició solo Odoo. El PostgreSQL de Odoo no publica el puerto 5432 del host: `nexusai-postgres` conserva ese puerto, y el proceso de NexusAI conserva el 4000. Odoo escucha en `127.0.0.1:8069`.

Queda completar manualmente en la interfaz: crear la base, instalar y verificar la localización ecuatoriana, configurar la compañía y generar una API key para el usuario técnico. `odoo/enterprise-addons/` está vacío, por lo que `l10n_ec_edi` solo podrá instalarse si se agregan los addons Enterprise oficiales de la misma versión. No se ha cargado un certificado SRI ni se ha probado la autenticación backend→Odoo. No continúes con la etapa 2 hasta completar la configuración y confirmar que Odoo abre.
