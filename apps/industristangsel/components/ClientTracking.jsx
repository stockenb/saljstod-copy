// components/ClientTracking.jsx
"use client";
import { usePageTracking } from "../app/usePageTracking";

export default function ClientTracking() {
  // inget SSR-känsligt här – bara hooken
  usePageTracking();
  return null;
}
