import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportesService } from './reportes.service';

@Controller('reportes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

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
