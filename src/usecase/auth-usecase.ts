import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthConfig, JWTClaims, LoginResponse } from "../entity/auth";
import { AppError } from "../entity/error";
import { UserRepository } from "../repository/user-repository";

export declare abstract class AuthUsecase {
  abstract loginUser(username: string, password: string): Promise<LoginResponse>;
  abstract loginAdmin(username: string, password: string): Promise<LoginResponse>;
}

export class AuthUsecaseImpl extends AuthUsecase {
  constructor(
    private config: AuthConfig,
    private userRepo: UserRepository,
  ) {
    super();
  }

  private generate(sub: string, typ: string): LoginResponse {
    const now = new Date();
    const nowUnix = Math.floor(now.getTime()/1000);
    const exp = new Date(now.getTime() + this.config.accessTokenDuration * 3600);
    const expUnix = Math.floor(exp.getTime()/1000);

    const claims: JWTClaims = {
      sub,
      aud: 'octomate-voting-backend',
      iss: 'octomate-voting-backend',
      exp: expUnix,
      nbf: nowUnix,
      iat: nowUnix,
      typ,
      jti: '', // could be filled later
    }
    const claimsStr = jwt.sign(claims, this.config.jwtSecret);
    return {
      accessToken: claimsStr,
      validUntil: exp,
    }
  }

  async loginUser(username: string, password: string): Promise<LoginResponse> {
    const user = await this.userRepo.firstByUsername(username);
    if (!user) {
      throw new AppError('INVALID_ARGUMENT', 'Invalid Credentials');
    }
    try {
      const comp = await bcrypt.compare(password, user.password);
      if (!comp) {
        throw new AppError('INVALID_ARGUMENT', 'Invalid Credentials');
      }
      const resp = this.generate(user.id, 'USER');
      return resp;
    } catch(e) {
      if (e instanceof AppError) {
        throw e
      }
      throw new AppError('INVALID_ARGUMENT', 'Invalid Credentials');
    }
  }

  async loginAdmin(username: string, password: string): Promise<LoginResponse> {
    if (username !== this.config.adminUsername || password !== this.config.adminPassword) {
      throw new AppError('INVALID_ARGUMENT', 'Invalid Credentials');
    }
    const resp = this.generate('admin', 'ADMIN');
    return resp;
  }
}