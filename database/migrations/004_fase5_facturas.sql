ALTER TABLE facturas
    ADD COLUMN IF NOT EXISTS email_error TEXT;

CREATE SEQUENCE IF NOT EXISTS facturas_numero_seq START WITH 1;

DO $$
DECLARE
    ultimo_numero BIGINT;
BEGIN
    SELECT COALESCE(MAX(SUBSTRING(numero FROM 9)::BIGINT), 0)
    INTO ultimo_numero
    FROM facturas
    WHERE numero ~ '^001-001-[0-9]{9}$';

    IF ultimo_numero > 0 THEN
        PERFORM setval('facturas_numero_seq', ultimo_numero, TRUE);
    ELSE
        PERFORM setval('facturas_numero_seq', 1, FALSE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'facturas_clave_acceso_formato'
          AND conrelid = 'facturas'::regclass
    ) THEN
        ALTER TABLE facturas
            ADD CONSTRAINT facturas_clave_acceso_formato
            CHECK (clave_acceso IS NULL OR clave_acceso ~ '^[0-9]{49}$');
    END IF;
END $$;
