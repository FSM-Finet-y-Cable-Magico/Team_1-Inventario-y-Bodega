import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { InventarioPersonal } from './entities/inventario-personal.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { EMPRESAS } from '../companies/companies.service';

// CU-58: mantenimiento del inventario personal del técnico.
// El saldo NUNCA puede quedar negativo (Excepción 1 con mensaje exacto).
// `sumar` y `descontar` reciben el EntityManager de la transacción que los
// invoca (salidas hoy; cierres CU-64/68 y devoluciones CU-82 mañana) y usan
// bloqueo de fila para no dejar saldos negativos ante operaciones simultáneas.
export const SALDO_INSUFICIENTE =
  'Saldo insuficiente. No es posible registrar esta operación.';

@Injectable()
export class InventarioPersonalService {
  constructor(
    @InjectRepository(InventarioPersonal)
    private readonly inventarioRepository: Repository<InventarioPersonal>,
    private readonly dataSource: DataSource,
  ) {}

  // CU-58: upsert atómico dentro de la transacción del llamador.
  async sumar(
    manager: EntityManager,
    idTecnico: number,
    idTipoEquipo: number,
    cantidad: number,
  ): Promise<void> {
    const row = await manager.findOne(InventarioPersonal, {
      where: { id_tecnico: idTecnico, id_tipo_equipo: idTipoEquipo },
      lock: { mode: 'pessimistic_write' },
    });
    if (row) {
      row.cantidad = String(Number(row.cantidad) + cantidad);
      await manager.save(row);
    } else {
      await manager.save(InventarioPersonal, {
        id_tecnico: idTecnico,
        id_tipo_equipo: idTipoEquipo,
        cantidad: String(cantidad),
      });
    }
  }

  // CU-58: descuento con bloqueo de fila. Lanza la Excepción 1 si el saldo
  // resultaría negativo. Hoy lo usa la devolución a bodega (CU-82) y el
  // descuento por uso en cierres (CU-64/68) cuando se implementen.
  async descontar(
    manager: EntityManager,
    idTecnico: number,
    idTipoEquipo: number,
    cantidad: number,
  ): Promise<void> {
    const row = await manager.findOne(InventarioPersonal, {
      where: { id_tecnico: idTecnico, id_tipo_equipo: idTipoEquipo },
      lock: { mode: 'pessimistic_write' },
    });
    if (!row || Number(row.cantidad) < cantidad) {
      throw new BadRequestException(SALDO_INSUFICIENTE);
    }
    row.cantidad = String(Number(row.cantidad) - cantidad);
    await manager.save(row);
  }

  // CU-68 (pre-check, sin bloqueo): saldo disponible del técnico para un tipo.
  async saldoDisponible(
    manager: EntityManager,
    idTecnico: number,
    idTipoEquipo: number,
  ): Promise<number> {
    const row = await manager.findOne(InventarioPersonal, {
      where: { id_tecnico: idTecnico, id_tipo_equipo: idTipoEquipo },
    });
    return row ? Number(row.cantidad) : 0;
  }

  // CU-64 (C)/CU-68 (webhook): descuento que NUNCA rechaza. Con bloqueo de fila
  // descuenta hasta el saldo disponible y devuelve el faltante como ajuste.
  async descontarHasta(
    manager: EntityManager,
    idTecnico: number,
    idTipoEquipo: number,
    cantidad: number,
  ): Promise<{ saldoAnterior: number; descontado: number; faltante: number }> {
    const row = await manager.findOne(InventarioPersonal, {
      where: { id_tecnico: idTecnico, id_tipo_equipo: idTipoEquipo },
      lock: { mode: 'pessimistic_write' },
    });
    const saldoAnterior = row ? Number(row.cantidad) : 0;
    const descontado = Math.min(saldoAnterior, cantidad);
    const faltante = cantidad - descontado;
    if (row && descontado > 0) {
      row.cantidad = String(saldoAnterior - descontado);
      await manager.save(row);
    }
    return { saldoAnterior, descontado, faltante: Number(faltante.toFixed(2)) };
  }

  // CU-68: compara el saldo con lo declarado y devuelve los insuficientes con el
  // mensaje exacto de la Excepción 1 (sirve de pre-check antes de confirmar).
  async detectarInsuficientes(
    manager: EntityManager,
    idTecnico: number,
    materiales: { id_tipo_equipo: number; cantidad: number }[],
  ): Promise<
    {
      id_tipo_equipo: number;
      nombre: string;
      disponible: number;
      declarado: number;
      unidad_medida: string;
      mensaje: string;
    }[]
  > {
    const insuficientes: {
      id_tipo_equipo: number;
      nombre: string;
      disponible: number;
      declarado: number;
      unidad_medida: string;
      mensaje: string;
    }[] = [];
    for (const material of materiales) {
      const disponible = await this.saldoDisponible(
        manager,
        idTecnico,
        material.id_tipo_equipo,
      );
      if (disponible < material.cantidad) {
        const tipo = await manager.findOne(TipoEquipo, {
          where: { id_tipo_equipo: material.id_tipo_equipo },
        });
        const nombre = tipo?.nombre ?? String(material.id_tipo_equipo);
        const unidad = tipo?.unidadMedida ?? 'Unidad';
        insuficientes.push({
          id_tipo_equipo: material.id_tipo_equipo,
          nombre,
          disponible,
          declarado: material.cantidad,
          unidad_medida: unidad,
          mensaje: `Saldo insuficiente de [${nombre}]: disponible ${disponible} ${unidad}, declarado ${material.cantidad} ${unidad}.`,
        });
      }
    }
    return insuficientes;
  }

  // CU-68: validación bloqueante para el flujo humano de confirmación del cierre
  // (mensaje exacto de la Excepción 1). El webhook de G3 no la usa: ahí el saldo
  // insuficiente se registra como ajuste/discrepancia, nunca rechazo.
  async validarSaldo(
    manager: EntityManager,
    idTecnico: number,
    materiales: { id_tipo_equipo: number; cantidad: number }[],
  ): Promise<void> {
    const insuficientes = await this.detectarInsuficientes(
      manager,
      idTecnico,
      materiales,
    );
    if (insuficientes.length > 0) {
      throw new BadRequestException(
        insuficientes.map((i) => i.mensaje).join(' '),
      );
    }
  }

  // CU-58: consulta del inventario de un técnico (NS asignados + saldos de consumibles).
  async consultar(idTecnico: number, idEmpresaContexto: number, actor: any) {
    const tecnico = await this.dataSource.getRepository(Usuario).findOne({
      where: { id_usuario: idTecnico },
      relations: { usuarioRoles: { rol: true } },
    });
    if (!tecnico) {
      throw new NotFoundException('Técnico no encontrado.');
    }

    const esPropio = actor?.id_usuario === idTecnico;
    const rolesActor: string[] = actor?.roles ?? [];
    const esSupervisor = rolesActor.some((r) =>
      ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'].includes(r),
    );

    // Un técnico solo puede ver su propio inventario; los roles de gestión, el de su empresa.
    if (!esSupervisor) {
      if (!esPropio) {
        throw new ForbiddenException(
          'Solo puede consultar su propio inventario personal.',
        );
      }
    } else if (tecnico.id_empresa !== idEmpresaContexto) {
      throw new NotFoundException('Técnico no encontrado.');
    }

    // (B) individualizables: NS en estado 'Asignado a técnico' asociados al técnico
    const unidades = await this.dataSource.getRepository(UnidadEquipo).find({
      where: { idTecnicoAsignado: idTecnico, estado: 'Asignado a técnico' },
      relations: { tipoEquipo: true },
      order: { id_unidad: 'DESC' },
    });

    // (A) consumibles: saldo por tipo de equipo
    const saldos = await this.inventarioRepository.find({
      where: { id_tecnico: idTecnico },
    });
    const idsTipos = [...new Set(saldos.map((s) => s.id_tipo_equipo))];
    const tipos = idsTipos.length
      ? await this.dataSource
          .getRepository(TipoEquipo)
          .findBy({ id_tipo_equipo: In(idsTipos) })
      : [];
    const mapaTipos = new Map(tipos.map((t) => [t.id_tipo_equipo, t]));

    const empresa =
      EMPRESAS.find((e) => e.id === tecnico.id_empresa)?.nombre ?? null;

    return {
      tecnico: {
        id_usuario: tecnico.id_usuario,
        nombre_completo: tecnico.nombre_completo,
        nombre_usuario: tecnico.nombre_usuario ?? null,
        empresa: empresa,
      },
      ns_asignados: unidades.map((u) => ({
        numero_serie: u.serialNumber,
        id_unidad: u.id_unidad,
        tipo: u.tipoEquipo?.nombre ?? null,
        estado: u.estado,
      })),
      saldos: saldos.map((s) => ({
        id_tipo_equipo: s.id_tipo_equipo,
        tipo: mapaTipos.get(s.id_tipo_equipo)?.nombre ?? null,
        saldo: Number(s.cantidad),
        unidad_medida: mapaTipos.get(s.id_tipo_equipo)?.unidadMedida ?? null,
      })),
    };
  }
}
