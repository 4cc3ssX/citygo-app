import { createLogger, transports, format, LoggerOptions } from "winston";
import "winston-daily-rotate-file";

const infoTransport = new transports.DailyRotateFile({
  level: "info",
  dirname: "logs",
  filename: "onebus_info_%DATE%.log",
  datePattern: "DD-MM-YYYY",
  maxSize: "50m",
  maxFiles: "14d",
});

const errorTransport = new transports.DailyRotateFile({
  level: "error",
  dirname: "logs",
  filename: "onebus_error_%DATE%.log",
  datePattern: "DD-MM-YYYY",
  maxSize: "50m",
  maxFiles: "14d",
});

const logConfiguration: LoggerOptions = {
  level: "info",
  format: format.json(),
  transports:
    process.env.NODE_ENV === "production"
      ? [infoTransport, errorTransport]
      : undefined,
};

const customFormat = format.printf((info) => {
  const logMessage = `[ ${info.label} ] ${info.timestamp} ${info.level}: ${info.message}`;
  return info.stack ? `${logMessage} \n${info.stack}` : logMessage;
});

const logger = createLogger(logConfiguration);

// If not in production, also log to the console
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.splat(),
        format.colorize(),
        format.timestamp(),
        format.errors({ stack: true }),
        format.label({ label: "LOGGER" }),
        customFormat
      ),
    })
  );
}

export default logger;
