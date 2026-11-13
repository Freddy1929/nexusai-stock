DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_index AS i
        JOIN pg_attribute AS a
          ON a.attrelid = i.indrelid
         AND a.attname = 'email'
         AND a.attnum = i.indkey[0]
        WHERE i.indrelid = 'usuarios'::regclass
          AND i.indisunique
          AND i.indisvalid
          AND i.indnkeyatts = 1
    ) THEN
        CREATE UNIQUE INDEX idx_usuarios_email_unique ON usuarios (email);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'usuarios'::regclass
          AND conname = 'usuarios_rol_check'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('admin', 'vendedor'));
    END IF;
END
$$;
