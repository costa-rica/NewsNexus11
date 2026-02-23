import RegisterForm from "@/components/auth/RegisterForm";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Register | NewsNexus Portal",
	description: "Register for a new NewsNexus account",
};

export default function Register() {
	return <RegisterForm />;
}
