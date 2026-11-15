import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BorradorCierre } from './entities/borrador-cierre.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { TIPOS_TRABAJO, buscarTipoTrabajo } from './tipos-trabajo';

// ======================================================================
// Integraciones con G3 y G8 · CierresTrabajoService (servicio)
// CU-69 · Registrando cierre de trabajo de reparación
// CU-70 · Seleccionando tipo de trabajo codificado para cierre
// Entidades: BorradorCierre
// ======================================================================
@Injectable()
export class CierresTrabajoService {
  constructor(
    @InjectRepository(BorradorCierre)
    private readonly borradorRepository: Repository<BorradorCierre>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  // CU-70 · Seleccionando tipo de trabajo codificado para cierre
  listarTiposTrabajo(tipoOt?: string) {
    const filtro = (tipoOt ?? '').trim().toUpperCase();
    const tipos =
      filtro === 'INSTALACION' || filtro === 'REPARACION'
        ? TIPOS_TRABAJO.filter(
            (tipo) => tipo.tipo_ot === filtro || tipo.tipo_ot === 'AMBOS',
          )
        : TIPOS_TRABAJO;
    return tipos;
  }

  // CU-70 · Seleccionando tipo de trabajo codificado para cierre
  async obtenerBorrador(idOt: number, actor: any) {
    const borrador = await this.borradorRepository.findOne({
      where: { id_ot: this.idOtValido(idOt), id_empresa: actor.id_empresa },
    });
    return borrador ?? null;
  }

  // CU-70 · Seleccionando tipo de trabajo codificado para cierre
  async guardarBorrador(idOt: number, datos: any, actor: any) {
    const id_ot = this.idOtValido(idOt);
    const codigo = this.codigoValido(datos?.codigo_trabajo);

    const borrador = await this.borradorRepository.findOne({
      where: { id_ot, id_empresa: actor.id_empresa },
    });

    const valores = {
      id_ot,
      id_empresa: actor.id_empresa,
      id_tecnico: actor.id_usuario,
      codigoTrabajo: codigo,
      fallaReportada: this.texto(datos?.falla_reportada, 300),
      solucionAplicada: this.texto(datos?.solucion_aplicada, 300),
      resultado: this.resultadoValido(datos?.resultado),
      categoriaFalla: this.texto(datos?.categoria_falla, 120),
    };

    const guardado = await this.borradorRepository.save(
      borrador ? { ...borrador, ...valores } : valores,
    );

    await this.auditoriaService.create({
      id_usuario: actor.id_usuario,
      accion: borrador ? 'ACTUALIZAR_BORRADOR_CIERRE' : 'CREAR_BORRADOR_CIERRE',
      entidad_afectada: 'borrador_cierre',
      id_entidad_afectada: guardado.id_borrador,
      valor_anterior: borrador ? { ...borrador } : null,
      valor_nuevo: { ...guardado },
    });

    return guardado;
  }

  // CU-69 · Registrando cierre de trabajo de reparación
  // CU-70 · Seleccionando tipo de trabajo codificado para cierre
  async completarDesdeBorrador(
    manager: EntityManager,
    idOt: number,
    idEmpresa: number,
    codigoPayload?: string | null,
  ): Promise<{
    codigo_trabajo: string | null;
    campos: Record<string, string>;
  } | null> {
    const borrador = await manager.findOne(BorradorCierre, {
      where: { id_ot: idOt, id_empresa: idEmpresa },
    });
    const codigo =
      this.codigoValido(codigoPayload) ?? borrador?.codigoTrabajo ?? null;
    if (!borrador && !codigo) return null;

    const predefinidos = codigo ? (buscarTipoTrabajo(codigo)?.campos ?? {}) : {};
    const campos: Record<string, string> = {};
    const tomar = (clave: string, delBorrador?: string | null) => {
      const valor = delBorrador ?? predefinidos[clave];
      if (typeof valor === 'string' && valor.trim() !== '') {
        campos[clave] = valor.trim();
      }
    };

    tomar('falla_reportada', borrador?.fallaReportada);
    tomar('solucion_aplicada', borrador?.solucionAplicada);
    tomar('resultado', borrador?.resultado);
    tomar('categoria_falla', borrador?.categoriaFalla);

    return { codigo_trabajo: codigo, campos };
  }

  // Apoyo de CU-70
  private idOtValido(idOt: number): number {
    if (!Number.isInteger(idOt) || idOt <= 0) {
      throw new BadRequestException('El identificador de la OT es inválido.');
    }
    return idOt;
  }

  // Apoyo de CU-69, CU-70
  private codigoValido(valor: any): string | null {
    if (typeof valor !== 'string' || valor.trim() === '') return null;
    const tipo = buscarTipoTrabajo(valor);
    if (!tipo) {
      throw new BadRequestException(
        `El tipo de trabajo [${valor}] no existe en el catálogo (T-01 a T-10).`,
      );
    }
    return tipo.codigo;
  }

  // Apoyo de CU-70
  private resultadoValido(valor: any): string | null {
    if (typeof valor !== 'string' || valor.trim() === '') return null;
    const resultado = valor.trim().toUpperCase();
    if (!['RESUELTO', 'PARCIAL', 'SIN_SOLUCION'].includes(resultado)) {
      throw new BadRequestException(
        'El resultado debe ser RESUELTO, PARCIAL o SIN_SOLUCION.',
      );
    }
    return resultado;
  }

  // Apoyo de CU-70
  private texto(valor: any, largo: number): string | null {
    if (typeof valor !== 'string' || valor.trim() === '') return null;
    return valor.trim().slice(0, largo);
  }
}
