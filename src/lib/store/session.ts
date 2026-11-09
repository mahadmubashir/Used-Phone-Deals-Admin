"use client";

import { create } from "zustand";
import * as api from "@/lib/auth/admin-api";
import type { StaffUser } from "@/lib/auth/admin-api";

interface State {
  user: StaffUser | null;
  ready: boolean;
  hydrate: () => Promise<void>;
  setUser: (u: StaffUser | null) => void;
  signOut: () => Promise<void>;
}

/** Staff session, resolved from /auth/me so it survives a reload. */
export const useSession = create<State>()((set) => ({
  user: null,
  ready: false,
  hydrate: async () => set({ user: await api.me(), ready: true }),
  setUser: (user) => set({ user }),
  signOut: async () => {
    await api.logout();
    set({ user: null });
  },
}));
