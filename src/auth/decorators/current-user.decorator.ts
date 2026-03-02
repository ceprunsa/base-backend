import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Injects `req.user` into controller method parameters */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
