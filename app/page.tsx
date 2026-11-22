
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
};

const fieldStyle = {
  width: "100%",
  padding: "14px",
  border: "1px solid #D8D2C5",
  borderRadius: "10px",
  background: "#FFFFFF",
  color: "#244C3B",
  fontSize: "16px",
  boxSizing: "border-box" as const,
};

function todayInBrazil() {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });
}

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] =
    useState<Service | null>(null);

  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadServices() {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price, duration_minutes")
        .eq("active", true)
        .order("name");

      if (error) {
        setError("Não foi possível carregar os serviços.");
      } else {
        setServices(data || []);
      }

      setLoading(false);
    }

    loadServices();
  }, []);

  useEffect(() => {
    if (!selectedService || !date) {
      setSlots([]);
      return;
    }

    let cancelled = false;

    async function loadSlots() {
      setLoadingSlots(true);
      setSlots([]);
      setSelectedSlot("");
      setError("");

      const { data, error } = await supabase.rpc(
        "get_available_slots",
        {
          p_service_id: selectedService.id,
          p_date: date,
        }
      );

      if (cancelled) return;

      if (error) {
        setError("Não foi possível consultar os horários.");
        console.error(error);
      } else {
        setSlots(
          (data || []).map(
            (item: { slot_start: string }) => item.slot_start
          )
        );
      }

      setLoadingSlots(false);
    }

    loadSlots();

    return () => {
      cancelled = true;
    };
  }, [selectedService, date]);

  function formatPrice(price: number, name: string) {
    const value = price.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    return name.toLowerCase().includes("trança")
      ? `A partir de ${value}`
      : value;
  }

  function formatTime(slot: string) {
    return new Date(slot).toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function bookAppointment() {
    if (
      !selectedService ||
      !selectedSlot ||
      !clientName.trim() ||
      !clientPhone.trim()
    ) {
      setError("Preencha seu nome, telefone e escolha um horário.");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    const { data, error } = await supabase.rpc(
      "create_public_appointment",
      {
        p_service_id: selectedService.id,
        p_start_at: new Date(selectedSlot).toISOString(),
        p_client_name: clientName.trim(),
        p_client_phone: clientPhone.trim(),
      }
    );

    if (error) {
      setError(
        "Não foi possível concluir. Atualize os horários e tente novamente."
      );
      console.error(error);
    } else if (data?.success === false) {
      setError(data.message || "Não foi possível realizar o agendamento.");
    } else {
      setSuccess(
        "Solicitação enviada! Seu horário foi registrado. Aguarde a confirmação do Estúdio Erica Barros."
      );
      setSelectedSlot("");
      setClientName("");
      setClientPhone("");
    }

    setSending(false);
  }

  return (
    <main>
      <header className="header">
        <a href="#" className="brand">
          <span className="brand-mark">EB</span>
          <span>
            <strong>ESTÚDIO</strong>
            <small>ERICA BARROS</small>
          </span>
        </a>
        <a href="#agendamento" className="header-link">
          Agendar horário
        </a>
      </header>

      <section className="hero">
        <p className="eyebrow">BELEZA • CUIDADO • ELEGÂNCIA</p>
        <h1>Sua beleza merece<br />um momento especial.</h1>
        <p className="hero-text">
          Um espaço dedicado a realçar sua beleza e cuidar de você
          com carinho.
        </p>
        <a href="#servicos" className="gold-button">
          ESCOLHER MEU SERVIÇO
        </a>
        <div className="hero-decoration">EB</div>
      </section>

      <section className="services" id="servicos">
        <p className="eyebrow">CUIDADOS PARA VOCÊ</p>
        <h2>Nossos serviços</h2>
        <p className="section-text">
          Escolha seu cuidado e reserve seu momento.
        </p>

        <div className="service-grid">
          {loading ? (
            <p>Carregando serviços...</p>
          ) : services.length === 0 ? (
            <p>Nenhum serviço disponível no momento.</p>
          ) : (
            services.map((service) => (
              <article
                className="service-card"
                key={service.id}
                role="button"
                tabIndex={0}
                aria-pressed={selectedService?.id === service.id}
                onClick={() => {
                  setSelectedService(service);
                  setDate("");
                  setSelectedSlot("");
                  setSuccess("");
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedService(service);
                    setDate("");
                    setSelectedSlot("");
                    setSuccess("");
                    setError("");
                  }
                }}
                style={{
                  cursor: "pointer",
                  border: selectedService?.id === service.id
                    ? "2px solid #C5A45B"
                    : undefined,
                  outline: "none",
                }}
              >
                <div>
                  <h3>{service.name}</h3>
                  <p>
                    {service.duration_minutes} minutos • Estúdio Erica Barros
                  </p>
                </div>
                <strong>{formatPrice(service.price, service.name)}</strong>
              </article>
            ))
          )}
        </div>

        {selectedService && (
          <div
            id="agendamento"
            style={{
              marginTop: "35px",
              padding: "24px",
              background: "#FBF8F1",
              border: "1px solid #E5DDCE",
              borderRadius: "16px",
              color: "#244C3B",
            }}
          >
            <p className="eyebrow">RESERVE SEU MOMENTO</p>
            <h2 style={{ marginBottom: "8px" }}>Seu agendamento</h2>
            <p style={{ marginBottom: "22px" }}>
              Serviço escolhido: <strong>{selectedService.name}</strong>
              <br />
              Valor: <strong>
                {formatPrice(selectedService.price, selectedService.name)}
              </strong>
              <br />
              Duração: <strong>{selectedService.duration_minutes} minutos</strong>
            </p>

            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
              Escolha a data
            </label>
            <input
              type="date"
              value={date}
              min={todayInBrazil()}
              onChange={(event) => {
                setDate(event.target.value);
                setSelectedSlot("");
                setSuccess("");
              }}
              style={fieldStyle}
            />

            {date && (
              <div style={{ marginTop: "22px" }}>
                <strong>Horários disponíveis</strong>

                {loadingSlots ? (
                  <p>Consultando horários...</p>
                ) : slots.length === 0 ? (
                  <p style={{ marginTop: "12px" }}>
                    Não há horários disponíveis nesta data. Escolha outro dia.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginTop: "14px",
                    }}
                  >
                    {slots.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          padding: "11px 17px",
                          borderRadius: "9px",
                          border: selectedSlot === slot
                            ? "2px solid #244C3B"
                            : "1px solid #C5A45B",
                          background: selectedSlot === slot
                            ? "#244C3B"
                            : "#FFFFFF",
                          color: selectedSlot === slot
                            ? "#FFFFFF"
                            : "#244C3B",
                          cursor: "pointer",
                          fontSize: "15px",
                        }}
                      >
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedSlot && (
              <div style={{ marginTop: "24px" }}>
                <p style={{ marginBottom: "15px" }}>
                  Horário escolhido: <strong>{formatTime(selectedSlot)}</strong>
                </p>

                <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                  Seu nome
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Digite seu nome completo"
                  style={fieldStyle}
                />

                <label style={{ display: "block", margin: "16px 0 8px", fontWeight: 600 }}>
                  Seu WhatsApp
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  placeholder="(11) 99999-9999"
                  style={fieldStyle}
                />

                <button
                  type="button"
                  disabled={sending}
                  onClick={bookAppointment}
                  className="gold-button"
                  style={{
                    width: "100%",
                    border: "none",
                    marginTop: "22px",
                    cursor: sending ? "wait" : "pointer",
                    opacity: sending ? 0.7 : 1,
                  }}
                >
                  {sending ? "ENVIANDO..." : "CONFIRMAR AGENDAMENTO"}
                </button>
              </div>
            )}

            {error && (
              <p style={{ color: "#A52A2A", marginTop: "18px" }}>
                {error}
              </p>
            )}

            {success && (
              <p style={{ color: "#244C3B", marginTop: "18px", fontWeight: 600 }}>
                {success}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="booking">
        <p className="eyebrow">SEU MOMENTO COMEÇA AQUI</p>
        <h2>Esperamos por você!</h2>
        <p>
          Atendimento de segunda a sábado, das 09h às 18h.
        </p>
        <small>Domingo: fechado</small>
      </section>

      <footer className="footer">
        <span className="footer-brand">ESTÚDIO ERICA BARROS</span>
        <p>Beleza e cuidado em cada detalhe.</p>
        <small>© {new Date().getFullYear()} Estúdio Erica Barros</small>
      </footer>
    </main>
  );
}
