import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './entities/proveedor.entity';
import { ProveedorTipoEquipo } from './entities/proveedor-tipo-equipo.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
    @InjectRepository(ProveedorTipoEquipo)
    private readonly proveedorTipoEquipoRepository: Repository<ProveedorTipoEquipo>,
    @InjectRepository(TipoEquipo)
    private readonly tipoEquipoRepository: Repository<TipoEquipo>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  // CU-49: calcula el dígito verificador del RUT chileno (módulo 11)
  // Reutilizable para CU-75, CU-78, CU-80, CU-81
  calcularDV(rutNumero: number): string {
    let suma = 0;
    let multiplo = 2;
    let temp = rutNumero;
    while (temp > 0) {
      suma += (temp % 10) * multiplo;
      temp = Math.floor(temp / 10);
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    const resultado = 11 - (suma % 11);
    if (resultado === 11) return '0';
    if (resultado === 10) return 'K';
    return String(resultado);
  }

  // CU-49: valida que el dígito verificador del RUT sea correcto
  validarRut(rut: string): boolean {
    const partes = rut.split('-');
    if (partes.length !== 2) return false;
    const [numStr, dv] = partes;
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return false;
    return this.calcularDV(num).toLowerCase() === dv.toLowerCase();
  }

  // CU-49: crear proveedor
  async create(dto: CreateProveedorDto, actorId: number): Promise<Proveedor> {
    // CU-49 Excepción 1: validar DV del RUT
    if (!this.validarRut(dto.rut)) {
      throw new BadRequestException(
        'El dígito verificador del RUT no es válido.',
      );
    }

    // normalizar DV a mayúscula
    const rutNormalizado = dto.rut.replace(/-[kK]$/, '-K');

    // CU-49 Excepción 2: RUT duplicado
    const existing = await this.proveedorRepository.findOne({
      where: { rut: rutNormalizado },
    });
    if (existing) {
      throw new ConflictException('Ya existe un proveedor con ese RUT.');
    }

    const proveedor = this.proveedorRepository.create({
      nombre_comercial: dto.nombre_comercial,
      rut: rutNormalizado,
      nombre_contacto: dto.nombre_contacto ?? null,
      telefono: dto.telefono ?? null,
      email: dto.email ?? null,
      activa: true,
    });
    const nuevo = await this.proveedorRepository.save(proveedor);

    // CU-49: asociar tipos de equipo (N:M opcional)
    if (dto.ids_tipos_equipo && dto.ids_tipos_equipo.length > 0) {
      const pivots = dto.ids_tipos_equipo.map((id_tipo_equipo) =>
        this.proveedorTipoEquipoRepository.create({
          id_proveedor: nuevo.id_proveedor,
          id_tipo_equipo,
        }),
      );
      await this.proveedorTipoEquipoRepository.save(pivots);
    }

    if (actorId) {
      await this.auditoriaService.create({
        id_usuario: actorId,
        accion: 'CREAR',
        entidad_afectada: 'proveedor',
        id_entidad_afectada: nuevo.id_proveedor,
        valor_anterior: null,
        valor_nuevo: { ...nuevo, ids_tipos_equipo: dto.ids_tipos_equipo ?? [] },
      });
    }

    return this.findOneConTipos(nuevo.id_proveedor);
  }

  // CU-50: editar proveedor
  async update(
    id: number,
    dto: Partial<CreateProveedorDto>,
    actorId: number,
  ): Promise<any> {
    const proveedor = await this.proveedorRepository.findOne({
      where: { id_proveedor: id },
    });
    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado.');
    }

    // CU-50: snapshot del valor anterior para auditoría
    const valorAnterior = {
      nombre_comercial: proveedor.nombre_comercial,
      rut: proveedor.rut,
      nombre_contacto: proveedor.nombre_contacto,
      telefono: proveedor.telefono,
      email: proveedor.email,
    };

    // CU-50: si se envía un RUT nuevo, validar DV y unicidad excluyendo el propio registro
    if (dto.rut !== undefined) {
      if (!this.validarRut(dto.rut)) {
        throw new BadRequestException(
          'El dígito verificador del RUT no es válido.',
        );
      }
      const rutNormalizado = dto.rut.replace(/-[kK]$/, '-K');
      const duplicado = await this.proveedorRepository.findOne({
        where: { rut: rutNormalizado },
      });
      if (duplicado && duplicado.id_proveedor !== id) {
        throw new ConflictException('Ya existe un proveedor con ese RUT.');
      }
      proveedor.rut = rutNormalizado;
    }

    // CU-50: actualizar solo los campos enviados
    if (dto.nombre_comercial !== undefined)
      proveedor.nombre_comercial = dto.nombre_comercial;
    if (dto.nombre_contacto !== undefined)
      proveedor.nombre_contacto = dto.nombre_contacto ?? null;
    if (dto.telefono !== undefined) proveedor.telefono = dto.telefono ?? null;
    if (dto.email !== undefined) proveedor.email = dto.email ?? null;

    await this.proveedorRepository.save(proveedor);

    // CU-50: reemplazar los tipos de equipo asociados si se envían
    if (dto.ids_tipos_equipo !== undefined) {
      await this.proveedorTipoEquipoRepository.delete({ id_proveedor: id });
      if (dto.ids_tipos_equipo.length > 0) {
        const pivots = dto.ids_tipos_equipo.map((id_tipo_equipo) =>
          this.proveedorTipoEquipoRepository.create({
            id_proveedor: id,
            id_tipo_equipo,
          }),
        );
        await this.proveedorTipoEquipoRepository.save(pivots);
      }
    }

    // CU-50: obtener los tipos actualizados para auditoría
    const actualizado = await this.findOneConTipos(id);

    // CU-50: auditoría con valor_anterior y valor_nuevo
    await this.auditoriaService.create({
      id_usuario: actorId,
      accion: 'EDITAR',
      entidad_afectada: 'proveedor',
      id_entidad_afectada: id,
      valor_anterior: valorAnterior,
      valor_nuevo: {
        nombre_comercial: proveedor.nombre_comercial,
        rut: proveedor.rut,
        nombre_contacto: proveedor.nombre_contacto,
        telefono: proveedor.telefono,
        email: proveedor.email,
      },
    });

    return actualizado;
  }

  //CU-51
  async findAll(filtros?: {
    buscar?: string;
    activa?: boolean;
  }): Promise<any[]> {
    const query = this.proveedorRepository.createQueryBuilder('p');

    if (filtros?.activa !== undefined) {
      query.andWhere('p.activa = :activa', { activa: filtros.activa });
    }
    if (filtros?.buscar) {
      query.andWhere(
        '(p.nombre_comercial ILIKE :buscar OR p.rut ILIKE :buscar)',
        { buscar: `%${filtros.buscar}%` },
      );
    }

    const proveedores = await query
      .orderBy('p.nombre_comercial', 'ASC')
      .getMany();
    return Promise.all(
      proveedores.map((p) => this.findOneConTipos(p.id_proveedor)),
    );
  }

  private async findOneConTipos(id: number): Promise<any> {
    const proveedor = await this.proveedorRepository.findOne({
      where: { id_proveedor: id },
    });
    if (!proveedor) return null;

    const pivots = await this.proveedorTipoEquipoRepository.find({
      where: { id_proveedor: id },
    });
    const tipos: TipoEquipo[] = [];
    for (const pivot of pivots) {
      const te = await this.tipoEquipoRepository.findOne({
        where: { id_tipo_equipo: pivot.id_tipo_equipo },
      });
      if (te) tipos.push(te);
    }

    return {
      ...proveedor,
      tipos_equipo: tipos.map((t) => ({
        id_tipo_equipo: t.id_tipo_equipo,
        nombre: t.nombre,
      })),
    };
  }
}
