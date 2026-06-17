import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsString()
  TWILIO_ACCOUNT_SID!: string;

  @IsString()
  TWILIO_AUTH_TOKEN!: string;

  @IsString()
  TWILIO_VERIFY_SERVICE_SID!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  APP_PORT?: number;

  @IsOptional()
  @IsString()
  SUPABASE_URL?: string;

  @IsOptional()
  @IsString()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  @IsOptional()
  @IsString()
  SUPABASE_STORAGE_BUCKET_DOCUMENTS?: string;

  @IsOptional()
  @IsString()
  SUPABASE_STORAGE_BUCKET_COMPLAINT_MEDIA?: string;

  @IsOptional()
  @IsString()
  SUPABASE_STORAGE_BUCKET_PAYMENT_PROOFS?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return config;
}
