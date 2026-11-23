

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type AppointmentRow = {
  id: string;
  start_at: string;
  status: string;
  price_at_booking: number | null;
  services:
    | { name: string }
    | { name: string }[]
    | null;
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

function serviceName(
  service: AppointmentRow["services"]
) {
  if (Array.isArray(service)) {
    return service[0]?.name || "Serviço";
  }

  return service?.name || "Serviço";
}

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function FinanceReport() {
  const [month, setMonth] = useState(currentMonth);
  const [appointments, setAppointments] = useState<
    AppointmentRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError("");

      const [year, monthNumber] = month
        .split("-")
        .map(Number);

      const nextMonthDate = new Date(
        Date.UTC(year, monthNumber, 1)
      );

      const nextMonth = nextMonthDate
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, start_at, status, price_at_booking, services(name)"
        )
        .gte(
          "start_at",
          `${month}-01T00:00:00-03:00`
        )
        .lt(
          "start_at",
          `${nextMonth}T00:00:00-03:00`
        )
        .order("start_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        setError("Não foi possível carregar o relatório.");
        setAppointments([]);
      } else {
        setAppointments(
          (data || []) as AppointmentRow[]
        );
      }

      setLoading(false);
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [month, refresh]);

  const completed = useMemo(
    () =>
      appointments.filter(
        (item) => item.status === "completed"
      ),
    [appointments]
  );

  const pending = appointments.filter(
    (item) => item.status === "pending"
  ).length;

  const revenue = completed.reduce(
    (total, item) =>
      total + Number(item.price_at_booking ?? 0),
    0
  );

  const average =
    completed.length > 0
      ? revenue / completed.length
      : 0;

  const weeklyRevenue = useMemo(() => {
    const weeks = [
      { label: "1–7", value: 0 },
      { label: "8–14", value: 0 },
      { label: "15–21", value: 0 },
      { label: "22–28", value: 0 },
      { label: "29–31", value: 0 },
    ];

    completed.forEach((item) => {
      const date = new Date(item.start_at);

      const parts = new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "America/Sao_Paulo",
          day: "2-digit",
        }
      ).format(date);

      const day = Number(parts);
      const index = Math.min(
        Math.floor((day - 1) / 7),
        4
      );

      weeks[index].value += Number(
        item.price_at_booking ?? 0
      );
    });

    return weeks;
  }, [completed]);

  const topServices = useMemo(() => {
    const ranking: Record<string, number> = {};

    completed.forEach((item) => {
      const name = serviceName(item.services);
      ranking[name] = (ranking[name] || 0) + 1;
    });

    return Object.entries(ranking)
      .map(([name, quantity]) => ({
        name,
        quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [completed]);

  const maxRevenue = Math.max(
    ...weeklyRevenue.map((week) => week.value),
    1
  );

  const monthLabel = new Date(
    `${month}-01T12:00:00`
  ).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const cardStyle = {
    background: "#FBF8F1",
    border: "1px solid #E7E0D2",
    borderRadius: 14,
    padding: 16,
  } as const;

  return (
    <section
      style={{
        marginTop: 28,
        marginBottom: 32,
        padding: 20,
        background: "#FFFFFF",
        border: "1px solid #E7E0D2",
        borderRadius: 18,
        color: "#26382E",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#244C3B",
              fontSize: 23,
            }}
          >
            Painel Financeiro
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              color: "#777",
              fontSize: 13,
            }}
          >
            Resumo financeiro do estúdio
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefresh((value) => value + 1)}
          style={{
            background: "#244C3B",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 9,
            padding: "10px 14px",
            cursor: "pointer",
          }}
        >
          ↻ Atualizar
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
          padding: 14,
          background: "#F2E9D8",
          borderRadius: 12,
        }}
      >
        <strong style={{ color: "#244C3B" }}>
          Relatório mensal
        </strong>

        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          style={{
            padding: 9,
            borderRadius: 8,
            border: "1px solid #C5A45B",
            background: "#FFFFFF",
            color: "#26382E",
          }}
        />
      </div>

      {loading ? (
        <p style={{ textAlign: "center", padding: 30 }}>
          Carregando relatório...
        </p>
      ) : error ? (
        <p style={{ color: "#B42318" }}>{error}</p>
      ) : (
        <>
          <p
            style={{
              color: "#777",
              textTransform: "capitalize",
              marginBottom: 14,
            }}
          >
            Resultado de {monthLabel}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(145px, 1fr))",
              gap: 12,
            }}
          >
            <div style={cardStyle}>
              <div style={{ color: "#777", fontSize: 12 }}>
                Faturamento recebido
              </div>
              <strong
                style={{
                  display: "block",
                  color: "#244C3B",
                  fontSize: 23,
                  marginTop: 8,
                }}
              >
                {money(revenue)}
              </strong>
            </div>

            <div style={cardStyle}>
              <div style={{ color: "#777", fontSize: 12 }}>
                Atendimentos concluídos
              </div>
              <strong
                style={{
                  display: "block",
                  color: "#244C3B",
                  fontSize: 23,
                  marginTop: 8,
                }}
              >
                {completed.length}
              </strong>
            </div>

            <div style={cardStyle}>
              <div style={{ color: "#777", fontSize: 12 }}>
                Ticket médio
              </div>
              <strong
                style={{
                  display: "block",
                  color: "#244C3B",
                  fontSize: 23,
                  marginTop: 8,
                }}
              >
                {money(average)}
              </strong>
            </div>

            <div style={cardStyle}>
              <div style={{ color: "#777", fontSize: 12 }}>
                Agendamentos pendentes
              </div>
              <strong
                style={{
                  display: "block",
                  color: "#C5A45B",
                  fontSize: 23,
                  marginTop: 8,
                }}
              >
                {pending}
              </strong>
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              marginTop: 18,
            }}
          >
            <h3 style={{ marginTop: 0, color: "#244C3B" }}>
              Faturamento por semana
            </h3>

            <div
              style={{
                display: "flex",
                alignItems: "end",
                gap: 12,
                height: 155,
                paddingTop: 12,
              }}
            >
              {weeklyRevenue.map((week) => (
                <div
                  key={week.label}
                  style={{
                    flex: 1,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "end",
                    alignItems: "center",
                    gap: 7,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "#777",
                      textAlign: "center",
                    }}
                  >
                    {money(week.value)}
                  </span>

                  <div
                    style={{
                      width: "100%",
                      height: `${
                        (week.value / maxRevenue) * 100
                      }%`,
                      minHeight: week.value > 0 ? 5 : 0,
                      background: "#244C3B",
                      borderRadius: "7px 7px 2px 2px",
                    }}
                  />

                  <span style={{ fontSize: 11, color: "#777" }}>
                    {week.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              marginTop: 18,
            }}
          >
            <h3 style={{ marginTop: 0, color: "#244C3B" }}>
              Serviços mais realizados
            </h3>

            {topServices.length === 0 ? (
              <p style={{ color: "#777", fontSize: 13 }}>
                Ainda não existem atendimentos concluídos neste mês.
              </p>
            ) : (
              topServices.map((service, index) => (
                <div
                  key={service.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 0",
                    borderBottom:
                      index === topServices.length - 1
                        ? "none"
                        : "1px solid #E7E0D2",
                  }}
                >
                  <span>
                    <strong style={{ color: "#C5A45B" }}>
                      {index + 1}º
                    </strong>{" "}
                    {service.name}
                  </span>

                  <strong style={{ color: "#244C3B" }}>
                    {service.quantity} vezes
                  </strong>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
