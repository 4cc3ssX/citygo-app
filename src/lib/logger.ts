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

const customFormat = format.printf(({ level, message, label, timestamp }) => {
  return `[${label}] ${timestamp} ${level}: ${message}`;
});

const logger = createLogger(logConfiguration);

// If not in production, also log to the console
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(
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
