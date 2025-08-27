export type LoginResponse = {
  accessToken: string;
  validUntil: Date;
}

export type AuthConfig = {
  jwtSecret: string,
  accessTokenDuration: number, // in hours
  adminUsername: string,
  adminPassword: string,
  saltRounds: number,
}

export type JWTRegisteredClaims = {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
}

export type JWTClaims = JWTRegisteredClaims & {
  typ: string; // Custom user type, should be 'ADMIN'|'USER'
}