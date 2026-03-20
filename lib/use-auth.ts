"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "user";

export interface AuthState {
  user: User | null;
  role: UserRole;
  isAdmin: boolean;
  name: string;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [name, setName] = useState("Säljare");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, name")
          .eq("id", user.id)
          .single();

        if (profile) {
          setRole((profile.role as UserRole) || "user");
          setName(profile.name || user.email || "Säljare");
        } else {
          // Fallback: hämta roll från allowed_emails om profiles-läsning misslyckas
          if (profileError) console.warn("profiles read error:", profileError.message);
          const { data: allowed } = await supabase
            .from("allowed_emails")
            .select("role")
            .eq("email", user.email!.toLowerCase())
            .single();
          if (allowed?.role) {
            setRole((allowed.role as UserRole) || "user");
          }
          setName(user.email || "Säljare");
        }
      }

      setLoading(false);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    role,
    isAdmin: role === "admin",
    name,
    loading,
  };
}
