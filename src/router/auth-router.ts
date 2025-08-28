import express, { NextFunction, Request, Response } from 'express';
import { AuthUsecase } from '../usecase/auth-usecase';
import { validate } from '../schema/validation';
import { loginSchema } from '../schema/auth';
import { handleError } from '../schema/response';
import { AuthConfig } from '../entity/auth';
import { AppError } from '../entity/error';

export default function createAuthRouter(
  authConfig: AuthConfig,
  authMw: (req: Request, res: Response, next: NextFunction) => any,
  authUc: AuthUsecase,
) {
  const router = express.Router();
  
  router.post(
    '/user/login', 
    validate({ body: loginSchema }),
    async(req, res) => {
      try {
        const resp = await authUc.loginUser(req.body.username, req.body.password);
        return res.status(200).json({
          access_token: resp.accessToken,
          valid_until: Math.floor(resp.validUntil.getTime()/1000),
        });
      } catch(e) {
        handleError(res, e);
      }
    }
  )

  router.post(
    '/admin/login',
    validate({ body: loginSchema }),
    async(req, res) => {
      try {
        const resp = await authUc.loginAdmin(req.body.username, req.body.password);
        return res.status(200).json({
          access_token: resp.accessToken,
          valid_until: Math.floor(resp.validUntil.getTime()/1000),
        })
      } catch(e) {
        handleError(res, e);
      }
    }
  )

  router.get(
    '/me',
    authMw,
    async(req, res) => {
      try {
        const utyp = res.locals.auth?.utyp;
        if (utyp === 'ADMIN') {
          return res.status(200).json({
            id: 'admin',
            username: authConfig.adminUsername,
            type: 'ADMIN',
          })
        } else if (utyp === 'USER') {
          const user = await authUc.getUser(res.locals.auth?.sub);
          if (!user) {
            throw new AppError('UNAUTHORIZED', 'Your user is not found');
          }
          return res.status(200).json({
            id: user.id,
            username: user.username,
            type: 'USER',
          })
        }
      } catch(e) {
        handleError(res, e);
      }
    }
  )

  return router;
}