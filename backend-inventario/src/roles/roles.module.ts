import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { Rol } from './entities/rol.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioRol } from 'src/usuarios/entities/usuario-rol.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rol, UsuarioRol])],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
