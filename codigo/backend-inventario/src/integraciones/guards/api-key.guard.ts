import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ApiKeyEntry {
    key: string;
    grupo: string;
    // Empresas (id_empresa) que la key puede leer/escribir. Vacío o ausente = sin acceso.
    empresas: number[];
}

export interface IntegracionContexto {
    grupo: string;
    empresas: number[];
}

// sc-113: autenticación server-to-server de la integración con G3.
// No hay JWT: las rutas /api/integraciones/* se autentican con el header X-API-KEY.
// Las keys se configuran por entorno en INTEGRACION_API_KEYS (JSON):
//   [{"key":"...","grupo":"G3","empresas":[1,2]}]
// La key es una credencial: nunca va commiteada, se define en el entorno (Railway/local).
@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const header = request.headers['x-api-key'];
        const key = Array.isArray(header) ? header[0] : header;

        if (!key || typeof key !== 'string' || key.trim() === '') {
            throw new UnauthorizedException('Falta el header X-API-KEY.');
        }

        const entry = this.obtenerKeys().find((k) => k.key === key.trim());
        if (!entry) {
            throw new UnauthorizedException('La API key provista no es válida.');
        }

        request.integracion = { grupo: entry.grupo, empresas: entry.empresas };
        return true;
    }

    private obtenerKeys(): ApiKeyEntry[] {
        const raw = this.configService.get<string>('INTEGRACION_API_KEYS') ?? '[]';
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
}
