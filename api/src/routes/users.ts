import express from "express";
import { EntityWhoFoundArticle, User } from "@newsnexus/db-models";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { checkBodyReturnMissing } from "../modules/common";
import { authenticateToken } from "../modules/userAuthentication";
import { sendResetPasswordEmail } from "../modules/mailer";
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
} from "../middleware/rateLimiting";
import logger from "../modules/logger";

const router = express.Router();

type RegisterBody = {
  email?: unknown;
  password?: unknown;
};

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

type PasswordResetRequestBody = {
  email?: unknown;
};

type ResetPasswordBody = {
  newPassword?: unknown;
};

function getStringField(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

router.get("/", (_req, res) => {
  res.send("respond with a resource");
});

router.post("/register", registerLimiter, async (req, res) => {
  const body = req.body as RegisterBody;
  const email = getStringField(body.email);
  const password = getStringField(body.password);
  const { isValid, missingKeys } = checkBodyReturnMissing(req.body, [
    "password",
    "email",
  ]);

  if (!isValid) {
    return res.status(400).json({ error: `Missing ${missingKeys.join(", ")}` });
  }
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email and password must be non-empty strings" });
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    username: email.split("@")[0],
    password: hashedPassword,
    email,
  });

  await EntityWhoFoundArticle.create({ userId: user.id });

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "JWT_SECRET is not configured" });
  }

  const token = jwt.sign({ id: user.id }, secret);

  res.status(201).json({
    message: "User created successfully",
    token,
    user: {
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      id: user.id,
    },
  });
});

router.post("/login", loginLimiter, async (req, res) => {
  const body = req.body as LoginBody;
  const email = getStringField(body.email);
  const password = getStringField(body.password);
  const { isValid, missingKeys } = checkBodyReturnMissing(req.body, [
    "email",
    "password",
  ]);

  if (!isValid) {
    return res.status(400).json({ error: `Missing ${missingKeys.join(", ")}` });
  }
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email and password must be non-empty strings" });
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(400).json({ error: "Invalid password" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "JWT_SECRET is not configured" });
  }

  const token = jwt.sign({ id: user.id }, secret);
  res.json({
    message: "User logged in successfully",
    token,
    user: {
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      id: user.id,
    },
  });
});

router.post(
  "/request-password-reset",
  passwordResetLimiter,
  async (req, res) => {
    const body = req.body as PasswordResetRequestBody;
    const email = getStringField(body.email);
    logger.info(`- in POST /users/request-password-reset for email: ${email}`);

    if (!email) {
      return res.status(400).json({
        result: false,
        error: "Email is required",
      });
    }

    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res
          .status(404)
          .json({ result: false, message: "User not found" });
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res
          .status(500)
          .json({ result: false, error: "JWT_SECRET is not configured" });
      }

      const token = jwt.sign({ id: user.id }, secret, {
        expiresIn: "5h",
      });

      const resetLink = `${process.env.URL_BASE_TO_WEBSITE}/forgot-password/reset/${token}`;
      await sendResetPasswordEmail(email, resetLink);

      logger.info(`✓ Password reset email sent successfully to ${email}`);
      res.json({ result: true, message: "Password reset email sent" });
    } catch (error: any) {
      logger.error(
        `❌ [ROUTE DEBUG] Error in /request-password-reset for ${email}:`,
        {
          message: error.message,
          code: error.code,
          stack: error.stack,
        },
      );

      if (
        error.message &&
        error.message.includes("Email configuration error")
      ) {
        return res.status(503).json({
          result: false,
          error:
            "Email service is not configured. Please contact the administrator.",
        });
      }

      if (error.code === "EAUTH") {
        return res.status(503).json({
          result: false,
          error:
            "Email service authentication failed. Please contact the administrator.",
        });
      }

      return res.status(500).json({
        result: false,
        error: "Failed to send password reset email. Please try again later.",
      });
    }
  },
);

router.post("/reset-password/:token", async (req, res) => {
  const token = req.params.token;
  const body = req.body as ResetPasswordBody;
  const newPassword = getStringField(body.newPassword);

  if (!newPassword) {
    return res.status(400).json({
      result: false,
      error: "Password is required",
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res
        .status(500)
        .json({ result: false, error: "JWT_SECRET is not configured" });
    }

    const decoded = jwt.verify(token, secret) as { id: number };
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({ result: false, message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    res.json({ result: true, message: "Password reset successfully" });
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      return res
        .status(400)
        .json({ result: false, error: "Invalid reset token" });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(400).json({
        result: false,
        error: "Reset token has expired. Please request a new password reset.",
      });
    }

    return res.status(500).json({ result: false, error: "Server error" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const normalizedId = Array.isArray(id) ? id[0] : id;

  const user = await User.findByPk(normalizedId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  await user.destroy();
  res.status(200).json({ message: "User deleted successfully" });
});

router.post("/update/:userId", authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const normalizedUserId = Array.isArray(userId) ? userId[0] : userId;
  const { username, password, email, isAdmin } = req.body;

  logger.info(`Updating user ${normalizedUserId}`);

  const user = await User.findByPk(normalizedUserId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const updatedFields: Record<string, unknown> = {};
  if (username) updatedFields.username = username;
  if (email) updatedFields.email = email;
  if (typeof isAdmin === "boolean") {
    updatedFields.isAdmin = isAdmin;
  }

  if (password) {
    updatedFields.password = await bcrypt.hash(password, 10);
  }

  if (Object.keys(updatedFields).length > 0) {
    await user.update(updatedFields);
    logger.info(`User ${normalizedUserId} updated successfully`);
  } else {
    logger.info(`No updates applied for user ${normalizedUserId}`);
  }

  res.status(200).json({ message: "Mise à jour réussie.", user });
});

export = router;
