import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportesService } from './reportes.service';
import { ExportacionService } from './exportacion.service';

@Controller('reportes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportesController {
  constructor(
    private readonly reportesService: ReportesService,
    private readonly exportacionService: ExportacionService,
  ) {}

  // CU-93: exportación a PDF del reporte visible, con sus mismos filtros.
  // El tipo es el del reporte: stock | movimientos | garantias |
  // tecnicos-inventario | consumo.
  @Get('exportar/:tipo/pdf')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async exportarPdf(
    @Param('tipo') tipo: string,
    @Query() query: Record<string, string>,
    @Req() req,
    @Res() res: Response,
  ) {
    const { archivo, nombre } = await this.exportacionService.exportarPdf(
      tipo,
      this.filtrosDeQuery(query),
      req.user,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Content-Length': archivo.length.toString(),
    });
    res.end(archivo);
  }

  //CU-85
  @Get('stock')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  getStock(
    @Query('id_empresa') idEmpresa: string | undefined,
    @Query('id_bodega') idBodega: string | undefined,
    @Query('id_tipo_equipo') idTipoEquipo: string | undefined,
    @Req() req,
  ) {
    return this.reportesService.getStockReport(
      {
        id_empresa: this.parseOptionalId(idEmpresa, 'empresa'),
        id_bodega: this.parseOptionalId(idBodega, 'bodega'),
        id_tipo_equipo: this.parseOptionalId(idTipoEquipo, 'tipo de equipo'),
      },
      req.user,
    );
  }

  //CU-86
  @Get('movimientos')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  getMovimientos(
    @Query('id_empresa') idEmpresa: string | undefined,
    @Query('id_bodega') idBodega: string | undefined,
    @Query('id_tipo_equipo') idTipoEquipo: string | undefined,
    @Query('fecha_desde') fechaDesde: string | undefined,
    @Query('fecha_hasta') fechaHasta: string | undefined,
    @Query('tipo_movimiento') tipoMovimiento: string | undefined,
    @Query('id_usuario') idUsuario: string | undefined,
    @Req() req,
  ) {
    return this.reportesService.getMovementsReport(
      {
        id_empresa: this.parseOptionalId(idEmpresa, 'empresa'),
        id_bodega: this.parseOptionalId(idBodega, 'bodega'),
        id_tipo_equipo: this.parseOptionalId(idTipoEquipo, 'tipo de equipo'),
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        tipo_movimiento: tipoMovimiento,
        id_usuario: this.parseOptionalId(idUsuario, 'usuario'),
      },
      req.user,
    );
  }

  //CU-88
  @Get('garantias')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  getGarantias(
    @Query('id_empresa') idEmpresa: string | undefined,
    @Query('id_tipo_equipo') idTipoEquipo: string | undefined,
    @Query('periodo') periodo: string | undefined,
    @Req() req,
  ) {
    return this.reportesService.getGarantiasReport(
      {
        id_empresa: this.parseOptionalId(idEmpresa, 'empresa'),
        id_tipo_equipo: this.parseOptionalId(idTipoEquipo, 'tipo de equipo'),
        periodo: periodo,
      },
      req.user,
    );
  }

  //CU-89
  @Get('tecnicos/inventario')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  getInventarioTecnicos(
    @Query('id_empresa') idEmpresa: string | undefined,
    @Query('id_usuario') idUsuario: string | undefined,
    @Req() req,
  ) {
    return this.reportesService.getInventarioTecnicosReport(
      {
        id_empresa: this.parseOptionalId(idEmpresa, 'empresa'),
        id_usuario: this.parseOptionalId(idUsuario, 'usuario'),
      },
      req.user,
    );
  }

  //CU-91
  @Get('consumo')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  getConsumo(
    @Query('id_empresa') idEmpresa: string | undefined,
    @Query('id_tipo_equipo') idTipoEquipo: string | undefined,
    @Query('fecha_desde') fechaDesde: string | undefined,
    @Query('fecha_hasta') fechaHasta: string | undefined,
    @Req() req,
  ) {
    return this.reportesService.getConsumoReport(
      {
        id_empresa: this.parseOptionalId(idEmpresa, 'empresa'),
        id_tipo_equipo: this.parseOptionalId(idTipoEquipo, 'tipo de equipo'),
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
      },
      req.user,
    );
  }

  // Los filtros llegan igual que en el reporte visible; los identificadores se
  // validan con la misma regla y el resto viaja como texto.
  private filtrosDeQuery(query: Record<string, string>) {
    const numericos = [
      'id_empresa',
      'id_bodega',
      'id_tipo_equipo',
      'id_usuario',
    ];
    const filtros: Record<string, any> = {};
    for (const [clave, valor] of Object.entries(query)) {
      if (valor === undefined || valor === '') continue;
      filtros[clave] = numericos.includes(clave)
        ? this.parseOptionalId(valor, clave.replace('id_', ''))
        : valor;
    }
    return filtros;
  }

  private parseOptionalId(
    value: string | undefined,
    label: string,
  ): number | undefined {
    if (value === undefined || value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(
        `El identificador de ${label} no es válido.`,
      );
    }
    return parsed;
  }
}
