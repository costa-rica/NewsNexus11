import 'express-serve-static-core';

declare global {
  namespace Express {
    interface AuthUser {
      id: number;
      email?: string;
      isAdmin?: boolean;
    }

    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
