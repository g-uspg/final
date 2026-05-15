import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { ResponseDto } from '../common/dto/response.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.is_active || user.deleted_at)
      throw new UnauthorizedException('Credenciales inválidas o usuario inactivo');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    await this.prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date() } });

    await this.prisma.auditLog.create({
      data: { user_id: user.id, action: 'LOGIN', resource: 'User', resource_id: user.id, ip_address: ip },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const jwtSecret = process.env.JWT_SECRET ?? 'smart_parking_jwt_secret_2026';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET ?? 'smart_parking_refresh_secret_2026';

    const access_token = this.jwt.sign(payload, { secret: jwtSecret, expiresIn: '1h' } as any);
    const refresh_token = this.jwt.sign(payload, { secret: jwtRefreshSecret, expiresIn: '7d' } as any);

    return ResponseDto.ok({
      access_token,
      refresh_token,
      user: { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name },
    }, 'Login exitoso');
  }

  async refresh(refresh_token: string) {
    try {
      const payload = this.jwt.verify(refresh_token, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'smart_parking_refresh_secret_2026',
      }) as any;
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.is_active) throw new UnauthorizedException();

      const access_token = this.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { secret: process.env.JWT_SECRET ?? 'smart_parking_jwt_secret_2026', expiresIn: '1h' } as any,
      );
      return ResponseDto.ok({ access_token }, 'Token renovado');
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async logout(userId: string) {
    await this.prisma.auditLog.create({
      data: { user_id: userId, action: 'LOGOUT', resource: 'User', resource_id: userId },
    });
    return ResponseDto.ok(null, 'Sesión cerrada');
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { vehicles: { where: { deleted_at: null } } },
    });
    const { password_hash: _, ...data } = user as any;
    return ResponseDto.ok(data, 'Perfil obtenido');
  }
}
