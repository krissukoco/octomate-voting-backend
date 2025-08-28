import express from 'express';
import { AdminUsecase } from "../usecase/admin-usecase";
import { validate } from '../schema/validation';
import { createUserSchema, getUsersQuerySchema } from '../schema/admin';
import { handleError } from '../schema/response';

export function createAdminRouter(
  adminUc: AdminUsecase,
) {
  const router = express.Router();

  router.get(
    '/users', 
    validate({ query: getUsersQuerySchema }),
    async(req, res) => {
      try {
        const users = await adminUc.getUsers(Number((req.query as any).page), Number((req.query as any).size));
        return res.status(200).json({
          list: users.list.map(v => {
            const { password, ...value } = v;
            return value;
          }),
          pagination: users.pagination,
        });
      } catch(e) {
        handleError(res, e);
      }
    }
  )

  router.post(
    '/users',
    validate({ body: createUserSchema }),
    async(req, res) => {
      try {
        const { password, ...result } = await adminUc.createUser((req.body as any).username);
        return res.status(201).json(result);
      } catch(e) {
        handleError(res, e);
      }
    }
  )

  router.get(
    '/summary',
    async(_, res) => {
      try {
        const result = await adminUc.getVoteSummary();
        return res.status(200).json(result);
      } catch(e) {
        handleError(res, e);
      }
    }
  )

  return router;
}