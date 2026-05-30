import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: '', //colocar la url aca, me dio paja setear el modulo para dejarlo como ConfigModule
      synchronize: false,
      autoLoadEntities: true,
      logging: true,
      ssl: {
        rejectUnauthorized: false,
      },
    }),
    HealthModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
