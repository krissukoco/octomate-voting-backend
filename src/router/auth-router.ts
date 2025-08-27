import express from 'express';
import { AuthUsecase } from '../usecase/auth-usecase';
import { validate } from '../schema/validation';
import { loginSchema } from '../schema/auth';
import { handleError } from '../schema/response';

export default function createAuthRouter(
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

  return router;
}