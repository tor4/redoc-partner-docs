"use client";

import { useMemo } from "react";
import { RedocStandalone } from "redoc";

interface Props {
  spec: object;
  options?: Record<string, unknown>;
  theme?: Record<string, unknown>;
}

export default function RedocView({ spec, options, theme }: Props) {
  const merged = useMemo(() => {
    const base = (options?.theme ?? {}) as Record<string, unknown>;

    return { ...options, theme: { ...base, ...theme } };
  }, [options, theme]);

  return <RedocStandalone spec={spec} options={merged} />;
}
