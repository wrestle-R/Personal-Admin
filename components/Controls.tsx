"use client";
import { LogOut } from "lucide-react";
export function Logout() {
  return (
    <button
      className="logout"
      onClick={async () => {
        const response = await fetch("/api/auth", { method: "DELETE" });
        if (response.ok) location.assign("/login");
      }}
    >
      <LogOut size={15} /> Sign out
    </button>
  );
}
