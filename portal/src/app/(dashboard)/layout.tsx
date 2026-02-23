// src/app/(dashboard)/layout.tsx
"use client";
import React from "react";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { isExpanded, isMobileOpen } = useSidebar();

	const mainContentMargin = isMobileOpen
		? "mr-0"
		: isExpanded
		? "lg:mr-[290px]"
		: "lg:mr-[90px]";

	return (
		<div className="min-h-screen xl:flex">
			<div
				className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
			>
				<AppHeader />
				<div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
					{children}
				</div>
			</div>
			<Backdrop />
			<AppSidebar />
		</div>
	);
}
