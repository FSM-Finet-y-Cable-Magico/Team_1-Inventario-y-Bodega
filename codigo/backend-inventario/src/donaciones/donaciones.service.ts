import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Donacion } from './entities/donacion.entity';
import { DonacionDetalle } from './entities/donacion-detalle.entity';
import { CreateDonacionDto } from './dto/create-donacion.dto';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EMPRESAS } from '../companies/companies.service';
import { construirPdf, LineaPdf } from './pdf';

// CU-80: solo se donan unidades dadas de baja con este motivo (CU-78)
const ESTADO_DADO_DE_BAJA = 'Dado de baja';
const MOTIVO_DONACION = 'Donación a institución';

const RUT_REGEX = /^\d{7,8}-[\dkK]$/;
const RESOLUCION_REGEX = /^[a-zA-Z0-9-]{1,30}$/;

export interface ActorJwt {
  id_usuario: number;
  id_empresa: number;
  roles?: string[];
}

@Injectable()
export class DonacionesService {
  constructor(
    @InjectRepository(Donacion)
    private readonly donacionRepository: Repository<Donacion>,
    @InjectRepository(DonacionDetalle)
    private readonly detalleRepository: Repository<DonacionDetalle>,
    @InjectRepository(UnidadEquipo)
    private readonly unidadRepository: Repository<UnidadEquipo>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly auditoriaService: AuditoriaService,
    private readonly dataSource: DataSource,
  ) {}

  private esSuperusuario(actor: ActorJwt): boolean {
    return actor.roles?.includes('SUPERUSUARIO') === true;
  }

  // Dígito verificador chileno (módulo 11)
  private digitoVerificadorValido(rut: string): boolean {
    const [cuerpo, dv] = rut.split('-');
    let suma = 0;
    let factor = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += Number(cuerpo[i]) * factor;
      factor = factor === 7 ? 2 : factor + 1;
    }
    const resto = 11 - (suma % 11);
    const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
    return esperado === dv.toUpperCase();
  }

  // Fecha de hoy en la zona del sistema (America/Santiago), en formato YYYY-MM-DD
  private hoyChile(): string {
    return new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Santiago',
    });
  }

  // CU-80: validaciones del formulario con mensajes acumulados (estilo catálogo)
  private validarFormulario(
    dto: CreateDonacionDto,
    exigirUnidades = true,
  ): {
    nombre: string;
    rut: string;
    fecha: string;
    resolucion: string | null;
  } {
    const errores: string[] = [];

    const nombre = dto.nombre_institucion?.trim() ?? '';
    if (nombre.length < 3 || nombre.length > 100) {
      errores.push(
        'El nombre de la institución receptora debe tener entre 3 y 100 caracteres.',
      );
    }

    const rut = dto.rut_institucion?.trim() ?? '';
    if (!RUT_REGEX.test(rut)) {
      errores.push(
        'El RUT de la institución debe tener el formato XXXXXXXX-X.',
      );
    } else if (!this.digitoVerificadorValido(rut)) {
      errores.push(
        'El RUT de la institución no es válido: el dígito verificador no corresponde.',
      );
    }

    const fecha = dto.fecha_donacion?.trim() ?? '';
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      isNaN(new Date(fecha).getTime())
    ) {
      errores.push(
        'La fecha de donación es obligatoria y debe tener el formato DD/MM/YYYY.',
      );
    } else if (fecha > this.hoyChile()) {
      errores.push('La fecha de donación no puede ser una fecha futura.');
    }

    const resolucion = dto.numero_resolucion?.trim() ?? '';
    if (resolucion && !RESOLUCION_REGEX.test(resolucion)) {
      errores.push(
        'El número de resolución debe tener entre 1 y 30 caracteres alfanuméricos.',
      );
    }

    if (
      exigirUnidades &&
      (!Array.isArray(dto.ids_unidades) || dto.ids_unidades.length === 0)
    ) {
      errores.push(
        'Debe seleccionar al menos un equipo para incluir en la donación.',
      );
    }

    if (errores.length > 0) throw new BadRequestException(errores.join(' '));

    return {
      nombre,
      rut: rut.toUpperCase(),
      fecha,
      resolucion: resolucion || null,
    };
  }

  // CU-80: unidades que pueden donarse (dadas de baja por donación y sin donación previa)
  async listarCandidatas(actor: ActorJwt): Promise<Record<string, unknown>[]> {
    const unidades = await this.unidadRepository.find({
      where: this.esSuperusuario(actor)
        ? { estado: ESTADO_DADO_DE_BAJA, motivoBaja: MOTIVO_DONACION }
        : {
            estado: ESTADO_DADO_DE_BAJA,
            motivoBaja: MOTIVO_DONACION,
            id_empresa: actor.id_empresa,
          },
      relations: { tipoEquipo: true },
    });
    if (unidades.length === 0) return [];

    const yaDonadas = await this.unidadesYaDonadas(
      unidades.map((u) => u.id_unidad),
    );

    return unidades
      .filter((u) => !yaDonadas.has(u.id_unidad))
      .map((u) => this.resumenUnidad(u));
  }

  private async unidadesYaDonadas(idsUnidades: number[]): Promise<Set<number>> {
    if (idsUnidades.length === 0) return new Set();
    const detalles = await this.detalleRepository.findBy({
      id_unidad: In(idsUnidades),
    });
    return new Set(detalles.map((d) => d.id_unidad));
  }

  private resumenUnidad(u: UnidadEquipo): Record<string, unknown> {
    return {
      id_unidad: u.id_unidad,
      numero_serie: u.serialNumber,
      tipo_equipo: u.tipoEquipo?.nombre ?? null,
      categoria: u.tipoEquipo?.categoria ?? null,
      marca: u.tipoEquipo?.marca ?? null,
      modelo: u.modelo ?? u.tipoEquipo?.modelo ?? null,
      fecha_adquisicion: u.fechaAdquisicion ?? null,
      motivo_baja: u.motivoBaja ?? null,
      estado: u.estado,
    };
  }

  // CU-80: valida solo los datos de la institución, sin registrar nada. La usa el
  // flujo encadenado de la baja por donación (CU-78 → CU-80) para comprobarlos
  // ANTES de dar de baja el equipo, porque la baja es irreversible.
  validarDatos(dto: CreateDonacionDto): { valido: true } {
    this.validarFormulario(dto, false);
    return { valido: true };
  }

  //CU-80
  async registrar(
    dto: CreateDonacionDto,
    actor: ActorJwt,
  ): Promise<Record<string, unknown>> {
    const { nombre, rut, fecha, resolucion } = this.validarFormulario(dto);

    const idsUnidades = [...new Set(dto.ids_unidades)];
    const unidades = await this.unidadRepository.findBy({
      id_unidad: In(idsUnidades),
    });

    // CU-80 Excepción 1: se indican los NS que no cumplen la condición
    const invalidos: string[] = [];
    const noEncontrados = idsUnidades.filter(
      (id) => !unidades.some((u) => u.id_unidad === id),
    );
    for (const u of unidades) {
      if (!this.esSuperusuario(actor) && u.id_empresa !== actor.id_empresa) {
        invalidos.push(`${u.serialNumber} (pertenece a otra empresa)`);
      } else if (u.estado !== ESTADO_DADO_DE_BAJA) {
        invalidos.push(`${u.serialNumber} (estado actual: ${u.estado})`);
      } else if (u.motivoBaja !== MOTIVO_DONACION) {
        invalidos.push(
          `${u.serialNumber} (motivo de baja: ${u.motivoBaja ?? 'sin motivo registrado'})`,
        );
      }
    }
    const yaDonadas = await this.unidadesYaDonadas(idsUnidades);
    for (const u of unidades) {
      if (yaDonadas.has(u.id_unidad))
        invalidos.push(`${u.serialNumber} (ya incluido en otra donación)`);
    }
    if (noEncontrados.length > 0) {
      invalidos.push(...noEncontrados.map((id) => `unidad #${id} (no existe)`));
    }

    if (invalidos.length > 0) {
      throw new BadRequestException(
        `Los siguientes equipos no están dados de baja con motivo '${MOTIVO_DONACION}' y deben quitarse del listado: ${invalidos.join(', ')}.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const donacion = await queryRunner.manager.save(
        this.donacionRepository.create({
          nombre_institucion: nombre,
          rut_institucion: rut,
          fecha_donacion: fecha,
          numero_resolucion: resolucion,
          id_usuario: actor.id_usuario,
          id_empresa: unidades[0].id_empresa,
          fecha_creacion: new Date(),
        }),
      );

      for (const u of unidades) {
        await queryRunner.manager.save(
          this.detalleRepository.create({
            id_donacion: donacion.id_donacion,
            id_unidad: u.id_unidad,
          }),
        );
      }

      await queryRunner.commitTransaction();

      await this.auditoriaService.create({
        id_usuario: actor.id_usuario,
        accion: 'DONACION',
        entidad_afectada: 'donacion',
        id_entidad_afectada: donacion.id_donacion,
        valor_anterior: null,
        valor_nuevo: {
          institucion: nombre,
          rut_institucion: rut,
          fecha_donacion: fecha,
          numero_resolucion: resolucion,
          numeros_serie: unidades.map((u) => u.serialNumber),
        },
      });

      return {
        success: true,
        id_donacion: donacion.id_donacion,
        institucion: nombre,
        equipos: unidades.length,
        message: `Donación registrada con ${unidades.length} equipo(s). El resumen en PDF está disponible para descarga.`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //CU-80
  async listar(actor: ActorJwt): Promise<Record<string, unknown>[]> {
    const donaciones = await this.donacionRepository.find({
      where: this.esSuperusuario(actor) ? {} : { id_empresa: actor.id_empresa },
      order: { fecha_donacion: 'DESC', id_donacion: 'DESC' },
    });
    if (donaciones.length === 0) return [];

    const detalles = await this.detalleRepository.findBy({
      id_donacion: In(donaciones.map((d) => d.id_donacion)),
    });
    const usuarios = await this.usuarioRepository.findBy({
      id_usuario: In([...new Set(donaciones.map((d) => d.id_usuario))]),
    });
    const mapaUsuarios = new Map(
      usuarios.map((u) => [u.id_usuario, u.nombre_completo]),
    );
    const mapaEmpresas = new Map(EMPRESAS.map((e) => [e.id, e.nombre]));

    return donaciones.map((d) => ({
      id_donacion: d.id_donacion,
      nombre_institucion: d.nombre_institucion,
      rut_institucion: d.rut_institucion,
      fecha_donacion: d.fecha_donacion,
      numero_resolucion: d.numero_resolucion,
      empresa: mapaEmpresas.get(d.id_empresa) ?? null,
      registrada_por: mapaUsuarios.get(d.id_usuario) ?? null,
      fecha_creacion: d.fecha_creacion,
      equipos: detalles.filter((det) => det.id_donacion === d.id_donacion)
        .length,
    }));
  }

  //CU-80
  async obtenerDetalle(idDonacion: number, actor: ActorJwt) {
    const donacion = await this.donacionRepository.findOne({
      where: { id_donacion: idDonacion },
    });
    if (!donacion)
      throw new NotFoundException(
        `No existe la donación con ID [${idDonacion}].`,
      );
    if (
      !this.esSuperusuario(actor) &&
      donacion.id_empresa !== actor.id_empresa
    ) {
      throw new NotFoundException(
        `No existe la donación con ID [${idDonacion}].`,
      );
    }

    const detalles = await this.detalleRepository.findBy({
      id_donacion: idDonacion,
    });
    const unidades = detalles.length
      ? await this.unidadRepository.find({
          where: { id_unidad: In(detalles.map((d) => d.id_unidad)) },
          relations: { tipoEquipo: true },
        })
      : [];
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usuario: donacion.id_usuario },
    });

    return {
      donacion,
      unidades,
      registradaPor: usuario?.nombre_completo ?? null,
    };
  }

  // CU-80: resumen en PDF con la información tributaria de la donación
  async generarPdf(
    idDonacion: number,
    actor: ActorJwt,
  ): Promise<{ nombreArchivo: string; contenido: Buffer }> {
    const { donacion, unidades, registradaPor } = await this.obtenerDetalle(
      idDonacion,
      actor,
    );
    const empresa =
      EMPRESAS.find((e) => e.id === donacion.id_empresa)?.nombre ?? '-';

    const fmt = (fecha: string | Date | null | undefined): string => {
      if (!fecha) return '-';
      const [anio, mes, dia] = new Date(fecha)
        .toISOString()
        .slice(0, 10)
        .split('-');
      return `${dia}/${mes}/${anio}`;
    };
    const col = (texto: string | null | undefined, ancho: number): string =>
      (texto ?? '-').slice(0, ancho).padEnd(ancho);

    const lineas: LineaPdf[] = [
      { texto: 'Resumen de donación de equipos', negrita: true, tamano: 16 },
      { texto: `Donación N° ${donacion.id_donacion}`, tamano: 10 },
      { texto: '' },
      { texto: 'Institución receptora', negrita: true },
      { texto: `Nombre: ${donacion.nombre_institucion}` },
      { texto: `RUT: ${donacion.rut_institucion}` },
      { texto: `Fecha de donación: ${fmt(donacion.fecha_donacion)}` },
      {
        texto: `Número de resolución: ${donacion.numero_resolucion ?? 'No indicado'}`,
      },
      { texto: '' },
      { texto: 'Empresa donante', negrita: true },
      { texto: `Empresa: ${empresa}` },
      { texto: `Registrada por: ${registradaPor ?? '-'}` },
      { texto: `Fecha de emisión: ${fmt(new Date())}` },
      { texto: '' },
      { texto: `Equipos donados (${unidades.length})`, negrita: true },
      {
        texto: `${col('N° de serie', 22)}${col('Tipo', 24)}${col('Marca', 12)}${col('Modelo', 12)}Adquisición`,
        negrita: true,
        tamano: 9,
        mono: true,
      },
    ];

    for (const u of unidades) {
      lineas.push({
        texto:
          `${col(u.serialNumber, 22)}${col(u.tipoEquipo?.nombre, 24)}` +
          `${col(u.tipoEquipo?.marca, 12)}${col(u.modelo ?? u.tipoEquipo?.modelo, 12)}` +
          `${fmt(u.fechaAdquisicion)}`,
        tamano: 9,
        mono: true,
      });
    }

    lineas.push({ texto: '' });
    lineas.push({
      texto: `Total de equipos donados: ${unidades.length}`,
      negrita: true,
    });
    lineas.push({
      texto:
        'Todos los equipos figuran dados de baja con motivo "Donación a institución".',
      tamano: 9,
    });

    return {
      nombreArchivo: `donacion-${donacion.id_donacion}.pdf`,
      contenido: construirPdf(lineas),
    };
  }
}
