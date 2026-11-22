"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Client = {
  id: string | number;
  full_name?: string;
  name?: string;
  email?: string;
  application_status?: string;
};

const ADMIN_EMAIL = "applynowteam@gmail.com";

export default function AdminPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [access, setAccess] = useState<"checking" | "authorized" | "denied">("checking");

  async function hasAdminAccess() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user.email?.toLowerCase() !== ADMIN_EMAIL) return false;
    const { data, error } = await supabase.rpc("is_applynow_admin");
    return !error && data === true;
  }

  async function loadClients() {
    const { data, error } = await supabase
      .from("application_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      alert(error.message);
      return;
    }
    setClients(data ?? []);
  }

  useEffect(() => {
    let active = true;
    hasAdminAccess().then((allowed) => {
      if (active) setAccess(allowed ? "authorized" : "denied");
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (access === "authorized") loadClients();
  }, [access]);

  async function approve(client: Client) {
    if (!(await hasAdminAccess())) {
      setAccess("denied");
      setClients([]);
      return;
    }
    const { error } = await supabase
      .from("application_requests")
      .update({
        application_status: "approved",
        result_unlocked: true,
        payment_status: "paid",
      })
      .eq("id", client.id);

    if (error) {
      alert(error.message);
      return;
    }
    alert("Client Approved - Can now see results");
    loadClients();
  }

  if (access === "checking") {
    return <p style={{ padding: 20 }}>Checking admin access…</p>;
  }

  if (access === "denied") {
    return (
      <div style={{ padding: 20 }}>
        <h1>Access denied</h1>
        <p>Only {ADMIN_EMAIL} can view the admin dashboard.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>{client.full_name ?? client.name}</td>
              <td>{client.email}</td>
              <td>{client.application_status}</td>
              <td>
                {client.application_status === "approved" ? (
                  <span style={{ color: "green", fontWeight: "bold" }}>
                    ALREADY APPROVED
                  </span>
                ) : (
                  <button onClick={() => approve(client)}>APPROVE</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
