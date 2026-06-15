import { Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  validateSync,
  ValidationError,
} from 'class-validator';

export class Environment {
  // * -- Common.
  @IsNotEmpty({ message: 'PORT is required' })
  @IsNumber({}, { message: 'PORT must be a number' })
  PORT: number;

  @IsNotEmpty({ message: 'DATABASE_URL is required' })
  @IsString({ message: 'DATABASE_URL must be a string' })
  DATABASE_URL: string;

  @IsNotEmpty({ message: 'JWT_SECRET is required' })
  @IsString({ message: 'JWT_SECRET must be a string' })
  JWT_SECRET: string;
}

const logger: Logger = new Logger('CONFIG');

export function validate(config: Record<string, unknown>): Environment {
  logger.log('validating env vars...');

  const env: Environment = plainToInstance(Environment, config, {
    enableImplicitConversion: true,
  });

  const errors: ValidationError[] = validateSync(env, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    logger.error('🚩 err detected in env vars...');
    errors.map((err: ValidationError) => {
      const constraints = err.constraints ? Object.values(err.constraints) : [];
      constraints.forEach((constraint: string) => {
        logger.error(`* ${constraint}`);
      });
    });

    throw new Error('err in env vars');
  }

  logger.log('✅ all right with env vars');
  return env;
}
