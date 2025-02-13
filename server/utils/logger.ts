import * as winston from 'winston';

interface LogInfo {
  level: string;
  message: string;
  timestamp: string;
  [key: string]: any;
}

// Define log format
const logFormat = winston.format.printf((info: LogInfo) => {
  let msg = `${info.timestamp} [${info.level}] : ${info.message} `;
  if (Object.keys(info).length > 0) {
    const metadata = { ...info };
    delete metadata.timestamp;
    delete metadata.level;
    delete metadata.message;
    if (Object.keys(metadata).length > 0) {
      msg += JSON.stringify(metadata);
    }
  }
  return msg;
});

// Create the logger instance
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

// Export the logger as both default and named export
export default logger;