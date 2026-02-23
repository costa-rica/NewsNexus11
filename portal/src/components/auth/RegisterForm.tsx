"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import Image from "next/image";
import React, { useState, useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";
import { loginUser, updateStateArray } from "@/store/features/user/userSlice";
import { registerSchema, validateInput } from "@/lib/validationSchemas";
import { logSecurityEvent, getValidationSeverity } from "@/lib/securityLogger";

export default function RegisterForm() {
	const [showPassword, setShowPassword] = useState(false);
	const [email, emailSetter] = useState("");
	const [password, passwordSetter] = useState("");
	const dispatch = useAppDispatch();
	const router = useRouter();
	const userReducer = useAppSelector((s) => s.user);

	const fetchStateArray = useCallback(async () => {
		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_BASE_URL}/states`
			);

			console.log(`Response status: ${response.status}`);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Server Error: ${errorText}`);
			}

			const result = await response.json();

			if (result.statesArray && Array.isArray(result.statesArray)) {
				const tempStatesArray = result.statesArray.map((stateObj: { id: number; name: string }) => ({
					...stateObj,
					selected: false,
				}));
				dispatch(updateStateArray(tempStatesArray));
			} else {
				dispatch(updateStateArray([]));
			}
		} catch (error) {
			console.error("Error fetching states:", error);
		}
	}, [dispatch]);

	useEffect(() => {
		// Auto-redirect if user is already logged in
		if (userReducer.token) {
			router.push("/articles/review");
			return;
		}

		// Only fetch if stateArray is empty or undefined
		if (!userReducer.stateArray || userReducer.stateArray.length === 0) {
			fetchStateArray();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetchStateArray, userReducer.token, router]);

	const handleClickRegister = async () => {
		// SECURITY: Validate input before sending to backend
		// Prevents malicious input patterns and provides immediate user feedback
		const validationResult = validateInput(registerSchema, { email, password });

		if (!validationResult.success) {
			// SECURITY LOGGING: Log validation failure for monitoring
			// This helps detect attack attempts and suspicious patterns
			const firstError = Object.values(validationResult.errors)[0];

			logSecurityEvent({
				type: 'INVALID_INPUT',
				severity: getValidationSeverity(firstError),
				message: 'Registration form validation failed',
				endpoint: '/users/register',
				details: {
					errors: validationResult.errors,
					emailProvided: !!email,
					passwordProvided: !!password,
				},
			});

			// Show first validation error to user
			alert(firstError);
			return;
		}

		// Use validated and sanitized data (email is trimmed and lowercased)
		const bodyObj = validationResult.data;

		const response = await fetch(
			`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/register`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(bodyObj),
			}
		);

		console.log("Received response:", response.status);

		let resJson = null;
		const contentType = response.headers.get("Content-Type");

		if (contentType?.includes("application/json")) {
			resJson = await response.json();
		}

		if (response.ok) {
			// Use validated email (sanitized: trimmed and lowercased)
			resJson.email = validationResult.data.email;
			try {
				dispatch(loginUser(resJson));
				router.push("/articles/review");
			} catch (error) {
				console.error("Error registering:", error);
				alert("Error registering");
			}
		} else {
			const errorMessage =
				resJson?.error || `There was a server error: ${response.status}`;
			alert(errorMessage);
		}
	};

	return (
		<div className="flex flex-col flex-1  w-full">
			<div className="grid grid-cols-1 lg:grid-cols-2 w-full h-screen mt-5">
				<div className="flex flex-col justify-center px-6 lg:px-12 w-full h-full">
					<div className="mb-5 sm:mb-8">
						<h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
							Register
						</h1>
					</div>
					<div>
						<form>
							<div className="space-y-6">
								<div>
									<Label>
										Email <span className="text-error-500">*</span>{" "}
									</Label>
									<Input
										placeholder="example@gmail.com"
										type="email"
										value={email}
										onChange={(e) => emailSetter(e.target.value)}
									/>
								</div>
								<div>
									<Label>
										Password <span className="text-error-500">*</span>{" "}
									</Label>
									<div className="relative">
										<Input
											type={showPassword ? "text" : "password"}
											value={password}
											onChange={(e) => passwordSetter(e.target.value)}
											placeholder="Enter your password"
										/>
										<span
											onClick={() => setShowPassword(!showPassword)}
											className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
										>
											{showPassword ? (
												<EyeIcon className="fill-gray-500 dark:fill-gray-400" />
											) : (
												<EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
											)}
										</span>
									</div>
								</div>
								<div>
									<Button
										type="button"
										className="w-full"
										size="sm"
										onClick={() => {
											handleClickRegister();
										}}
									>
										Register
									</Button>
								</div>
							</div>
						</form>

						<div className="mt-5">
							<p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
								Already registered? {""}
								<Link
									href="/login"
									className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
								>
									Login
								</Link>
							</p>
						</div>
					</div>
				</div>
				<div className="hidden lg:flex items-center justify-center w-full h-full p-10">
					<Image
						width={1500}
						height={1500}
						className="w-full h-full object-contain"
						src="/images/kmLogo_square1500.png"
						alt="Km Logo"
					/>
				</div>
			</div>
		</div>
	);
}
