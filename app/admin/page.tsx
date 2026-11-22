
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type CSSProperties,
} from "react";
import { supabase } from "../../lib/supabase";

type Appointment = {
  id: string;
  client_id: string;
  service_id: string;
  start_at: string;
  end_at: string;
  status: string;
  clients: { name: string; phone: string } | null;
  services: { name: string; price: number } | null;
};

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
};

type EditForm = {
  id: string;
  name: string;
  phone: string;
  serviceId: string;
  date: string;
  time: string;
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

function startOfWeek(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const difference = weekday === 0 ? -6 : 1 - weekday;

  return shiftDate(value, difference);
}

function dayTitle(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${value}T12:00:00-03:00`));
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

function getBrazilTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  if (status === "pending") return "Aguardando confirmação";
  if (status === "confirmed") return "Confirmado";
  if (status === "completed") return "Concluído";
  if (status === "cancelled") return "Cancelado";
  return status;
}

function statusColor(status: string) {
  if (status === "pending") return "#B7791F";
  if (status === "confirmed") return "#244C3B";
  if (status === "completed") return "#39834B";
  if (status === "cancelled") return "#A33B32";
  return "#777";
}

export default function AdminPage() {
  const [view, setView] = useState("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [dateFilter, setDateFilter] = useState("today");
  const [customDate, setCustomDate] = useState(todayInBrazil());
  const [statusFilter, setStatusFilter] = useState("all");

  const [agendaMode, setAgendaMode] = useState("day");
  const [agendaDate, setAgendaDate] = useState(todayInBrazil());

  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<EditForm | null>(null);

  async function loadAppointments() {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        client_id,
        service_id,
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

  async function loadServices() {
    const { data, error } = await supabase
      .from("services")
      .select("id, name, duration_minutes")
      .order("name");

    if (error) {
      setMessage("Erro ao carregar serviços: " + error.message);
      return;
    }

    setServices(data || []);
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
    await Promise.all([loadAppointments(), loadServices()]);
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
    setEditing(null);
    setView("login");
    setMessage("");
  }

  async function changeStatus(id: string, status: string) {
    const questions: Record<string, string> = {
      confirmed: "Deseja confirmar este agendamento?",
      cancelled: "Deseja cancelar este agendamento?",
      completed: "Confirmar que este atendimento foi realizado?",
    };

    if (!window.confirm(questions[status] || "Deseja alterar o status?")) {
      return;
    }

    setBusyId(id);
    setMessage("");

    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      setMessage("Erro ao atualizar: " + error.message);
    } else {
      setMessage(
        status === "completed"
          ? "Atendimento marcado como concluído!"
          : "Agendamento atualizado com sucesso!"
      );
      await loadAppointments();
    }

    setBusyId("");
  }

  function startEditing(item: Appointment) {
    setEditing({
      id: item.id,
      name: item.clients?.name || "",
      phone: item.clients?.phone || "",
      serviceId: item.service_id,
      date: dateInBrazil(item.start_at),
      time: getBrazilTime(item.start_at),
    });

    setMessage("");
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();

    if (!editing) return;

    if (!editing.name.trim() || !editing.phone.trim()) {
      setMessage("Preencha o nome e o telefone da cliente.");
      return;
    }

    if (!editing.date || !editing.time) {
      setMessage("Escolha a data e o horário.");
      return;
    }

    const selectedService = services.find(
      (service) => service.id === editing.serviceId
    );

    if (!selectedService) {
      setMessage("Selecione um serviço válido.");
      return;
    }

    const startAt = new Date(
      `${editing.date}T${editing.time}:00-03:00`
    );

    if (Number.isNaN(startAt.getTime())) {
      setMessage("Data ou horário inválido.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.rpc(
      "admin_edit_appointment",
      {
        p_appointment_id: editing.id,
        p_client_name: editing.name.trim(),
        p_client_phone: editing.phone.trim(),
        p_service_id: editing.serviceId,
        p_start_at: startAt.toISOString(),
      }
    );

    if (error) {
      setMessage("Erro ao editar: " + error.message);
      setBusy(false);
      return;
    }

    if (!data?.success) {
      setMessage(data?.message || "Não foi possível editar o agendamento.");
      setBusy(false);
      return;
    }

    setEditing(null);
    setMessage("Agendamento editado com sucesso!");
    await loadAppointments();
    setBusy(false);
  }

  async function deleteAppointment(id: string) {
    const confirmed = window.confirm(
      "ATENÇÃO: deseja realmente excluir este agendamento? Esta ação não poderá ser desfeita."
    );

    if (!confirmed) return;

    setBusyId(id);
    setMessage("");

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("Erro ao excluir: " + error.message);
    } else {
      setMessage("Agendamento excluído com sucesso!");
      if (editing?.id === id) setEditing(null);
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

  const confirmedCount = dateAppointments.filter(
    (item) => item.status === "confirmed"
  ).length;

  const completedAppointments = dateAppointments.filter(
    (item) => item.status === "completed"
  );

  const completedCount = completedAppointments.length;

  const completedRevenue = completedAppointments.reduce(
    (total, item) => total + Number(item.services?.price || 0),
    0
  );

  const agendaStart = startOfWeek(agendaDate);

  const agendaDays =
    agendaMode === "day"
      ? [agendaDate]
      : Array.from({ length: 6 }, (_, index) =>
          shiftDate(agendaStart, index)
        );

  const cardStyle: CSSProperties = {
    background: "#fff",
    border: "1px solid #e8e1d5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  };

  const buttonStyle: CSSProperties = {
    padding: "11px 14px",
    borderRadius: 8,
    border: "1px solid #244C3B",
    fontWeight: "bold",
    cursor: "pointer",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: 12,
    marginTop: 7,
    marginBottom: 14,
    border: "1px solid #ddd",
    borderRadius: 8,
    boxSizing: "border-box",
    background: "#fff",
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
            style={inputStyle}
          />

          <label>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />

          {message && <p style={{ color: "#b42318" }}>{message}</p>}

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

      {/* AGENDA VISUAL DIÁRIA E SEMANAL */}
      <section
        style={{
          ...cardStyle,
          border: "1px solid #C5A45B",
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <button
            onClick={() => setAgendaMode("day")}
            style={{
              ...buttonStyle,
              background: agendaMode === "day" ? "#244C3B" : "#fff",
              color: agendaMode === "day" ? "#fff" : "#244C3B",
            }}
          >
            VISÃO DIÁRIA
          </button>

          <button
            onClick={() => setAgendaMode("week")}
            style={{
              ...buttonStyle,
              background: agendaMode === "week" ? "#244C3B" : "#fff",
              color: agendaMode === "week" ? "#fff" : "#244C3B",
            }}
          >
            VISÃO SEMANAL
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <button
            onClick={() =>
              setAgendaDate(
                shiftDate(agendaDate, agendaMode === "day" ? -1 : -7)
              )
            }
            style={buttonStyle}
          >
            ← Anterior
          </button>

          <button
            onClick={() => setAgendaDate(today)}
            style={{
              ...buttonStyle,
              background: "#C5A45B",
              color: "#17382B",
            }}
          >
            HOJE
          </button>

          <button
            onClick={() =>
              setAgendaDate(
                shiftDate(agendaDate, agendaMode === "day" ? 1 : 7)
              )
            }
            style={buttonStyle}
          >
            Próximo →
          </button>
        </div>

        {agendaMode === "day" && (
          <h3
            style={{
              color: "#244C3B",
              textTransform: "capitalize",
            }}
          >
            {dayTitle(agendaDate)}
          </h3>
        )}

        {agendaMode === "week" && (
          <h3 style={{ color: "#244C3B" }}>
            Semana de {dayTitle(agendaDays[0])}
          </h3>
        )}

        {agendaDays.map((day) => {
          const dayItems = appointments
            .filter((item) => dateInBrazil(item.start_at) === day)
            .sort(
              (a, b) =>
                new Date(a.start_at).getTime() -
                new Date(b.start_at).getTime()
            );

          return (
            <div
              key={day}
              style={{
                borderTop: "1px solid #e8e1d5",
                paddingTop: 12,
                marginTop: 12,
              }}
            >
              <h3
                style={{
                  color: "#244C3B",
                  textTransform: "capitalize",
                  fontSize: 16,
                }}
              >
                {dayTitle(day)}
                {day === today ? " • HOJE" : ""}
              </h3>

              {dayItems.length === 0 ? (
                <p style={{ color: "#888", fontSize: 14 }}>
                  Nenhum atendimento agendado.
                </p>
              ) : (
                dayItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background:
                        item.status === "cancelled"
                          ? "#f5eeee"
                          : item.status === "completed"
                          ? "#edf5ed"
                          : "#F7F4ED",
                      borderLeft: `5px solid ${statusColor(item.status)}`,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <strong style={{ color: "#244C3B" }}>
                        {getBrazilTime(item.start_at)} –{" "}
                        {getBrazilTime(item.end_at)}
                      </strong>

                      <strong
                        style={{
                          fontSize: 12,
                          color: statusColor(item.status),
                        }}
                      >
                        {statusLabel(item.status).toUpperCase()}
                      </strong>
                    </div>

                    <p style={{ margin: "9px 0 4px", fontWeight: "bold" }}>
                      {item.clients?.name || "Cliente"}
                    </p>

                    <p style={{ margin: "4px 0", fontSize: 14 }}>
                      {item.services?.name || "Serviço"}
                    </p>

                    <p style={{ margin: "4px 0", fontSize: 14 }}>
                      {item.services?.price != null
                        ? money(item.services.price)
                        : "Valor não informado"}
                    </p>

                    <button
                      onClick={() => startEditing(item)}
                      style={{
                        ...buttonStyle,
                        marginTop: 8,
                        background: "#C5A45B",
                        color: "#17382B",
                      }}
                    >
                      EDITAR AGENDAMENTO
                    </button>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </section>

      {/* FILTROS ANTIGOS */}
      <h2 style={{ marginTop: 28 }}>Filtrar agendamentos</h2>

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
        <div style={cardStyle}>
          <label>
            <strong>Escolha o dia:</strong>
          </label>
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      {/* RESUMO */}
      <h2>Resumo de atendimentos</h2>

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
          <p style={{ margin: 0 }}>Concluídos</p>
          <h2 style={{ color: "#244C3B" }}>{completedCount}</h2>
        </div>

        <div style={cardStyle}>
          <p style={{ margin: 0 }}>Faturamento realizado</p>
          <h2 style={{ color: "#244C3B", fontSize: 21 }}>
            {money(completedRevenue)}
          </h2>
        </div>
      </div>

      <p style={{ color: "#777", fontSize: 13 }}>
        O faturamento considera somente os agendamentos marcados como
        concluídos e os preços cadastrados nos serviços.
      </p>

      {/* LISTA DE AGENDAMENTOS */}
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
          ["completed", "Concluídos"],
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

      {/* FORMULÁRIO DE EDIÇÃO */}
      {editing && (
        <form
          onSubmit={saveEdit}
          style={{
            ...cardStyle,
            border: "2px solid #C5A45B",
          }}
        >
          <h3 style={{ color: "#244C3B", marginTop: 0 }}>
            Editar agendamento
          </h3>

          <label>Nome da cliente</label>
          <input
            value={editing.name}
            onChange={(e) =>
              setEditing({ ...editing, name: e.target.value })
            }
            required
            style={inputStyle}
          />

          <label>Telefone</label>
          <input
            value={editing.phone}
            onChange={(e) =>
              setEditing({ ...editing, phone: e.target.value })
            }
            required
            style={inputStyle}
          />

          <label>Serviço</label>
          <select
            value={editing.serviceId}
            onChange={(e) =>
              setEditing({ ...editing, serviceId: e.target.value })
            }
            required
            style={inputStyle}
          >
            <option value="">Selecione o serviço</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.duration_minutes} min)
              </option>
            ))}
          </select>

          <label>Data</label>
          <input
            type="date"
            value={editing.date}
            onChange={(e) =>
              setEditing({ ...editing, date: e.target.value })
            }
            required
            style={inputStyle}
          />

          <label>Horário de início</label>
          <input
            type="time"
            value={editing.time}
            onChange={(e) =>
              setEditing({ ...editing, time: e.target.value })
            }
            required
            style={inputStyle}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={busy}
              style={{
                ...buttonStyle,
                background: "#244C3B",
                color: "#fff",
              }}
            >
              {busy ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
            </button>

            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={busy}
              style={{
                ...buttonStyle,
                background: "#fff",
                color: "#244C3B",
              }}
            >
              FECHAR
            </button>
          </div>
        </form>
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
            <strong>Status:</strong> {statusLabel(item.status)}
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {item.status === "pending" && (
              <>
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
              </>
            )}

            {item.status === "confirmed" && (
              <button
                disabled={busyId === item.id}
                onClick={() => changeStatus(item.id, "completed")}
                style={{
                  ...buttonStyle,
                  background: "#244C3B",
                  color: "#fff",
                }}
              >
                CONCLUIR ATENDIMENTO
              </button>
            )}

            {item.status !== "cancelled" && (
              <button
                disabled={busyId === item.id}
                onClick={() => startEditing(item)}
                style={{
                  ...buttonStyle,
                  background: "#C5A45B",
                  color: "#17382B",
                }}
              >
                EDITAR
              </button>
            )}

            <button
              disabled={busyId === item.id}
              onClick={() => deleteAppointment(item.id)}
              style={{
                ...buttonStyle,
                background: "#A33B32",
                color: "#fff",
                borderColor: "#A33B32",
              }}
            >
              EXCLUIR
            </button>
          </div>
        </article>
      ))}

      <button
        onClick={() => {
          loadAppointments();
          loadServices();
        }}
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
