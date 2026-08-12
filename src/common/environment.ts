import type { ConfigService } from '@nestjs/config';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

export type DeploymentEnvironment =
  'development' | 'test' | 'staging' | 'production';

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function readBoolean(
  value: string | undefined,
  defaultValue = false,
): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (TRUE_VALUES.has(normalizedValue)) {
    return true;
  }

  if (FALSE_VALUES.has(normalizedValue)) {
    return false;
  }

  throw new Error(`Expected a boolean value, received "${value}"`);
}

export function readPort(
  value: string | undefined,
  name: string,
  defaultValue: number,
): number {
  const parsedValue =
    value === undefined || value.trim() === '' ? defaultValue : Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > 65535
  ) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }

  return parsedValue;
}

export function getDeploymentEnvironment(
  configService: ConfigService,
): DeploymentEnvironment {
  const nodeEnvironment = configService.get<string>('NODE_ENV', 'development');
  const defaultDeploymentEnvironment =
    nodeEnvironment === 'production'
      ? 'production'
      : nodeEnvironment === 'test'
        ? 'test'
        : 'development';

  return configService.get<DeploymentEnvironment>(
    'DEPLOYMENT_ENV',
    defaultDeploymentEnvironment,
  );
}

export function validateEnvironment(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const errors: string[] = [];
  const requiredKeys = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'JWT_SECRET',
  ] as const;

  for (const key of requiredKeys) {
    if (!asString(values[key])) {
      errors.push(`${key} is required`);
    }
  }

  const nodeEnvironment = asString(values.NODE_ENV) || 'development';
  const deploymentEnvironment =
    asString(values.DEPLOYMENT_ENV) ||
    (nodeEnvironment === 'production'
      ? 'production'
      : nodeEnvironment === 'test'
        ? 'test'
        : 'development');

  if (!['development', 'test', 'production'].includes(nodeEnvironment)) {
    errors.push('NODE_ENV must be development, test, or production');
  }

  if (
    !['development', 'test', 'staging', 'production'].includes(
      deploymentEnvironment,
    )
  ) {
    errors.push(
      'DEPLOYMENT_ENV must be development, test, staging, or production',
    );
  }

  for (const [name, defaultValue] of [
    ['APP_PORT', 3000],
    ['DB_PORT', 3306],
  ] as const) {
    try {
      readPort(asString(values[name]), name, defaultValue);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const booleans = new Map<string, boolean>();

  for (const [name, defaultValue] of [
    ['DB_SYNCHRONIZE', false],
    ['DB_DROP_SCHEMA', false],
    ['DB_LOGGING', false],
  ] as const) {
    try {
      booleans.set(name, readBoolean(asString(values[name]), defaultValue));
    } catch (error) {
      errors.push(
        `${name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const productionLike = ['staging', 'production'].includes(
    deploymentEnvironment,
  );

  if (productionLike && asString(values.JWT_SECRET).length < 32) {
    errors.push(
      'JWT_SECRET must contain at least 32 characters in staging/production',
    );
  }

  if (productionLike && booleans.get('DB_SYNCHRONIZE') === true) {
    errors.push('DB_SYNCHRONIZE must be false in staging/production');
  }

  if (
    deploymentEnvironment !== 'test' &&
    booleans.get('DB_DROP_SCHEMA') === true
  ) {
    errors.push('DB_DROP_SCHEMA may only be enabled in the test environment');
  }

  const corsOrigins = asString(values.CORS_ORIGINS);

  if (
    productionLike &&
    corsOrigins.split(',').some((origin) => origin.trim() === '*')
  ) {
    errors.push('CORS_ORIGINS cannot contain a wildcard in staging/production');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.join('; ')}`);
  }

  return {
    ...values,
    NODE_ENV: nodeEnvironment,
    DEPLOYMENT_ENV: deploymentEnvironment,
  };
}
