// src/users/enums/user-role.enum.ts
import { registerEnumType } from '@nestjs/graphql';
export enum UserRole {
  ADMIN = 'admin',
  DEFAULT = 'default',
}

registerEnumType(UserRole, {
  name: 'UserRole',
});