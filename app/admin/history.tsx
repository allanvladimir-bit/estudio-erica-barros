
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type HistoryAppointment = {
  id: string;
  client_id: string;
  start_at: string;
  end_at: string;
  status: string;
  price_at_booking: number | null;
  clients: { name: string; phone: string } | null;
  services: { name: string; price: number } | null;
};

function money(value: number) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  if (status === "pending") return "Pendente";
  if (status === "confirmed") return "Confirmado";
  if (status === "completed") return "Concluído";
  if (status === "cancelled") return "Cancelado";
  return status;
}

export default function ClientHistory() {
  const [appointments, setAppointments] = useState<HistoryAppointment[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadHistory() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        client_id,
        start_at,
        end_at,
        status,
        price_at_booking,
        clients ( name, phone ),
        services ( name, price )
      `)
      .order("start_at", { ascending: false });

    if (error) {
      setErrorMessage("Não foi possível carregar o histórico: " + error.message);
      setLoading(false);
      return;
    }

    setAppointments((data || []) as unknown as HistoryAppointment[]);
    setLoading(false);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const clients = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string }>();

    appointments.forEach((item) => {
      if (!item.client_id) return;

      const name = item.clients?.name || "Cliente sem nome";
      const phone = item.clients?.phone || "";

      if (!map.has(item.client_id)) {
        map.set(item.client_id, {
          id: item.client_id,
          name,
          phone,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR")
    );
  }, [appointments]);

  const matchingClients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return clients;

    return clients.filter((client) =>
      `${client.name} ${client.phone}`.toLocaleLowerCase("pt-BR").includes(term)
    );
  }, [clients, search]);

  const selectedClient = clients.find(
    (client) => client.id === selectedClientId
  );

  const clientAppointments = appointments
    .filter((item) => item.client_id === selectedClientId)
    .sort(
      (a, b) =>
        new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
    );

  const completedTotal = clientAppointments
    .filter((item) => item.status === "completed")
    .reduce(
      (total, item) =>
        total + Number(item.price_at_booking ?? item.services?.price ?? 0),
      0
    );

  const completedCount = clientAppointments.filter(
    (item) => item.status === "completed"
  ).length;

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e8e1d5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  } as const;

  const buttonStyle = {
    padding: "10px 13px",
    borderRadius: 8,
    border: "1px solid #244C3B",
    fontWeight: "bold",
    cursor: "pointer",
  } as const;

  const inputStyle = {
    width: "100%",
    padding: 12,
    marginTop: 7,
    marginBottom: 14,
    border: "1px solid #ddd",
    borderRadius: 8,
    boxSizing: "border-box" as const,
    background: "#fff",
  };

  return (
    <section style={{ marginTop: 30 }}>
      <h2 style={{ color: "#244C3B" }}>Histórico de clientes</h2>
      <p style={{ color: "#777", fontSize: 14 }}>
        Pesquise pelo nome ou telefone para consultar os atendimentos e os
        valores registrados para cada cliente.
      </p>

      <div style={cardStyle}>
        <label htmlFor="client-history-search">
          <strong>Buscar cliente</strong>
        </label>
        <input
          id="client-history-search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setSelectedClientId("");
          }}
          placeholder="Digite o nome ou telefone"
          style={inputStyle}
        />

        {loading ? (
          <p>Carregando histórico...</p>
        ) : errorMessage ? (
          <p style={{ color: "#A33B32" }}>{errorMessage}</p>
        ) : matchingClients.length === 0 ? (
          <p style={{ color: "#777" }}>
            Nenhum cliente encontrado. Os clientes aparecem aqui depois que
            possuem pelo menos um agendamento.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {matchingClients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedClientId(client.id)}
                style={{
                  ...buttonStyle,
                  textAlign: "left",
                  background:
                    selectedClientId === client.id ? "#244C3B" : "#fff",
                  color: selectedClientId === client.id ? "#fff" : "#244C3B",
                }}
              >
                {client.name}
                {client.phone ? ` • ${client.phone}` : ""}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={loadHistory}
          disabled={loading}
          style={{
            ...buttonStyle,
            marginTop: 14,
            background: "#C5A45B",
            color: "#17382B",
            borderColor: "#C5A45B",
          }}
        >
          {loading ? "ATUALIZANDO..." : "ATUALIZAR HISTÓRICO"}
        </button>
      </div>

      {selectedClient && (
        <>
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "#244C3B" }}>
              {selectedClient.name}
            </h3>
            <p style={{ marginBottom: 8 }}>
              <strong>Telefone:</strong>{" "}
              {selectedClient.phone || "Não informado"}
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>Atendimentos concluídos:</strong> {completedCount}
            </p>
            <p style={{ marginBottom: 0 }}>
              <strong>Total gasto em atendimentos concluídos:</strong>{" "}
              {money(completedTotal)}
            </p>
          </div>

          <h3 style={{ color: "#244C3B" }}>Atendimentos anteriores</h3>

          {clientAppointments.length === 0 ? (
            <div style={cardStyle}>Nenhum atendimento encontrado.</div>
          ) : (
            clientAppointments.map((item) => {
              const price =
                item.price_at_booking ?? item.services?.price ?? null;

              return (
                <article key={item.id} style={cardStyle}>
                  <p style={{ marginTop: 0 }}>
                    <strong>Data:</strong> {formatDate(item.start_at)}
                  </p>
                  <p>
                    <strong>Serviço:</strong>{" "}
                    {item.services?.name || "Serviço não informado"}
                  </p>
                  <p>
                    <strong>Valor registrado:</strong>{" "}
                    {price != null ? money(Number(price)) : "Não informado"}
                  </p>
                  <p style={{ marginBottom: 0 }}>
                    <strong>Status:</strong> {statusLabel(item.status)}
                  </p>
                </article>
              );
            })
          )}
        </>
      )}
    </section>
  );
}
