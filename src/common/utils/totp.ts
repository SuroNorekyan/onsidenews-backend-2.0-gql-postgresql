import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

export function generateTOTPSecret(username: string) {
  return speakeasy.generateSecret({ name: `OnsideNews (${username})` });
}

export async function getQRCodeImage(otpauthUrl: string): Promise<string> {
  return await qrcode.toDataURL(otpauthUrl);
}

export function verifyTOTP(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });
}

