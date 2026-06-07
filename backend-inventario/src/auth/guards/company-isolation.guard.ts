import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Observable } from "rxjs";
import { Usuario } from "src/usuarios/entities/usuario.entity";

@Injectable()
export class CompanyIsolationGuard implements CanActivate{
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();

        const user: Usuario = request.user;

        if (!user) {
            throw new ForbiddenException('No autenticado. Por favor inicie sesion.');
        }

        if (user.id_empresa === null || user.id_empresa === undefined){
            throw new ForbiddenException('Su cuenta no tiene una empresa asignada. Contacte al administrador del sistema.');
        }

        request.companyContextId = user.id_empresa;

        return true;
    }
}