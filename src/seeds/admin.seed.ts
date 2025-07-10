import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { generateTOTPSecret } from '../common/utils/totp';
import { UserRole } from 'src/users/enums/user-role.enum';

export async function seedInitialAdmin() {
  try {
    console.log('⚙️  Starting admin seeding...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);

    const existingAdmins = await usersService.findAll({ role: UserRole.ADMIN });
    if (existingAdmins.length > 0) {
      console.log('Admin already exists. Skipping seeding.');
      await app.close();
      return;
    }

    const rawPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const totpSecret = generateTOTPSecret('initial-admin');

    const user = await usersService.create({
      username: 'admin_' + Date.now(),
      email: 'admin@onsidenews.io',
      password: hashedPassword,
      role: UserRole.ADMIN,
      dateOfBirth: '1990-01-01',
      isTwoFactorEnabled: true,
      twoFactorSecret: totpSecret.base32,
    } as any); // using `as any` for extra fields

    console.log(`✅ Initial admin created!`);
    console.log(`Username: ${user.username}`);
    console.log(`Password: ${rawPassword}`);
    console.log(`Scan this QR code in Google Authenticator:\n`);
    console.log(totpSecret.otpauth_url);
    console.log('\nSave this TOTP secret securely:', totpSecret.base32);

    await app.close();
  } catch (error) {
    console.error('❌ Error during admin seeding:', error);
  }
}

function generateSecurePassword(length = 32): string {
  return Array(length)
    .fill(null)
    .map(() => String.fromCharCode(33 + Math.floor(Math.random() * 94)))
    .join('');
}

seedInitialAdmin();

