import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password - News Nexus",
  description: "Reset your password",
};

export default function ForgotPassword() {
  return <ForgotPasswordForm />;
}
