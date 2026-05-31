import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller';
import { HealthModule } from './health/health.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgresql://postgres:DQJbHFggACmJzjytMDGiLPYoWMvQadHN@junction.proxy.rlwy.net:55656/railway', //colocar la url aca, me dio paja setear el modulo para dejarlo como ConfigModule
      synchronize: false,
      autoLoadEntities: true,
      logging: true,
      ssl: {
        rejectUnauthorized: false,
      },
    }),
    HealthModule,
    UsuariosModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
