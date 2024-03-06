import { createLogger, transports, format, LoggerOptions } from "winston";

const logConfiguration: LoggerOptions = {
  level: "info",
  format: format.json(),
};

const customFormat = format.printf((info) => {
  const logMessage = `[ ${info.label} ] ${info.timestamp} ${info.level}: ${info.message}`;
  return info.stack ? `${logMessage} \n${info.stack}` : logMessage;
});

const logger = createLogger(logConfiguration);

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

export default logger;
