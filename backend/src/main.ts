import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? '*',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());

  const config = new DocumentBuilder()
    .setTitle('USPG Smart Parking API')
    .setDescription('Sistema inteligente de parqueo - Universidad San Pablo de Guatemala')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticación')
    .addTag('users', 'Gestión de usuarios')
    .addTag('vehicles', 'Gestión de vehículos')
    .addTag('parking-spaces', 'Espacios de parqueo')
    .addTag('parking-sessions', 'Sesiones de parqueo')
    .addTag('qr-access', 'Acceso por QR')
    .addTag('payments', 'Pagos')
    .addTag('reservations', 'Reservas')
    .addTag('notifications', 'Notificaciones')
    .addTag('barriers', 'Barreras')
    .addTag('cameras', 'Cámaras y LPR')
    .addTag('security', 'Seguridad y auditoría')
    .addTag('reports', 'Reportes')
    .addTag('map', 'Mapa interactivo')
    .addTag('dashboard', 'Dashboard')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚗 USPG Smart Parking API running on http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
