import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

// sc-113/sc-158: las rutas /api/integraciones/* se autentican con X-API-KEY.
describe('ApiKeyGuard', () => {
  function crearGuard(keys: string) {
    const configService = { get: jest.fn().mockReturnValue(keys) };
    const guard = new ApiKeyGuard(configService as never);
    const request: any = { headers: {} };
    return { guard, request };
  }

  function contexto(request: any) {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as never;
  }

  it('sin header X-API-KEY → 401', () => {
    const { guard, request } = crearGuard('[{"key":"k1","grupo":"G8","empresas":[1]}]');
    expect(() => guard.canActivate(contexto(request))).toThrow(UnauthorizedException);
  });

  it('key desconocida → 401', () => {
    const { guard, request } = crearGuard('[{"key":"k1","grupo":"G8","empresas":[1]}]');
    request.headers['x-api-key'] = 'otra';
    expect(() => guard.canActivate(contexto(request))).toThrow(UnauthorizedException);
  });

  it('key válida → continúa y deja el contexto en la request', () => {
    const { guard, request } = crearGuard('[{"key":"k1","grupo":"G8","empresas":[1]}]');
    request.headers['x-api-key'] = 'k1';
    expect(guard.canActivate(contexto(request))).toBe(true);
    expect(request.integracion).toEqual({ grupo: 'G8', empresas: [1] });
  });
});
