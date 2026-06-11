import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedDevOrigin = (origin?: string) => {
    if (!origin) {
      return true;
    }

    return (
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)
    );
  };

  app.enableCors({
    origin: (origin, callback) => {
      if (allowedDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EasySyndic Backend')
    .setDescription('API documentation for EasySyndic mobile backend')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const configService = app.get(ConfigService);
  const port =
    Number(process.env.PORT) ||
    configService.get<number>('app.port') ||
    3000;
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  await app.listen(port, '0.0.0.0');

  console.log(`EasySyndic Backend listening on 0.0.0.0:${port}`);
  console.log(`PORT=${port}`);
  console.log(`NODE_ENV=${nodeEnv}`);
  console.log('Swagger path=/api');
  console.log('Health path=/health');
}

bootstrap().catch((error) => {
  console.error('Failed to start EasySyndic Backend');
  console.error(error);
  process.exit(1);
});
