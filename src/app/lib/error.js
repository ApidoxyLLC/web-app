class AppError extends Error {
    constructor(message, status = 500) {
      super(message);
      this.name = this.constructor.name;
      this.status = status;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  export class ValidationError extends AppError {
    constructor(message = "Validation failed") {
      super(message, 422);
    }
  }
  
  export class AuthenticationError extends AppError {
    constructor(message = "Authentication required") {
      super(message, 401);
    }
  }
  
  export class AuthorizationError extends AppError {
    constructor(message = "You do not have permission to perform this action") {
      super(message, 403);
    }
  }
  
  export class ConflictError extends AppError {
    constructor(message = "Conflict with existing resource") {
      super(message, 409);
    }
  }
  
  export class NotFoundError extends AppError {
    constructor(message = "Resource not found") {
      super(message, 404);
    }
  }
  
  export class RateLimitError extends AppError {
    constructor(message = "Too many requests, please try again later") {
      super(message, 429);
    }
  }
  
  export class ExternalServiceError extends AppError {
    constructor(message = "External service failure", status = 502) {
      super(message, status);
    }
  }
  
  export class BadRequestError extends AppError {
    constructor(message = "Bad request or malformed data") {
      super(message, 400);
    }
  }
  
  export class UploadError extends AppError {
    constructor(message = "File upload failed") {
      super(message, 415);
    }
  }
  
  export class ConfigError extends AppError {
    constructor(message = "Server misconfiguration") {
      super(message, 500);
    }
  }