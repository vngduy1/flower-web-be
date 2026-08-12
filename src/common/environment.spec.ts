import { validateEnvironment } from './environment';

const validEnvironment = {
  NODE_ENV: 'production',
  DEPLOYMENT_ENV: 'production',
  APP_PORT: '3000',
  DB_HOST: 'database.internal',
  DB_PORT: '3306',
  DB_USERNAME: 'flower_app',
  DB_PASSWORD: 'not-a-real-secret',
  DB_DATABASE: 'flower',
  DB_SYNCHRONIZE: 'false',
  DB_DROP_SCHEMA: 'false',
  DB_LOGGING: 'false',
  JWT_SECRET: 'a-development-placeholder-with-32-characters',
  CORS_ORIGINS: 'https://shop.example.com',
};

describe('validateEnvironment', () => {
  it('accepts a production-safe configuration', () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      NODE_ENV: 'production',
      DEPLOYMENT_ENV: 'production',
    });
  });

  it('rejects schema synchronization in production', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, DB_SYNCHRONIZE: 'true' }),
    ).toThrow('DB_SYNCHRONIZE must be false');
  });

  it('rejects destructive schema reset outside test', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, DB_DROP_SCHEMA: 'true' }),
    ).toThrow('DB_DROP_SCHEMA may only be enabled');
  });

  it('rejects weak production JWT secrets and wildcard CORS', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        JWT_SECRET: 'short',
        CORS_ORIGINS: '*',
      }),
    ).toThrow('JWT_SECRET must contain at least 32 characters');
  });
});
