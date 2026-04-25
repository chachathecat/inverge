"use client";

import { useEffect } from "react";

import { logInvergeEvent } from "@/lib/inverge/event-client";
import type { InvergeEventName, InvergeEventPayload } from "@/lib/inverge/events";

export function EventOnView({ eventName, payload }: { eventName: InvergeEventName; payload?: InvergeEventPayload }) {
  useEffect(() => {
    logInvergeEvent(eventName, payload);
  }, [eventName, payload]);

  return null;
}
