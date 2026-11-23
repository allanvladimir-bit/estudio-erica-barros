
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
};

type Slot = {
  slot_start: string;
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

const primaryButtonStyle = {
  width: "100%",
  padding: "15px",
  border: "none",
  borderRadius: "9px",
  background: "#C5A45B",
  color: "#17382B",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "1px",
  cursor: "pointer",
};

function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

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

  // Carrega os serviços ativos
  useEffect(() => {
    let active = true;

    async function loadServices() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("services")
        .select("id, name, price, duration_minutes")
        .eq("active", true)
        .order("name");

      if (!active) return;

      if (error) {
        console.error("Erro ao carregar serviços:", error);
        setError("Não foi possível carregar os serviços. Tente novamente.");
      } else {
        setServices(data || []);
      }

      setLoading(false);
    }

    loadServices();

    return () => {
      active = false;
    };
  }, []);

  // Consulta horários disponíveis
  useEffect(() => {
    if (!selectedService || !date || success) {
      setSlots([]);
      setLoadingSlots(false);
      return;
    }

    let active = true;

    async function loadSlots() {
      setLoadingSlots(true);
      setSlots([]);
      setSelectedSlot("");
      setError("");

      const { data, error } = await supabase.rpc(
        "get_available_slots",
        {
          p_service_id: selectedService!.id,
          p_date: date,
        }
      );

      if (!active) return;

      if (error) {
        console.error("Erro ao consultar horários:", error);
        setError("Não foi possível consultar os horários. Tente novamente.");
      } else {
        const availableSlots = (data || []) as Slot[];

        setSlots(
          availableSlots.map((item) => item.slot_start)
        );
      }

      setLoadingSlots(false);
    }

    loadSlots();

    return () => {
      active = false;
    };
  }, [selectedService, date, success]);

  // Seleciona um serviço
  function chooseService(service: Service) {
    setSelectedService(service);
    setDate("");
    setSlots([]);
    setSelectedSlot("");
    setClientName("");
    setClientPhone("");
    setError("");
    setSuccess("");

    setTimeout(() => {
      document.getElementById("agendamento")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  // Seleciona uma data
  function chooseDate(value: string) {
    setDate(value);
    setSelectedSlot("");
    setSuccess("");
    setError("");
  }

  // Envia agendamento
  async function bookAppointment() {
    if (!selectedService) {
      setError("Escolha um serviço primeiro.");
      return;
    }

    if (!date || !selectedSlot) {
      setError("Escolha a data e o horário desejados.");
      return;
    }

    if (!clientName.trim()) {
      setError("Digite seu nome completo.");
      return;
    }

    const phone = clientPhone.replace(/\D/g, "");

    if (phone.length < 10 || phone.length > 13) {
      setError("Digite um WhatsApp válido com DDD.");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const { data, error } = await supabase.rpc(
        "create_public_appointment",
        {
          p_service_id: selectedService.id,
          p_start_at: new Date(selectedSlot).toISOString(),
          p_client_name: clientName.trim(),
          p_client_phone: phone,
        }
      );

      if (error) {
        console.error("Erro no agendamento:", error);
        setError(
          "Não foi possível concluir o agendamento. Atualize os horários e tente novamente."
        );
      } else if (!data || data.success !== true) {
        setError(
          data?.message || "Não foi possível confirmar o recebimento do agendamento."
        );
      } else {
        setSuccess(
          "Solicitação enviada com sucesso! Aguarde a confirmação do Estúdio Erica Barros."
        );

        setSelectedSlot("");
        setClientName("");
        setClientPhone("");
        setSlots([]);
      }
    } catch (err) {
      console.error(err);
      setError("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main>
      {/* CABEÇALHO */}
      <header className="header">
        <a href="#" className="brand">
          <span className="brand-mark">EB</span>
          <span>
            <strong>ESTÚDIO</strong>
            <small>ERICA BARROS</small>
          </span>
        </a>

        <a href="#servicos" className="header-link">
          Agendar horário
        </a>
      </header>

            {/* APRESENTAÇÃO COM FOTO DA ERICA */}
      <section
        aria-label="Apresentação do Estúdio Erica Barros"
        style={{
          position: "relative",
          width: "100%",
          overflow: "hidden",
          lineHeight: 0,
          background: "#17382B",
        }}
      >
        <img
          src="/file_000000003db4820e84b2d7788a1d100e.png"
          alt="Estúdio Erica Barros — beleza, autoestima e bem-estar"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
          }}
        />

        {/* ÁREA CLICÁVEL SOBRE O BOTÃO DA IMAGEM */}
        <a
          href="#servicos"
          aria-label="Agende seu horário"
          style={{
            position: "absolute",
            left: "9.7%",
            top: "69.2%",
            width: "29.3%",
            height: "9.2%",
            display: "block",
            borderRadius: "50px",
            cursor: "pointer",
            zIndex: 2,
            WebkitTapHighlightColor: "transparent",
          }}
        />
      </section>

      {/* SERVIÇOS */}
      <section className="services" id="servicos">
        <p className="eyebrow">CUIDADOS PARA VOCÊ</p>

        <h2>Nossos serviços</h2>

        <p className="section-text">
          Escolha seu cuidado e reserve seu momento.
        </p>

        <div className="service-grid">
          {loading ? (
            <p>Carregando serviços...</p>
          ) : error && services.length === 0 ? (
            <p>{error}</p>
          ) : services.length === 0 ? (
            <p>Nenhum serviço disponível no momento.</p>
          ) : (
            services.map((service) => {
              const selected = selectedService?.id === service.id;

              return (
                <button
                  type="button"
                  key={service.id}
                  className="service-card"
                  aria-pressed={selected}
                  onClick={() => chooseService(service)}
                  style={{
                    width: "100%",
                    minHeight: "90px",
                    fontFamily: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                    border: selected
                      ? "2px solid #C5A45B"
                      : "1px solid #e4dbc9",
                    background: selected ? "#FBF8F1" : "#FFFFFF",
                    color: "#26382E",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <div>
                    <h3>{service.name}</h3>
                    <p>
                      {service.duration_minutes} minutos
                      {" • "}
                      Estúdio Erica Barros
                    </p>
                  </div>

                  <strong>
                    {formatPrice(service.price, service.name)}
                  </strong>
                </button>
              );
            })
          )}
        </div>

        {/* AGENDAMENTO */}
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
              textAlign: "left",
              scrollMarginTop: "20px",
            }}
          >
            {success ? (
              <div
                style={{
                  padding: "20px 8px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    margin: "0 auto 18px",
                    borderRadius: "50%",
                    background: "#244C3B",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "32px",
                  }}
                >
                  ✓
                </div>

                <p className="eyebrow">SOLICITAÇÃO RECEBIDA</p>

                <h2 style={{ marginBottom: "12px" }}>
                  Agendamento enviado!
                </h2>

                <p style={{ lineHeight: 1.7 }}>
                  {success}
                </p>

                <div
                  style={{
                    marginTop: "22px",
                    padding: "16px",
                    background: "#F2E9D8",
                    borderRadius: "10px",
                    textAlign: "left",
                    lineHeight: 1.9,
                  }}
                >
                  <strong>Resumo da solicitação</strong>
                  <br />
                  Serviço: {selectedService.name}
                  <br />
                  Valor: {formatPrice(selectedService.price, selectedService.name)}
                  <br />
                  Data: {date.split("-").reverse().join("/")}
                  <br />
                  Horário: {formatTime(
                    // O horário enviado fica registrado no banco.
                    // A confirmação visual usa o horário escolhido.
                    selectedSlot || new Date().toISOString()
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSuccess("");
                    setDate("");
                    setSlots([]);
                    setSelectedSlot("");
                    setError("");
                  }}
                  style={{
                    ...primaryButtonStyle,
                    marginTop: "24px",
                  }}
                >
                  FAZER OUTRO AGENDAMENTO
                </button>
              </div>
            ) : (
              <>
                <p className="eyebrow">RESERVE SEU MOMENTO</p>

                <h2 style={{ marginBottom: "8px" }}>
                  Seu agendamento
                </h2>

                <div
                  style={{
                    padding: "16px",
                    marginBottom: "22px",
                    background: "#F2E9D8",
                    borderRadius: "10px",
                  }}
                >
                  <p style={{ margin: 0, lineHeight: 1.9 }}>
                    Serviço: <strong>{selectedService.name}</strong>
                    <br />
                    Valor: <strong>
                      {formatPrice(selectedService.price, selectedService.name)}
                    </strong>
                    <br />
                    Duração: <strong>
                      {selectedService.duration_minutes} minutos
                    </strong>
                  </p>
                </div>

                {/* DATA */}
                <label
                  htmlFor="appointment-date"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Escolha a data
                </label>

                <input
                  id="appointment-date"
                  type="date"
                  value={date}
                  min={todayInBrazil()}
                  onChange={(event) => chooseDate(event.target.value)}
                  style={fieldStyle}
                />

                {/* HORÁRIOS */}
                {date && (
                  <div style={{ marginTop: "24px" }}>
                    <strong>Horários disponíveis</strong>

                    {loadingSlots ? (
                      <p>Consultando horários...</p>
                    ) : slots.length === 0 ? (
                      <p style={{ marginTop: "12px" }}>
                        Não há horários disponíveis nesta data.
                        Escolha outro dia.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(85px, 1fr))",
                          gap: "10px",
                          marginTop: "14px",
                        }}
                      >
                        {slots.map((slot) => {
                          const selected = selectedSlot === slot;

                          return (
                            <button
                              type="button"
                              key={slot}
                              onClick={() => {
                                setSelectedSlot(slot);
                                setError("");
                                setSuccess("");
                              }}
                              style={{
                                padding: "13px 8px",
                                borderRadius: "9px",
                                border: selected
                                  ? "2px solid #244C3B"
                                  : "1px solid #C5A45B",
                                background: selected ? "#244C3B" : "#FFFFFF",
                                color: selected ? "#FFFFFF" : "#244C3B",
                                cursor: "pointer",
                                fontSize: "15px",
                                fontWeight: 600,
                              }}
                            >
                              {formatTime(slot)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* DADOS DO CLIENTE */}
                {selectedSlot && (
                  <div style={{ marginTop: "25px" }}>
                    <p style={{ marginBottom: "20px" }}>
                      Horário escolhido:{" "}
                      <strong>{formatTime(selectedSlot)}</strong>
                    </p>

                    <label
                      htmlFor="client-name"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 600,
                      }}
                    >
                      Seu nome completo
                    </label>

                    <input
                      id="client-name"
                      type="text"
                      autoComplete="name"
                      value={clientName}
                      onChange={(event) => setClientName(event.target.value)}
                      placeholder="Digite seu nome completo"
                      style={fieldStyle}
                    />

                    <label
                      htmlFor="client-phone"
                      style={{
                        display: "block",
                        margin: "16px 0 8px",
                        fontWeight: 600,
                      }}
                    >
                      Seu WhatsApp
                    </label>

                    <input
                      id="client-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      value={clientPhone}
                      onChange={(event) => setClientPhone(event.target.value)}
                      placeholder="(11) 99999-9999"
                      style={fieldStyle}
                    />

                    <button
                      type="button"
                      disabled={sending}
                      onClick={bookAppointment}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: "22px",
                        cursor: sending ? "wait" : "pointer",
                        opacity: sending ? 0.7 : 1,
                      }}
                    >
                      {sending
                        ? "ENVIANDO..."
                        : "CONFIRMAR AGENDAMENTO"}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ERROS */}
            {error && (
              <p
                role="alert"
                style={{
                  color: "#A52A2A",
                  marginTop: "18px",
                  fontWeight: 600,
                }}
              >
                {error}
              </p>
            )}
          </div>
        )}
      </section>

      {/* INFORMAÇÕES */}
      <section className="booking">
        <p className="eyebrow">SEU MOMENTO COMEÇA AQUI</p>

        <h2>Esperamos por você!</h2>

        <p>
          Atendimento de segunda a sábado, das 09h às 18h.
        </p>

        <small>Domingo: fechado</small>
      </section>

      {/* RODAPÉ */}
      <footer className="footer">
        <span className="footer-brand">
          ESTÚDIO ERICA BARROS
        </span>

        <p>Beleza e cuidado em cada detalhe.</p>

        <small>
          © {new Date().getFullYear()} Estúdio Erica Barros
        </small>
      </footer>
    </main>
  );
}
