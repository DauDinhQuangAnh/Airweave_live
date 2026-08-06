import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import Redis from 'ioredis';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);
  const isProd = config.get<string>('NODE_ENV') === 'production';

  app.setGlobalPrefix('api');

  // Đóng kết nối Prisma sạch khi nhận SIGTERM/Ctrl+C
  app.enableShutdownHooks();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression()); // nén gzip response (danh sách báo cáo, dữ liệu không khí...)
  app.use(cookieParser());

  const origins = (config.get<string>('CORS_ORIGINS') ?? 'http://localhost:8080')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // ✅ Socket.io Redis Adapter — cho phép scale WebSocket ngang nhiều instance
  const redisUrl = config.get<string>('REDIS_URL');
  if (redisUrl) {
    try {
      const pubClient = new Redis(redisUrl);
      const subClient = pubClient.duplicate();

      await Promise.all([
        new Promise<void>((res) => pubClient.once('ready', res)),
        new Promise<void>((res) => subClient.once('ready', res)),
      ]);

      const adapter = createAdapter(pubClient, subClient);

      // Gắn adapter vào NestJS IoAdapter
      class RedisIoAdapter extends IoAdapter {
        createIOServer(port: number, options?: any) {
          const server = super.createIOServer(port, options);
          server.adapter(adapter);
          return server;
        }
      }

      app.useWebSocketAdapter(new RedisIoAdapter(app));
      new Logger('Bootstrap').log('Socket.io Redis Adapter đã được kích hoạt');
    } catch (err) {
      new Logger('Bootstrap').warn(
        `Socket.io Redis Adapter không kết nối được: ${(err as Error).message} — dùng in-memory adapter`,
      );
    }
  } else {
    new Logger('Bootstrap').warn('REDIS_URL chưa cấu hình — Socket.io dùng in-memory adapter (không hỗ trợ multi-instance)');
  }

  // Swagger chỉ bật khi không phải production (tránh lộ cấu trúc API ra ngoài)
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AirWeave API')
      .setDescription('Backend cho ứng dụng theo dõi chất lượng không khí AirWeave')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);

  new Logger('Bootstrap').log(`AirWeave API chạy tại http://localhost:${port}/api — docs: /api/docs`);
}

void bootstrap();
