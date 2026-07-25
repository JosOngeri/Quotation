import pino from 'pino';

/**
 * Pino Logger with conditional transport and PII redaction
 */
const isDevelopment = process.env.NODE_ENV === 'development';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'email',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]'
    ],
    remove: true
  },
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  })
});

export default logger;
