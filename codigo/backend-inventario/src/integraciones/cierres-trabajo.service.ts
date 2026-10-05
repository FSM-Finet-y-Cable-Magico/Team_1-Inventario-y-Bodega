import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BorradorCierre } from './entities/borrador-cierre.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { TIPOS_TRABAJO, buscarTipoTrabajo } from './tipos-trabajo';

// CU-70: catálogo codificado de tipos de trabajo y borrador de cierre del técnico.
// El cierre de la OT lo ejecuta G3 (CU-63); lo que el técnico prepara aquí precompleta
// el cierre que nos llega por el webhook (CU-69) y queda en la auditoría.
@Injectable()
export class CierresTrabajoService {
  constructor(
    @InjectRepository(BorradorCierre)
    private readonly borradorRepository: Repository<BorradorCierre>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  // Las rutas de UI devuelven el dato desnudo (como el resto de los módulos del
  // frontend); el envoltorio {success, data} es del contrato S2S con G3/G8.
  // GET /tipos-trabajo — catálogo T-01..T-10 con sus campos predefinidos.
  // `tipo_ot` filtra los códigos que aplican a una instalación o a una reparación.
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

  // GET /cierres-trabajo/borradores/:idOt — lo que el técnico dejó preparado.
  async obtenerBorrador(idOt: number, actor: any) {
    const borrador = await this.borradorRepository.findOne({
      where: { id_ot: this.idOtValido(idOt), id_empresa: actor.id_empresa },
    });
    return borrador ?? null;
  }

  // PUT /cierres-trabajo/borradores/:idOt — guarda (o reemplaza) el borrador.
  // Excepción 1: `codigo_trabajo` puede venir vacío; el técnico completa a mano y
  // el borrador se guarda igual, sin tipo de trabajo.
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

  // CU-70 + CU-69: completa los campos del cierre que G3 no envía, con el borrador
  // del técnico primero y, si ese tampoco los trae, con el catálogo del código.
  // Devuelve null cuando no hay nada que aportar.
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

  private idOtValido(idOt: number): number {
    if (!Number.isInteger(idOt) || idOt <= 0) {
      throw new BadRequestException('El identificador de la OT es inválido.');
    }
    return idOt;
  }

  // Excepción 1: sin código el borrador es válido; con código, debe existir en el catálogo.
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

  private texto(valor: any, largo: number): string | null {
    if (typeof valor !== 'string' || valor.trim() === '') return null;
    return valor.trim().slice(0, largo);
  }
}
