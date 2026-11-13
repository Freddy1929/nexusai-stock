BEGIN;

ALTER TABLE predicciones
    ADD COLUMN IF NOT EXISTS demanda_7_dias NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS demanda_15_dias NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS demanda_30_dias NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS stock_actual NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sugerencia_reposicion NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS confianza VARCHAR(10) NOT NULL DEFAULT 'baja',
    ADD COLUMN IF NOT EXISTS dias_con_ventas INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ventana_dias INTEGER NOT NULL DEFAULT 90;

DELETE FROM predicciones p
USING predicciones duplicada
WHERE p.producto_id = duplicada.producto_id
  AND (p.fecha_calculo, p.id) < (duplicada.fecha_calculo, duplicada.id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_predicciones_producto_unico
    ON predicciones(producto_id);

CREATE TABLE IF NOT EXISTS configuracion_ia (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    ventana_dias INTEGER NOT NULL CHECK (ventana_dias BETWEEN 30 AND 180),
    dias_recientes INTEGER NOT NULL CHECK (dias_recientes BETWEEN 1 AND 30),
    dias_intermedios INTEGER NOT NULL CHECK (dias_intermedios BETWEEN 8 AND 90),
    peso_reciente INTEGER NOT NULL CHECK (peso_reciente > 0),
    peso_intermedio INTEGER NOT NULL CHECK (peso_intermedio > 0),
    peso_antiguo INTEGER NOT NULL CHECK (peso_antiguo > 0),
    umbral_critico INTEGER NOT NULL CHECK (umbral_critico > 0),
    umbral_advertencia INTEGER NOT NULL CHECK (umbral_advertencia > umbral_critico),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (dias_intermedios > dias_recientes),
    CHECK (ventana_dias >= dias_intermedios)
);

INSERT INTO configuracion_ia (
    id, ventana_dias, dias_recientes, dias_intermedios,
    peso_reciente, peso_intermedio, peso_antiguo,
    umbral_critico, umbral_advertencia
) VALUES (1, 90, 7, 30, 3, 2, 1, 7, 15)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS es_demo BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS demo_clave VARCHAR(40);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_demo_clave
    ON ventas(demo_clave)
    WHERE demo_clave IS NOT NULL;

COMMIT;
