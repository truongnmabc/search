import winston from "winston";
import { config } from "../config";

// Tạo logger instance
export const logger = winston.createLogger({
  level: config.server.nodeEnv === "development" ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "search-server" },
  transports: [
    // Ghi vào file
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Nếu không phải production, log ra console
if (config.server.nodeEnv !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Helper functions
export const logSearch = (
  query: string,
  userId?: string,
  executionTime?: number
) => {
  logger.info("Search performed", {
    query,
    userId,
    executionTime,
    timestamp: new Date().toISOString(),
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error("Error occurred", {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
};

export const logPerformance = (
  operation: string,
  duration: number,
  details?: any
) => {
  logger.info("Performance metric", {
    operation,
    duration,
    details,
    timestamp: new Date().toISOString(),
  });
};
