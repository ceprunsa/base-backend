import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── 1. Cookie parser ──────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── 2. CORS ───────────────────────────────────────────────────────────────
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── 3. Global validation pipe ─────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown props
      forbidNonWhitelisted: true,
      transform: true, // auto-transform query/body types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── 4. Swagger ────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Sistema Base API')
    .setDescription(
      'RESTful API with Supabase Auth (Google OAuth), HTTP-only cookies, and role-based access control.',
    )
    .setVersion('1.0')
    .addCookieAuth(
      'sb-access-token', // cookie name
      { type: 'apiKey', in: 'cookie', name: 'sb-access-token' },
      'sb-access-token', // security scheme name
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // ── 5. Start ──────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📖 Swagger UI: http://localhost:${port}/api`);
}
bootstrap();
