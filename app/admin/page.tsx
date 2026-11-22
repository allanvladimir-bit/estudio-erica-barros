
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

type Appointment = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  clients: { name: string; phone: string } | null;
  services: { name: string; price: number } | null;
};

function dateInBrazil(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function todayInBrazil() {
  return dateInBrazil(new Date().toISOString());
}

function shiftDate(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function money(value: number) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function AdminPage() {
  const [view, setView] = useState("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dateFilter, setDateFilter] = useState("today");
  const [customDate, setCustomDate] = useState(todayInBrazil());
  const [statusFilter, setStatusFilter] = useState("all");
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
      setMessage("Erro ao carregar agendamentos: " + error.message);
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

  async function login(event: FormEvent) {
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
    const question =
      status === "confirmed"
        ? "Deseja confirmar este agendamento?"
        : "Deseja cancelar este agendamento?";

    if (!window.confirm(question)) return;

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

  const today = todayInBrazil();

  const dateAppointments = appointments
    .filter((item) => {
      const appointmentDate = dateInBrazil(item.start_at);

      if (dateFilter === "today") return appointmentDate === today;

      if (dateFilter === "tomorrow") {
        return appointmentDate === shiftDate(today, 1);
      }

      if (dateFilter === "custom") {
        return appointmentDate === customDate;
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(a.start_at).getTime() -
        new Date(b.start_at).getTime()
    );

  const filteredAppointments = dateAppointments.filter((item) => {
    if (statusFilter === "all") return true;
    return item.status === statusFilter;
  });

  const pendingCount = dateAppointments.filter(
    (item) => item.status === "pending"
  ).length;

  const confirmedAppointments = dateAppointments.filter(
    (item) => item.status === "confirmed"
  );

  const confirmedCount = confirmedAppointments.length;

  const confirmedRevenue = confirmedAppointments.reduce(
    (total, item) => total + Number(item.services?.price || 0),
    0
  );

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e8e1d5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  };

  const buttonStyle: React.CSSProperties = {
    padding: "11px 14px",
    borderRadius: 8,
    border: "1px solid #244C3B",
    fontWeight: "bold",
    cursor: "pointer",
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

      <h2 style={{ marginTop: 28 }}>Agenda</h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        {[
          ["today", "Hoje"],
          ["tomorrow", "Amanhã"],
          ["all", "Todos os dias"],
          ["custom", "Escolher data"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setDateFilter(value)}
            style={{
              ...buttonStyle,
              background: dateFilter === value ? "#244C3B" : "#fff",
              color: dateFilter === value ? "#fff" : "#244C3B",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {dateFilter === "custom" && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <label>
            <strong>Escolha o dia:</strong>
          </label>
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: 13,
              marginTop: 10,
              border: "1px solid #ddd",
              borderRadius: 8,
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      <h2>Resumo financeiro e atendimentos</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        <div style={cardStyle}>
          <p style={{ margin: 0 }}>Pendentes</p>
          <h2 style={{ color: "#B7791F" }}>{pendingCount}</h2>
        </div>

        <div style={cardStyle}>
          <p style={{ margin: 0 }}>Confirmados</p>
          <h2 style={{ color: "#244C3B" }}>{confirmedCount}</h2>
        </div>

        <div style={cardStyle}>
          <p style={{ margin: 0 }}>Faturamento confirmado</p>
          <h2 style={{ color: "#244C3B", fontSize: 21 }}>
            {money(confirmedRevenue)}
          </h2>
        </div>
      </div>

      <p style={{ color: "#777", fontSize: 13 }}>
        Os números acima consideram o período selecionado e os valores
        cadastrados nos serviços.
      </p>

      <h2 style={{ marginTop: 28 }}>Agendamentos</h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        {[
          ["all", "Todos"],
          ["pending", "Pendentes"],
          ["confirmed", "Confirmados"],
          ["cancelled", "Cancelados"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            style={{
              ...buttonStyle,
              background: statusFilter === value ? "#244C3B" : "#fff",
              color: statusFilter === value ? "#fff" : "#244C3B",
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
          Nenhum agendamento encontrado neste período.
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
                  ...buttonStyle,
                  background: "#244C3B",
                  color: "#fff",
                }}
              >
                CONFIRMAR
              </button>

              <button
                disabled={busyId === item.id}
                onClick={() => changeStatus(item.id, "cancelled")}
                style={{
                  ...buttonStyle,
                  background: "#A33B32",
                  color: "#fff",
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
