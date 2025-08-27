export type AppErrorType = 'NOT_FOUND'|'VALIDATION'|'INVALID_ARGUMENT'|'UNAUTHORIZED'|'FORBIDDEN';

export type AppErrorDetail = {
  field: string;
  error: string;
}

export class AppError extends Error {
  public errorType: AppErrorType;
  public message: string;
  public details: AppErrorDetail[];

  constructor(errorType: AppErrorType, message: string, ...details: AppErrorDetail[]) {
    super(message);
    this.errorType = errorType;
    this.message = message;
    this.details = details || [];
  }
}