export class BaseError extends Error {
  code: string;
  nestedError: Error | undefined;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.nestedError = undefined;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ParseError extends BaseError {
  commandName: string | undefined;

  constructor(message: string, nestedError?: Error) {
    super("", message);
    Error.captureStackTrace(this, this.constructor);
    this.nestedError = nestedError;
  }
}
