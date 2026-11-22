
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Appointment = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  clients: { name: string; phone: string } | null;
  services: { name: string; price: number } | null;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));

const money = (value: number) =>
  Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function AdminPage() {
  const [view, setView] = useState("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function loadAppointments() {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        start_at,
        end_at,
        status,
        clients ( name, phone ),
        services ( name, price )
      `)
      .order("start_at", { ascending: true });

    if (error) {
      setMessage("Não foi possível carregar os agendamentos: " + error.message);
      return;
    }

    setAppointments((data || []) as unknown as Appointment[]);
  }

  async function checkAccess() {
    setView("loading");

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      setView("login");
      return;
    }

    const { data, error } = await supabase.rpc("is_salon_admin");

    if (error || data !== true) {
      setView("denied");
      return;
    }

    setView("dashboard");
    await loadAppointments();
  }

  useEffect(() => {
    checkAccess();
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("E-mail ou senha incorretos.");
      setBusy(false);
      return;
    }

    await checkAccess();
    setBusy(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setAppointments([]);
    setPassword("");
    setView("login");
    setMessage("");
  }

  async function changeStatus(id: string, status: string) {
    const confirmText =
      status === "confirmed"
        ? "Deseja confirmar este agendamento?"
        : "Deseja cancelar este agendamento?";

    if (!window.confirm(confirmText)) return;

    setBusyId(id);
    setMessage("");

    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      setMessage("Erro ao atualizar: " + error.message);
    } else {
      setMessage("Agendamento atualizado com sucesso!");
      await loadAppointments();
    }

    setBusyId("");
  }

  const filteredAppointments = appointments.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const pendingCount = appointments.filter(
    (item) => item.status === "pending"
  ).length;

  const confirmedCount = appointments.filter(
    (item) => item.status === "confirmed"
  ).length;

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e8e1d5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  };

  if (view === "loading") {
    return (
      <main style={{ padding: 40, textAlign: "center" }}>
        Carregando painel...
      </main>
    );
  }

  if (view === "login") {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#F2E9D8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <form
          onSubmit={login}
          style={{
            background: "#fff",
            padding: 28,
            borderRadius: 16,
            width: "100%",
            maxWidth: 390,
            boxShadow: "0 8px 30px #00000012",
          }}
        >
          <h1 style={{ color: "#244C3B", textAlign: "center" }}>
            Estúdio Erica Barros
          </h1>

          <p style={{ textAlign: "center", color: "#777" }}>
            Painel administrativo
          </p>

          <label>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 13,
              margin: "8px 0 18px",
              border: "1px solid #ddd",
              borderRadius: 8,
              boxSizing: "border-box",
            }}
          />

          <label>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 13,
              margin: "8px 0 18px",
              border: "1px solid #ddd",
              borderRadius: 8,
              boxSizing: "border-box",
            }}
          />

          {message && (
            <p style={{ color: "#b42318" }}>{message}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              padding: 15,
              background: "#244C3B",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {busy ? "ENTRANDO..." : "ENTRAR"}
          </button>
        </form>
      </main>
    );
  }

  if (view === "denied") {
    return (
      <main style={{ padding: 30, textAlign: "center" }}>
        <h2>Acesso não autorizado</h2>
        <p>Esta conta não possui permissão de administradora.</p>
        <button onClick={logout}>Sair</button>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F7F4ED",
        padding: 18,
        fontFamily: "Arial, sans-serif",
        color: "#26382E",
      }}
    >
      <header
        style={{
          background: "#244C3B",
          color: "#fff",
          padding: 20,
          borderRadius: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Estúdio Erica Barros</h2>
          <p style={{ margin: "6px 0 0", color: "#E6D6B5" }}>
            Painel administrativo
          </p>
        </div>

        <button
          onClick={logout}
          style={{
            background: "#C5A45B",
            color: "#17382B",
            border: 0,
            padding: "10px 15px",
            borderRadius: 7,
            fontWeight: "bold",
          }}
        >
          SAIR
        </button>
      </header>

      <h2 style={{ marginTop: 28 }}>Visão geral</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 12,
        }}
      >
        <div style={cardStyle}>
          <p>Solicitações</p>
          <h2>{pendingCount}</h2>
        </div>

        <div style={cardStyle}>
          <p>Confirmados</p>
          <h2>{confirmedCount}</h2>
        </div>

        <div style={cardStyle}>
          <p>Total na agenda</p>
          <h2>{appointments.length}</h2>
        </div>
      </div>

      <h2 style={{ marginTop: 28 }}>Agendamentos</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {[
          ["all", "Todos"],
          ["pending", "Pendentes"],
          ["confirmed", "Confirmados"],
          ["cancelled", "Cancelados"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            style={{
              padding: "10px 13px",
              borderRadius: 20,
              border: "1px solid #244C3B",
              background: filter === value ? "#244C3B" : "#fff",
              color: filter === value ? "#fff" : "#244C3B",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {message && (
        <p style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
          {message}
        </p>
      )}

      {filteredAppointments.length === 0 && (
        <div style={cardStyle}>
          Nenhum agendamento encontrado nesta categoria.
        </div>
      )}

      {filteredAppointments.map((item) => (
        <article key={item.id} style={cardStyle}>
          <h3 style={{ color: "#244C3B", marginTop: 0 }}>
            {item.clients?.name || "Cliente"}
          </h3>

          <p>
            <strong>Telefone:</strong>{" "}
            {item.clients?.phone || "Não informado"}
          </p>

          <p>
            <strong>Serviço:</strong>{" "}
            {item.services?.name || "Serviço"}
          </p>

          <p>
            <strong>Valor:</strong>{" "}
            {item.services?.price != null
              ? money(item.services.price)
              : "Não informado"}
          </p>

          <p>
            <strong>Data e horário:</strong> {formatDate(item.start_at)}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            {item.status === "pending"
              ? "Aguardando confirmação"
              : item.status === "confirmed"
              ? "Confirmado"
              : item.status === "cancelled"
              ? "Cancelado"
              : item.status}
          </p>

          {item.status === "pending" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                disabled={busyId === item.id}
                onClick={() => changeStatus(item.id, "confirmed")}
                style={{
                  padding: 11,
                  background: "#244C3B",
                  color: "#fff",
                  border: 0,
                  borderRadius: 7,
                }}
              >
                CONFIRMAR
              </button>

              <button
                disabled={busyId === item.id}
                onClick={() => changeStatus(item.id, "cancelled")}
                style={{
                  padding: 11,
                  background: "#A33B32",
                  color: "#fff",
                  border: 0,
                  borderRadius: 7,
                }}
              >
                CANCELAR
              </button>
            </div>
          )}
        </article>
      ))}

      <button
        onClick={loadAppointments}
        style={{
          width: "100%",
          padding: 14,
          background: "#C5A45B",
          color: "#17382B",
          border: 0,
          borderRadius: 8,
          fontWeight: "bold",
          marginTop: 10,
        }}
      >
        ATUALIZAR AGENDAMENTOS
      </button>
    </main>
  );
          }
