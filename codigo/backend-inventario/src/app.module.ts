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
import { AuditoriaModule } from './auditoria/auditoria.module';
import { BodegasModule } from './bodegas/bodegas.module';
import { InventarioModule } from './inventario/inventario.module';
import { TransferenciasModule } from './transferencias/transferencias.module';
import { CompaniesModule } from './companies/companies.module';
import { ReportesModule } from './reportes/reportes.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { OrdenesIngresoModule } from './ordenes-ingreso/ordenes-ingreso.module';
import { IntegracionesModule } from './integraciones/integraciones.module';
import { SalidasModule } from './salidas/salidas.module';

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
    AuditoriaModule,
    BodegasModule,
    InventarioModule,
    TransferenciasModule,
    CompaniesModule,
    ReportesModule,
    ProveedoresModule,
    OrdenesIngresoModule,
    IntegracionesModule,
    SalidasModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
