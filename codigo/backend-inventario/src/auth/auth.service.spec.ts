import { getRepositoryToken } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { JwtService } from '@nestjs/jwt';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Usuario), useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: AuditoriaService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

// BDD global: usuarios creados por G1, G3 (nombre.apellido) o G8 (solo email).
describe('AuthService — identificador compartido entre grupos', () => {
  const crear = () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const service = new AuthService(
      { findOne } as never,
      {} as never,
      {} as never,
    );
    return { service, findOne };
  };

  it('con @ busca por email, sin mayúsculas ni espacios', async () => {
    const { service, findOne } = crear();
    await expect(
      service.login({ nombre_usuario: ' Ana.Rojas@FiNet.cl ', password: 'Clave12345' }),
    ).rejects.toThrow();
    expect(findOne.mock.calls[0][0].where).toEqual({ email: 'ana.rojas@finet.cl' });
  });

  it('sin @ busca por nombre_usuario (acepta el punto de G3)', async () => {
    const { service, findOne } = crear();
    await expect(
      service.login({ nombre_usuario: 'tecnico.prueba1', password: 'Clave12345' }),
    ).rejects.toThrow();
    expect(findOne.mock.calls[0][0].where).toEqual({ nombre_usuario: 'tecnico.prueba1' });
  });
});

describe('LoginDto — formatos de los tres grupos', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { validateSync } = require('class-validator');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { plainToInstance } = require('class-transformer');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LoginDto } = require('./dto/login.dto');
  const valido = (nombre_usuario: string, password = 'Clave12345') =>
    validateSync(plainToInstance(LoginDto, { nombre_usuario, password })).length === 0;

  it('acepta jperez, nombre.apellido y email', () => {
    expect(valido('jperez')).toBe(true);
    expect(valido('tecnico.prueba1')).toBe(true);
    expect(valido('ana@finet.cl')).toBe(true);
  });

  it('rechaza espacios o símbolos raros y acepta claves de hasta 72', () => {
    expect(valido('juan perez')).toBe(false);
    expect(valido("x' or 1=1")).toBe(false);
    expect(valido('jperez', 'a'.repeat(72))).toBe(true);
    expect(valido('jperez', 'a'.repeat(73))).toBe(false);
  });
});
