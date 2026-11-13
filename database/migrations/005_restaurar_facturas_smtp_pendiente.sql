UPDATE facturas
SET estado = 'generada',
    email_enviado = FALSE,
    email_error = NULL
WHERE email_enviado = FALSE
  AND email_error LIKE 'Falta configurar SMTP\_%' ESCAPE '\';
