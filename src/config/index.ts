import dotenv from 'dotenv';

export type Config = {
  port: number;
  mongodb: {
    url: string;
    database: string;
  }
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

export function loadConfig(): Config {
  dotenv.config({
    quiet: true,
  });

  return {
    port: envInt('PORT') || 31001,
    mongodb: {
      url: env('MONGODB_URL', true),
      database: env('MONGODB_DATABASE') || 'octomate_voting',
    }
  }
}

