"use client";

import { usePathname } from "next/navigation";
import { DepthRoom } from "@/components/home/DepthRoom";
import { OrbitField } from "./OrbitField";

/** The home page gets the 3D room; every other page gets the ambient bubbles. */
export function AmbientBackground() {
  const pathname = usePathname();
  return pathname === "/" ? <DepthRoom /> : <OrbitField />;
}
