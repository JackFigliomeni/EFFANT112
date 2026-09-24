"use client";

import { useEffect } from "react";

// Catches an error thrown in the root layout itself (outside error.tsx's
// reach, since error.tsx only covers what the layout renders) — replaces
// the whole document, so it can't rely on the layout's own CSS/chrome.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f3f2ee", color: "#16181c" }}>
        <div style={{ maxWidth: "28rem", margin: "6rem auto", textAlign: "center", padding: "0 1rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong.</h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#6b6d72" }}>
            That&rsquo;s on us, not you. Try again, or come back in a moment.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "2rem",
              padding: "0.75rem 2rem",
              borderRadius: "9999px",
              background: "#16181c",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
