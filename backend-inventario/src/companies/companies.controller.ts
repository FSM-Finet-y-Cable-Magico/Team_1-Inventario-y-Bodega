import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CompaniesService } from './companies.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('empresas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CompaniesController {
    constructor(private readonly companiesService: CompaniesService) {}

    @Get('dashboard')
    @Roles('SUPERUSUARIO')
    getDashboard() {
        return this.companiesService.getDashboard();
    }
}
