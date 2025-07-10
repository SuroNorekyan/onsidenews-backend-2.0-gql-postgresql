import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const gqlCtx = context.getArgByIndex(2);
    const req = gqlCtx?.req || gqlCtx?.request;
    console.log('🔐 JwtAuthGuard executing:', {
      hasLogIn: typeof req?.logIn,
      hasUser: !!req?.user,
    });
    return req;
  }
}

