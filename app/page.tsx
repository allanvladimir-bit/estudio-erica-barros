
const services = [
  { name: "Corte", price: "R$ 40,00" },
  { name: "Escova", price: "R$ 30,00" },
  { name: "Escova + Hidratação", price: "R$ 50,00" },
  { name: "Cronograma Capilar", price: "R$ 150,00" },
  { name: "Trança", price: "A partir de R$ 150,00" },
  { name: "Coloração somente tinta", price: "R$ 25,00" },
  { name: "Coloração + Escova", price: "R$ 40,00" },
  { name: "Progressiva", price: "R$ 200,00" },
];

export default function Home() {
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
          {services.map((service) => (
            <article className="service-card" key={service.name}>
              <div>
                <h3>{service.name}</h3>
                <p>Estúdio Erica Barros</p>
              </div>
              <strong>{service.price}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="booking" id="agendamento">
        <p className="eyebrow">SEU MOMENTO COMEÇA AQUI</p>
        <h2>Vamos agendar?</h2>
        <p>
          Escolha seu serviço e entre em contato para consultar
          os horários disponíveis.
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
