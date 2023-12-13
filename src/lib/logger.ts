import { createLogger, transports, format, LoggerOptions } from "winston";

const logConfiguration: LoggerOptions = {
  level: "info",
  format: format.json(),
  transports: [
    new transports.File({
      filename: "error.log",
      dirname: "logs",
      level: "error",
    }),
    new transports.File({
      filename: "info.log",
      dirname: "logs",
      level: "info",
    }),
    new transports.File({ filename: "combined.log", dirname: "logs" }),
  ],
};

const customFormat = format.printf(
  ({ level, message, label, timestamp, meta }) => {
    const logMessage = `[ ${label} ] ${timestamp} ${level}: ${message}`;
    return meta && meta instanceof Error
      ? `${logMessage} \n${meta.stack}`
      : logMessage;
  }
);

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
