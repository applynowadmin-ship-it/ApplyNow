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

export default function AdminPage() {
  const [clients, setClients] = useState<Client[]>([]);

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
    loadClients();
  }, []);

  async function approve(client: Client) {
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
