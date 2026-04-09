import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { Log } from '@services/loggerService';

/**
 * Middleware that requires the caller to confirm their password before
 * proceeding with a sensitive operation (editing bank, tax, etc.).
 *
 * The frontend must include `password` in the request body. On success, the
 * password is stripped from `req.body` so downstream validators/services
 * never see it.
 */
export async function requirePasswordConfirmation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!password) {
      return ApiResponse.error(res, 'Password is required to confirm this action', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user?.password) {
      return ApiResponse.error(
        res,
        'Please set a password first. You signed in with Google or LinkedIn.',
        400
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return ApiResponse.error(res, 'Incorrect password', 401);
    }

    // Strip password from body so downstream handlers never see it
    delete req.body.password;
    next();
  } catch (error) {
    Log.error('requirePasswordConfirmation error', { error });
    return ApiResponse.error(res, 'Failed to verify password', 500);
  }
}
