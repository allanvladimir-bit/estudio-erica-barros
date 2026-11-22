
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
};

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadServices() {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price, duration_minutes")
        .eq("active", true)
        .order("name");

      if (error) {
        setError("Não foi possível carregar os serviços.");
        console.error(error);
      } else {
        setServices(data || []);
      }

      setLoading(false);
    }

    loadServices();
  }, []);

  function formatPrice(price: number, name: string) {
    const value = price.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    return name.toLowerCase().includes("trança")
      ? `A partir de ${value}`
      : value;
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
        <a href="#agendamento" className="gold-button">
          AGENDAR MEU HORÁRIO
        </a>
        <div className="hero-decoration">EB</div>
      </section>

      <section className="services" id="servicos">
        <p className="eyebrow">CUIDADOS PARA VOCÊ</p>
        <h2>Nossos serviços</h2>
        <p className="section-text">
          Escolha seu cuidado e venha viver seu momento.
        </p>

        <div className="service-grid">
          {loading ? (
            <p>Carregando serviços...</p>
          ) : error ? (
            <p>{error}</p>
          ) : services.length === 0 ? (
            <p>Nenhum serviço disponível no momento.</p>
          ) : (
            services.map((service) => (
              <article className="service-card" key={service.id}>
                <div>
                  <h3>{service.name}</h3>
                  <p>Estúdio Erica Barros</p>
                </div>
                <strong>
                  {formatPrice(service.price, service.name)}
                </strong>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="booking" id="agendamento">
        <p className="eyebrow">SEU MOMENTO COMEÇA AQUI</p>
        <h2>Vamos agendar?</h2>
        <p>
          Escolha seu serviço e venha reservar seu horário.
        </p>
        <a href="#servicos" className="gold-button">
          VER SERVIÇOS
        </a>
        <small>Segunda a sábado • 09h às 18h</small>
      </section>

      <footer className="footer">
        <span className="footer-brand">ESTÚDIO ERICA BARROS</span>
        <p>Beleza e cuidado em cada detalhe.</p>
        <small>© {new Date().getFullYear()} Estúdio Erica Barros</small>
      </footer>
    </main>
  );
}
