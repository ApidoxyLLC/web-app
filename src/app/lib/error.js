import Error from "next/error";

class AppError extends Error {
  /**
   * Base application error class
   * @param {string} message - Human-readable error message
   * @param {number} status - HTTP status code
   * @param {string} code - Machine-readable error code
   */
  constructor(message, status = 500, code) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code || this.name.toUpperCase().replace(/ERROR$/, '');
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  /**
   * @param {string} message
   * @param {Array} errors - Validation error details
   */
  constructor(message = "Validation failed", errors) {
    super(message, 422);
    this.details = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(message, 409);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class RateLimitError extends AppError {
  /**
   * @param {number} retryAfter - Seconds until retry
   */
  constructor(retryAfter = 60) {
    super("Too many requests", 429);
    this.retryAfter = retryAfter;
    this.headers = { 'Retry-After': String(retryAfter) };
  }
}

export class ExternalServiceError extends AppError {
  /**
   * @param {string} service - Name of external service
   */
  constructor(service) {
    super(`Service unavailable: ${service}`, 503);
    this.service = service;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Invalid request") {
    super(message, 400);
  }
}

export class UploadError extends AppError {
  constructor(message = "File upload failed") {
    super(message, 415);
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Database operation failed") {
    super(message, 500);
  }
}

export class ConfigError extends AppError {
  constructor(message = "Configuration error") {
    super(message, 500);
  }
}