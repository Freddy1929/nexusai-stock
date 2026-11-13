BEGIN;

CREATE TEMP TABLE fase6_ventas_demo ON COMMIT DROP AS
WITH umbral AS (
    SELECT (
      COUNT(*) FILTER (WHERE estado <> 'anulada') < 100
      OR COALESCE(MIN(fecha) FILTER (WHERE estado <> 'anulada'), NOW()) > NOW() - INTERVAL '90 days'
    ) AS insertar
    FROM ventas
),
productos_elegibles AS (
    SELECT id, precio_venta,
           ROW_NUMBER() OVER (ORDER BY cantidad DESC, id) AS orden
    FROM productos
    WHERE estado = 'activo'
      AND cantidad >= 60
),
tres_productos AS (
    SELECT id, precio_venta, orden
    FROM productos_elegibles
    WHERE orden <= 3
),
clientes_ordenados AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS orden,
           COUNT(*) OVER () AS total
    FROM clientes
),
ventas_generadas AS (
    SELECT serie.n,
           (CURRENT_DATE - (179 - FLOOR((serie.n - 1) * 179.0 / 99)::INTEGER))::TIMESTAMPTZ
             + INTERVAL '12 hours' AS fecha,
           CASE WHEN serie.n <= 60 THEN 1 WHEN serie.n <= 90 THEN 2 ELSE 3 END AS producto_orden,
           1 + ((serie.n - 1) % (SELECT MAX(total) FROM clientes_ordenados)) AS cliente_orden,
           1::NUMERIC(12, 2) AS cantidad,
           'fase6-demo-' || LPAD(serie.n::TEXT, 3, '0') AS demo_clave
    FROM generate_series(1, 100) AS serie(n)
    WHERE (SELECT insertar FROM umbral)
      AND NOT EXISTS (
        SELECT 1 FROM ventas existente
        WHERE existente.demo_clave = 'fase6-demo-' || LPAD(serie.n::TEXT, 3, '0')
      )
),
detalle AS (
    SELECT ventas_generadas.*,
           clientes_ordenados.id AS cliente_id,
           tres_productos.id AS producto_id,
           tres_productos.precio_venta,
           ROUND(ventas_generadas.cantidad * tres_productos.precio_venta, 2) AS subtotal
    FROM ventas_generadas
    INNER JOIN clientes_ordenados ON clientes_ordenados.orden = ventas_generadas.cliente_orden
    INNER JOIN tres_productos ON tres_productos.orden = ventas_generadas.producto_orden
)
SELECT * FROM detalle;

DO $$
DECLARE
    cantidad_demo INTEGER;
    cantidad_esperada INTEGER;
    necesita_demo BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO cantidad_demo FROM fase6_ventas_demo;
    SELECT COUNT(*) FILTER (WHERE estado <> 'anulada') < 100
           OR COALESCE(MIN(fecha) FILTER (WHERE estado <> 'anulada'), NOW()) > NOW() - INTERVAL '90 days'
    INTO necesita_demo
    FROM ventas;
    SELECT CASE WHEN necesita_demo
      THEN 100 - COUNT(*) FILTER (WHERE demo_clave LIKE 'fase6-demo-%')
      ELSE 0
    END
    INTO cantidad_esperada
    FROM ventas;
    IF cantidad_demo <> cantidad_esperada THEN
        RAISE EXCEPTION 'No se pudieron preparar las 100 ventas de demostración. Verifica que existan al menos tres productos activos con stock y clientes.';
    END IF;
END $$;

INSERT INTO ventas (cliente_id, fecha, subtotal, iva, total, estado, es_demo, demo_clave)
SELECT cliente_id, fecha, subtotal, ROUND(subtotal * 0.15, 2),
       subtotal + ROUND(subtotal * 0.15, 2), 'pagada', TRUE, demo_clave
FROM fase6_ventas_demo
ON CONFLICT (demo_clave) WHERE demo_clave IS NOT NULL DO NOTHING;

INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal)
SELECT venta.id, demo.producto_id, demo.cantidad, demo.precio_venta, demo.subtotal
FROM fase6_ventas_demo demo
INNER JOIN ventas venta ON venta.demo_clave = demo.demo_clave
WHERE NOT EXISTS (
    SELECT 1 FROM detalle_venta detalle
    WHERE detalle.venta_id = venta.id
);

UPDATE productos producto
SET cantidad = GREATEST(0, producto.cantidad - ventas_demo.cantidad_vendida)
FROM (
    SELECT demo.producto_id, SUM(demo.cantidad) AS cantidad_vendida
    FROM fase6_ventas_demo demo
    GROUP BY demo.producto_id
) ventas_demo
WHERE producto.id = ventas_demo.producto_id
  AND EXISTS (SELECT 1 FROM fase6_ventas_demo);

-- Solo si se agregaron datos nuevos, deja tres productos en niveles de alerta demostrables.
WITH demanda AS (
    SELECT detalle.producto_id,
           SUM(detalle.cantidad * CASE
             WHEN CURRENT_DATE - venta.fecha::date < 7 THEN 3
             WHEN CURRENT_DATE - venta.fecha::date < 30 THEN 2
             ELSE 1
           END) / 127.0 AS diaria,
           MIN(SUBSTRING(venta.demo_clave FROM 12)::INTEGER) AS primer_numero
    FROM ventas venta
    INNER JOIN detalle_venta detalle ON detalle.venta_id = venta.id
    WHERE venta.es_demo
      AND venta.demo_clave LIKE 'fase6-demo-%'
      AND venta.fecha >= CURRENT_DATE - 89
    GROUP BY detalle.producto_id
),
destinos AS (
    SELECT producto_id, diaria,
           CASE WHEN primer_numero <= 60 THEN 'critico'
                WHEN primer_numero <= 90 THEN 'advertencia'
                ELSE 'normal' END AS nivel
    FROM demanda
)
UPDATE productos producto
SET cantidad = CASE
    WHEN destinos.nivel = 'critico' THEN GREATEST(0.01, CEIL(destinos.diaria * 3 * 100) / 100)
    WHEN destinos.nivel = 'advertencia' THEN GREATEST(0.01, CEIL(destinos.diaria * 10 * 100) / 100)
    ELSE CEIL((destinos.diaria * 30 + producto.limite_minimo) * 100) / 100
END
FROM destinos
WHERE producto.id = destinos.producto_id
  AND EXISTS (SELECT 1 FROM fase6_ventas_demo);

COMMIT;
