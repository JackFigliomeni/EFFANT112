"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    // A full navigation, not router.push()+refresh(): the equivalent
    // combo on the sign-in path proved unreliable in testing (Next's
    // client-side router cache could still reuse the layout's previous
    // auth-state render). Sign-out is rare enough that a full page load
    // costs nothing noticeable, and it's simply reliable.
    window.location.href = "/";
  }

  return (
    <Button variant="quiet" size="sm" onClick={signOut}>
      Sign out
    </Button>
  );
}
