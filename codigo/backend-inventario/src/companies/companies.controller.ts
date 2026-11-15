import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CompaniesService } from './companies.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// Empresas · CompaniesController (controlador)
// CU-15 · Consultando dashboard consolidado de ambas empresas
// CU-16 · Consultando datos aislados por empresa
@Controller('empresas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  // CU-16 · Consultando datos aislados por empresa
  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO')
  findAll() {
    return this.companiesService.findAll();
  }

  // CU-15 · Consultando dashboard consolidado de ambas empresas
  @Get('dashboard')
  @Roles('SUPERUSUARIO')
  getDashboard() {
    return this.companiesService.getDashboard();
  }

  // CU-16 · Consultando datos aislados por empresa
  @Get('mi-dashboard')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  getMiDashboard(@Req() req) {
    return this.companiesService.getMiDashboard(req.user);
  }
}
