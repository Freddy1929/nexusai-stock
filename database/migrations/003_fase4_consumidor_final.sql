INSERT INTO clientes (tipo_identificacion, identificacion, nombre, email, telefono, direccion)
VALUES ('ruc', '9999999999999', 'Consumidor Final', NULL, NULL, NULL)
ON CONFLICT (identificacion) DO NOTHING;
