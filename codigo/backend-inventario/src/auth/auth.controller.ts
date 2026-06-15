import { Controller, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  logout(@Req() req, @Body() body?: { motivo?: string }) {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    return this.authService.logout(token, req.user.id_usuario, body?.motivo);
  }

  // CU-10: cambio obligatorio de contraseña tras un restablecimiento
  @Post('cambiar-password')
  cambiarPassword(@Body() dto: CambiarPasswordDto) {
    return this.authService.cambiarPassword(dto);
  }

  @Post('restablecer-password/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPERUSUARIO')
  restablecerPassword(@Param('id') id: string, @Req() req) {
    return this.authService.restablecerPassword(+id, req.user.id_usuario);
  }
}
