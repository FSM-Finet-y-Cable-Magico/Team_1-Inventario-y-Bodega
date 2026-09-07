import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
export const SALDO_INSUFICIENTE = 'Saldo insuficiente. No es posible registrar esta operación.';

@Injectable()
export class InventarioPersonalService {
    constructor(
        @InjectRepository(InventarioPersonal)
        private readonly inventarioRepository: Repository<InventarioPersonal>,
        private readonly dataSource: DataSource,
    ) {}

    // CU-58: upsert atómico dentro de la transacción del llamador.
    async sumar(manager: EntityManager, idTecnico: number, idTipoEquipo: number, cantidad: number): Promise<void> {
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
    async descontar(manager: EntityManager, idTecnico: number, idTipoEquipo: number, cantidad: number): Promise<void> {
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
        const esSupervisor = rolesActor.some((r) => ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'].includes(r));

        // Un técnico solo puede ver su propio inventario; los roles de gestión, el de su empresa.
        if (!esSupervisor) {
            if (!esPropio) {
                throw new ForbiddenException('Solo puede consultar su propio inventario personal.');
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
            ? await this.dataSource.getRepository(TipoEquipo).findBy({ id_tipo_equipo: In(idsTipos) })
            : [];
        const mapaTipos = new Map(tipos.map((t) => [t.id_tipo_equipo, t]));

        const empresa = EMPRESAS.find((e) => e.id === tecnico.id_empresa)?.nombre ?? null;

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
