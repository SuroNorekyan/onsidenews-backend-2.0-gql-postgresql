//src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginInput } from './dto/login.input';
import { AuthResponse } from './dto/auth-response.output';
import { verifyTOTP } from 'src/common/utils/totp';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string) {
    const user = await this.usersService.findByUsername(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    return null;
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.usersService.findByUsername(input.username);
    if (!user || !(await bcrypt.compare(input.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isTwoFactorEnabled) {
      if (
        !input.twoFactorCode ||
        !user.twoFactorSecret ||
        !verifyTOTP(user.twoFactorSecret, input.twoFactorCode)
      ) {
        throw new UnauthorizedException('2FA code required or incorrect');
      }
    }

    const payload = {
      username: user.username,
      sub: user.userId,
      role: user.role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }
}

