import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller';
import { HealthModule } from './health/health.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { RolesModule } from './roles/roles.module';

import { validate } from './config';

@Module({
  imports: [
    // * -- Core.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validate,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        synchronize: false,
        autoLoadEntities: true,
        logging: true,
      }),
      inject: [ConfigService],
    }),

    // * -- Features.
    HealthModule,
    UsuariosModule,
    AuthModule,
    RolesModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
