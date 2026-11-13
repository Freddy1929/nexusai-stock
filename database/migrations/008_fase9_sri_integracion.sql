ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS forma_pago VARCHAR(2) NOT NULL DEFAULT '01';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ventas_forma_pago_sri'
          AND conrelid = 'ventas'::regclass
    ) THEN
        ALTER TABLE ventas
            ADD CONSTRAINT ventas_forma_pago_sri
            CHECK (forma_pago IN ('01', '15', '16', '17', '18', '19', '20', '21'));
    END IF;
END $$;

ALTER TABLE facturas
    ADD COLUMN IF NOT EXISTS xml_path TEXT,
    ADD COLUMN IF NOT EXISTS ambiente VARCHAR(1),
    ADD COLUMN IF NOT EXISTS estado_sri VARCHAR(20) NOT NULL DEFAULT 'sin_xml',
    ADD COLUMN IF NOT EXISTS mensaje_sri TEXT,
    ADD COLUMN IF NOT EXISTS numero_autorizacion VARCHAR(100),
    ADD COLUMN IF NOT EXISTS fecha_autorizacion TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'facturas_ambiente_sri'
          AND conrelid = 'facturas'::regclass
    ) THEN
        ALTER TABLE facturas
            ADD CONSTRAINT facturas_ambiente_sri
            CHECK (ambiente IS NULL OR ambiente IN ('1', '2'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'facturas_estado_sri'
          AND conrelid = 'facturas'::regclass
    ) THEN
        ALTER TABLE facturas
            ADD CONSTRAINT facturas_estado_sri
            CHECK (estado_sri IN ('sin_xml', 'xml_generado', 'firmado', 'enviado', 'autorizado', 'rechazado', 'error'));
    END IF;
END $$;
