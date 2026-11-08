"use client";

import { useSyncExternalStore } from "react";

/** Status intro dari atribut data-intro di <html>: "play", "skip", "done", atau "none" (skrip head tak jalan). */
export type IntroState = "server" | "play" | "skip" | "done" | "none";

function subscribe(cb: () => void) {
  window.addEventListener("irri-intro-done", cb);
  return () => window.removeEventListener("irri-intro-done", cb);
}

export function useIntroState(): IntroState {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.intro as IntroState | undefined) ?? "none",
    () => "server",
  );
}
