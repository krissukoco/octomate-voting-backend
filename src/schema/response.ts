import { AppError } from "../entity/error";

export type APIErrorResponsePayload = {
  code: number;
  message: string;
  details: APIErrorResponseDetail[]
}

export type APIErrorResponseDetail = {
  field: string;
  error: string;
}

export class APIErrorResponse extends Error {
  public code: number;
  public message: string;
  public details: APIErrorResponseDetail[];

  constructor(payload: APIErrorResponsePayload) {
    super(payload.message);
    this.code = payload.code;
    this.message = payload.message;
    this.details = payload.details || [];
  }

  public toJSON(): string {
    return JSON.stringify({
      code: this.code,
      message: this.message,
      details: this.details || [],
    } satisfies APIErrorResponsePayload)
  }

  public static fromAppError(err: AppError): APIErrorResponse {
    const code: number = 
      err.errorType === 'NOT_FOUND' 
      ? 20004
      : err.errorType === 'VALIDATION'
      ? 22000
      : err.errorType === 'INVALID_ARGUMENT'
      ? 20000
      : 99998

    return new APIErrorResponse({
      code,
      message: err.message,
      details: err.details.map(det => ({
        field: det.field,
        error: det.error,
      }))
    })
  }

  public static fromError(err: unknown): APIErrorResponse {
    if (err instanceof AppError) {
      return this.fromAppError(err);
    }
    // Any other error, if not specified as AppError,
    // will be considered an internal error.
    // TODO: implement logging
    console.warn('unhandled ERROR: ', err);

    if (err instanceof Error) {
      return new APIErrorResponse({
        code: 99999,
        message: 'Internal server error',
        details: [
          {
            field: 'INTERNAL_ERROR_MESSAGE',
            error: err.message,
          }
        ]
      })
    }

    return new APIErrorResponse({
      code: 99999,
      message: 'Internal server error',
      details: [
        {
          field: 'INTERNAL_ERROR_MESSAGE',
          error: (err as any)?.message ? (err as any).message : `${err}`,
        }
      ],
    })
  }
}