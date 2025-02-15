
import * as winston from 'winston';

interface LogMetadata {
  timestamp?: string;
  level?: string;
  message?: string;
  [key: string]: unknown;
}

const logFormat = winston.format.printf((info: winston.Logform.TransformableInfo) => {
  let msg = `${info.timestamp} [${info.level}] : ${info.message} `;
  const copy = { ...info } as LogMetadata;
  
  // Remove standard properties from metadata
  delete copy.timestamp;
  delete copy.level;
  delete copy.message;
  
  if (Object.keys(copy).length > 0) {
    msg += JSON.stringify(copy);
  }
  return msg;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export default logger;
