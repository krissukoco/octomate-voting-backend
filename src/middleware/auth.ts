import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from "express";
import { AppError } from "../entity/error";
import { JWTClaims } from '../entity/auth';
import { APIErrorResponse, handleError } from '../schema/response';

export function authMiddleware(
  jwtSecret: string,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.headers['authorization'];
      if (!auth) {
        throw new AppError('UNAUTHORIZED', 'Unauthorized: authorization header invalid');
      }
      const spl = auth.split(' ');
      if (spl.length !== 2) {
        throw new AppError('UNAUTHORIZED', 'Unauthorized: authorization header invalid');
      }
      const claims = jwt.verify(spl[1], jwtSecret) as JWTClaims;
      console.info('claims: ', claims);
      res.locals.auth = claims;
      next();
    } catch(e) {
      if (e instanceof jwt.JsonWebTokenError) {
        const apiErr = new APIErrorResponse({
          code: 10001,
          message: 'Unauthorized: invalid access token',
          details: [],
        })
        return res.status(401).json(apiErr);
      }
      handleError(res, e);
      return;
    }
  }
}

export function userTypeMiddleware(
  userType: string,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = res.locals.auth;
      if (!auth) {
        throw new Error('internal auth not found');
      }
      const utyp = (auth as JWTClaims).utyp;
      if (utyp !== userType) {
        throw new AppError('FORBIDDEN', `Only ${userType} can access the resource`);
      }
      next();
    } catch(e) {
      handleError(res, e);
      return;
    }
  }
}