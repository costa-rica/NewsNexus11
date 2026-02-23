import jwt from "jsonwebtoken";
import { User } from "@newsnexus/db-models";
import logger from "./logger";
import type { NextFunction, Request, Response } from "express";

type JwtAuthPayload = {
  id: number | string;
};

function extractUserIdFromDecodedToken(decoded: unknown): number | null {
  if (typeof decoded !== "object" || decoded === null || !("id" in decoded)) {
    return null;
  }

  const payload = decoded as JwtAuthPayload;
  const userId = Number(payload.id);
  if (!Number.isFinite(userId) || userId <= 0) {
    return null;
  }

  return userId;
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  if (process.env.AUTHENTIFICATION_TURNED_OFF === "true") {
    const user = await User.findOne({
      where: { email: "nickrodriguez@kineticmetrics.com" },
    });
    req.user = user || undefined;
    return next();
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ message: "Token is required" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "JWT_SECRET is not configured" });
  }

  jwt.verify(token, secret, async (err: any, decoded: unknown) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    const userId = extractUserIdFromDecodedToken(decoded);
    if (!userId) {
      return res.status(403).json({ message: "Invalid token payload" });
    }

    const user = await User.findByPk(userId);
    req.user = user || undefined;
    next();
  });
}

export async function findUserByEmail(email: string) {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      logger.info("User not found");
    }
    logger.info(user);
    return user;
  } catch (error) {
    logger.error("Error finding user by email:", error);
    return null;
  }
}

export const restrictEmails = (email: string): boolean => {
  const acceptedEmailsEnv = process.env.ACCEPTED_EMAILS;

  if (!acceptedEmailsEnv) {
    return true;
  }

  const acceptedEmails = acceptedEmailsEnv.split(",");
  return acceptedEmails.includes(email);
};
