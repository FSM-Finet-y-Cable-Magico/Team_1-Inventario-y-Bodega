import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { AuditoriaService } from 'src/auditoria/auditoria.service';

@Injectable()
export class CompanyIsolationGuard implements CanActivate {
  constructor(private auditoriaService: AuditoriaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: Usuario = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado. Por favor inicie sesion.');
    }

    if (user.id_empresa === null || user.id_empresa === undefined) {
      await this.auditoriaService.create({
        id_usuario: user.id_usuario,
        accion: 'ACCESO_DENEGADO',
        entidad_afectada: request.route?.path ?? request.url,
        id_entidad_afectada: user.id_usuario,
        valor_anterior: null,
        valor_nuevo: {
          motivo: 'Cuenta sin empresa asignada',
          metodo_http: request.method,
          ruta: request.url,
        },
      });
      throw new ForbiddenException(
        'Su cuenta no tiene una empresa asignada. Contacte al administrador del sistema.',
      );
    }

    request.companyContextId = user.id_empresa;
    return true;
  }
}
