import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({
        error: 'Demasiados intentos de inicio de sesión. Inténtalo nuevamente en 15 minutos.'
      });
    }
});

  export const registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({
        error: 'Demasiados intentos de registro. Inténtalo nuevamente en 15 minutos.'
      });
    }
  });
