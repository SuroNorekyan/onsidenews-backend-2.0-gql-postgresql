//src/users/users.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './user-entities/user.entity';
import { CreateUserInput } from './user-dto/create-user.input';
import { UpdateUserInput } from './user-dto/update-user.input';
import { UserFilterInput } from './user-dto/user-filter.input';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/guards/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { generateTOTPSecret, getQRCodeImage } from 'src/common/utils/totp';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => User)
  createUser(@Args('input') input: CreateUserInput) {
    if (input.role === 'admin') {
      // enforce that only admins can create admins
      // optionally, require 2FA revalidation here
    }
    return this.usersService.create(input);
  }

  @Mutation(() => User)
  updateUser(@Args('input') input: UpdateUserInput) {
    return this.usersService.update(input.id, input);
  }

  @Mutation(() => Boolean)
  deleteUser(@Args('id', { type: () => Int }) id: number) {
    return this.usersService.remove(id);
  }

  @Query(() => [User])
  users(
    @Args('filter', { nullable: true }) filter?: UserFilterInput,
  ): Promise<User[]> {
    return this.usersService.findAll(filter);
  }

  @Query(() => User)
  user(@Args('id', { type: () => Int }) id: number) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => String)
  async generate2FASecret(@CurrentUser() user: any): Promise<string> {
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Only admins can enable 2FA');
    }

    const { base32, otpauth_url } = generateTOTPSecret(user.username);
    const qrCode = await getQRCodeImage(otpauth_url);

    await this.usersService.update(user.userId, {
      twoFactorSecret: base32,
      isTwoFactorEnabled: true,
    } as any); // Extend UpdateUserInput with optional 2FA fields

    return qrCode; // base64 data URL for rendering QR
  }
}
