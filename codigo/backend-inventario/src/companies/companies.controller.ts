import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CompaniesService } from './companies.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('empresas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  // CU-06: listado de empresas (selector en gestión de usuarios)
  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO')
  findAll() {
    return this.companiesService.findAll();
  }

  // CU-15: consolidado de ambas empresas, exclusivo SUPERUSUARIO
  @Get('dashboard')
  @Roles('SUPERUSUARIO')
  getDashboard() {
    return this.companiesService.getDashboard();
  }

  @Get('mi-dashboard')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  getMiDashboard(@Req() req) {
    return this.companiesService.getMiDashboard(req.user);
  }
}
