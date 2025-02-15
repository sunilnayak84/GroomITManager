
import * as winston from 'winston';

interface LogMetadata {
  timestamp?: string;
  level?: string;
  message?: string;
  [key: string]: any;
}

const logFormat = winston.format.printf((info) => {
  let msg = `${info.timestamp} [${info.level}] : ${info.message} `;
  const metadata: LogMetadata = { ...info };
  
  // Remove standard properties
  if (metadata.timestamp) delete metadata.timestamp;
  if (metadata.level) delete metadata.level;
  if (metadata.message) delete metadata.message;
  
  if (Object.keys(metadata).length > 0) {
    msg += JSON.stringify(metadata);
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
