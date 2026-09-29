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
import type { Request, Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Actor, ReportesService } from './reportes.service';
import { ExportacionService } from './exportacion.service';

interface AuthenticatedRequest extends Request {
  user: Actor;
}

interface RawExportQuery {
  id_empresa?: string;
  id_bodega?: string;
  id_tipo_equipo?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo_movimiento?: string;
  id_usuario?: string;
  id_tecnico?: string;
  periodo?: string;
  rut?: string;
  nombre?: string;
  numero_serie?: string;
}

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
    @Req() req: AuthenticatedRequest,
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
    @Req() req: AuthenticatedRequest,
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
    @Req() req: AuthenticatedRequest,
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
    @Req() req: AuthenticatedRequest,
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
    @Req() req: AuthenticatedRequest,
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
    @Req() req: AuthenticatedRequest,
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

  @Get('equipos-instalados')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  getEquiposInstalados(
    @Query('rut') rut: string | undefined,
    @Query('nombre') nombre: string | undefined,
    @Query('numero_serie') numeroSerie: string | undefined,
    @Query('ns') ns: string | undefined,
    @Query('id_empresa') idEmpresa: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reportesService.getEquiposInstaladosReport(
      {
        rut,
        nombre,
        numero_serie: numeroSerie || ns,
        id_empresa: this.parseOptionalId(idEmpresa, 'empresa'),
      },
      req.user,
    );
  }

  @Get('tecnicos/productividad')
  @Roles('ADMIN', 'SUPERUSUARIO')
  getTecnicosProductividad(
    @Query('empresa') empresa: string | undefined,
    @Query('id_empresa') idEmpresa: string | undefined,
    @Query('tecnico') tecnico: string | undefined,
    @Query('id_tecnico') idTecnico: string | undefined,
    @Query('fecha_desde') fechaDesde: string | undefined,
    @Query('fecha_hasta') fechaHasta: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reportesService.getTecnicosProductividadReport(
      {
        id_empresa: this.parseOptionalId(idEmpresa || empresa, 'empresa'),
        id_tecnico: this.parseOptionalId(idTecnico || tecnico, 'técnico'),
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
      },
      req.user,
    );
  }

  @Get('exportar/excel')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async exportarExcel(
    @Query('tipo') tipo: string,
    @Query('id_empresa') idEmpresa: string | undefined,
    @Query('id_bodega') idBodega: string | undefined,
    @Query('id_tipo_equipo') idTipoEquipo: string | undefined,
    @Query('fecha_desde') fechaDesde: string | undefined,
    @Query('fecha_hasta') fechaHasta: string | undefined,
    @Query('tipo_movimiento') tipoMovimiento: string | undefined,
    @Query('id_usuario') idUsuario: string | undefined,
    @Query('id_tecnico') idTecnico: string | undefined,
    @Query('tecnico') tecnico: string | undefined,
    @Query('periodo') periodo: string | undefined,
    @Query('rut') rut: string | undefined,
    @Query('nombre') nombre: string | undefined,
    @Query('numero_serie') numeroSerie: string | undefined,
    @Query('ns') ns: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    if (!tipo) {
      throw new BadRequestException(
        'El parámetro tipo de reporte es requerido.',
      );
    }
    return this.handleExportExcel(
      tipo,
      {
        id_empresa: idEmpresa,
        id_bodega: idBodega,
        id_tipo_equipo: idTipoEquipo,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        tipo_movimiento: tipoMovimiento,
        id_usuario: idUsuario,
        id_tecnico: idTecnico || tecnico,
        periodo,
        rut,
        nombre,
        numero_serie: numeroSerie || ns,
      },
      req.user,
      res,
    );
  }

  @Get(':tipo/exportar/excel')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async exportarExcelPorTipo(
    @Param('tipo') tipo: string,
    @Query('id_empresa') idEmpresa: string | undefined,
    @Query('id_bodega') idBodega: string | undefined,
    @Query('id_tipo_equipo') idTipoEquipo: string | undefined,
    @Query('fecha_desde') fechaDesde: string | undefined,
    @Query('fecha_hasta') fechaHasta: string | undefined,
    @Query('tipo_movimiento') tipoMovimiento: string | undefined,
    @Query('id_usuario') idUsuario: string | undefined,
    @Query('id_tecnico') idTecnico: string | undefined,
    @Query('tecnico') tecnico: string | undefined,
    @Query('periodo') periodo: string | undefined,
    @Query('rut') rut: string | undefined,
    @Query('nombre') nombre: string | undefined,
    @Query('numero_serie') numeroSerie: string | undefined,
    @Query('ns') ns: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    return this.handleExportExcel(
      tipo,
      {
        id_empresa: idEmpresa,
        id_bodega: idBodega,
        id_tipo_equipo: idTipoEquipo,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        tipo_movimiento: tipoMovimiento,
        id_usuario: idUsuario,
        id_tecnico: idTecnico || tecnico,
        periodo,
        rut,
        nombre,
        numero_serie: numeroSerie || ns,
      },
      req.user,
      res,
    );
  }

  private async handleExportExcel(
    tipo: string,
    query: RawExportQuery,
    actor: Actor,
    res: Response,
  ) {
    const result = await this.reportesService.exportarReporteExcel(
      {
        tipo,
        id_empresa: this.parseOptionalId(query.id_empresa, 'empresa'),
        id_bodega: this.parseOptionalId(query.id_bodega, 'bodega'),
        id_tipo_equipo: this.parseOptionalId(
          query.id_tipo_equipo,
          'tipo de equipo',
        ),
        fecha_desde: query.fecha_desde,
        fecha_hasta: query.fecha_hasta,
        tipo_movimiento: query.tipo_movimiento,
        id_usuario: this.parseOptionalId(query.id_usuario, 'usuario'),
        id_tecnico: this.parseOptionalId(query.id_tecnico, 'técnico'),
        periodo: query.periodo,
        rut: query.rut,
        nombre: query.nombre,
        numero_serie: query.numero_serie,
      },
      actor,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader('Content-Length', result.buffer.length);
    res.end(result.buffer);
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
