import LoginForm from "@/components/auth/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "News Nexus Portal Login",
  description: "Login here ...",
};

export const dynamic = "force-dynamic";

export default function Login() {
  console.log("Login page");
  return <LoginForm />;
}
