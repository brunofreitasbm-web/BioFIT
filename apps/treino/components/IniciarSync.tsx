"use client";

import { useEffect } from "react";
import { iniciarSync } from "@/lib/sync";

export function IniciarSync() {
  useEffect(() => iniciarSync(), []);
  return null;
}
