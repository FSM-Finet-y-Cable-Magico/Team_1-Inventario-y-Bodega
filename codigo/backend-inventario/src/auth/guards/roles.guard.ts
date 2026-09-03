import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditoriaService } from 'src/auditoria/auditoria.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private auditoriaService: AuditoriaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (roles.some((role) => user.roles?.includes(role))) return true;

    await this.auditoriaService.create({
      id_usuario: user?.id_usuario ?? 0,
      accion: 'ACCESO_DENEGADO',
      entidad_afectada: request.route?.path ?? request.url,
      id_entidad_afectada: user?.id_usuario ?? 0,
      valor_anterior: null,
      valor_nuevo: {
        metodo_http: request.method,
        ruta: request.url,
        roles_requeridos: roles,
        roles_usuario: user?.roles ?? [],
      },
    });

    throw new ForbiddenException(
      'No tiene permisos para acceder a esta sección.',
    );
  }
}
