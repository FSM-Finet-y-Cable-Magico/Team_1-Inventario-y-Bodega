import { Controller, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

// Autenticación · AuthController (controlador)
// CU-01 · Iniciando sesión en el sistema
// CU-10 · Restableciendo contraseña de usuario
// CU-11 · Cerrando sesión automáticamente por inactividad
// CU-12 · Cerrando sesión del sistema
// CU-13 · Cargando contexto de empresa Finet al iniciar sesión
// CU-14 · Cargando contexto de empresa Cable Mágico al iniciar sesión
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // CU-01 · Iniciando sesión en el sistema
  // CU-13 · Cargando contexto de empresa Finet al iniciar sesión
  // CU-14 · Cargando contexto de empresa Cable Mágico al iniciar sesión
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // CU-11 · Cerrando sesión automáticamente por inactividad
  // CU-12 · Cerrando sesión del sistema
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  logout(@Req() req, @Body() body?: { motivo?: string }) {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    return this.authService.logout(token, req.user.id_usuario, body?.motivo);
  }

  // CU-10 · Restableciendo contraseña de usuario
  @Post('cambiar-password')
  cambiarPassword(@Body() dto: CambiarPasswordDto) {
    return this.authService.cambiarPassword(dto);
  }

  // CU-10 · Restableciendo contraseña de usuario
  @Post('restablecer-password/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPERUSUARIO')
  restablecerPassword(@Param('id') id: string, @Req() req) {
    return this.authService.restablecerPassword(+id, req.user.id_usuario);
  }
}
