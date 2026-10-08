"use client";

import { RedocStandalone } from "redoc";

export default function RedocView({ specUrl }: { specUrl: string }) {
  return <RedocStandalone specUrl={specUrl} />;
}
