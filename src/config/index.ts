import dotenv from 'dotenv';

export type Config = {
  port: number;
  mongodb: {
    url: string;
    database: string;
  },
  auth: {
    jwtSecret: string;
    accessTokenDuration: number;
    adminUsername: string;
    adminPassword: string;
    saltRounds: number;
  },
}

type Optional<T extends string|number, B extends boolean> = B extends true ? T : T|null;

export function env<
  B extends boolean = false,
>(key: string, required?: B): Optional<string, B> {
  const val = process.env[key];
  if (!val) {
    if (required) {
      throw new Error(`Environment variable '${key}' is required`);
    }
    return null as Optional<string, B>;
  }
  return val;
}

export function envInt<
  B extends boolean = false,
>(key: string, required?: B): Optional<number, B> {
  const str = env(key, required);
  if (!str) return null as Optional<number, B>;

  try {
    const n = parseInt(str);
    if (!n || Number.isNaN(n)) {
      throw new Error(`Error parseInt environment variable '${key}'=${str}`);
    }
    return n
  } catch(e) {
    if (e instanceof Error) {
      throw e;
    }
    throw new Error(`Error parseInt environment variable '${key}': ${e}`)
  }
}

export function min(m: number, msg: string, v: number|string): typeof v {
  if (typeof v === 'number') {
    if (v < m) {
      throw new Error(msg)
    }
    return v;
  }
  if (typeof v === 'string') {
    if (v.length < m) {
      throw new Error(msg);
    }
    return v;
  }
  throw new TypeError('unknown type of v');
}

export function loadConfig(): Config {
  dotenv.config({
    quiet: true,
  });

  return {
    port: envInt('PORT') || 31001,
    mongodb: {
      url: env('MONGODB_URL', true),
      database: env('MONGODB_DATABASE') || 'octomate_voting',
    },
    auth: {
      jwtSecret: min(32, 'JWT_SECRET should have minimum length of 32', env('JWT_SECRET', true)) as string,
      accessTokenDuration: envInt('ACCESS_TOKEN_DURATION') || 72,
      adminUsername: env('ADMIN_USERNAME', true),
      adminPassword: env('ADMIN_USERNAME', true),
      saltRounds: min(8, 'SALT_ROUNDS has to be >= 8', envInt('SALT_ROUNDS') || 10) as number,
    }
  }
}

