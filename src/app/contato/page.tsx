import { LeadForm } from "@/components/lead-form";
export const metadata = { title: "Vamos conversar" };
export default async function Contact({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const q = await searchParams;
  return (
    <main id="main" className="inner-page container contact-page">
      <div>
        <span className="eyebrow">O PRIMEIRO PASSO É UMA CONVERSA</span>
        <h1>
          {q.origem === "proprietario"
            ? "Seu imóvel. Novas possibilidades."
            : "Vamos encontrar o seu lugar."}
        </h1>
        <p>
          Conte um pouco sobre seus planos.
          <br />O próximo capítulo, a gente constrói junto.
        </p>
        <div className="contact-note">
          ATENDIMENTO COM PROPÓSITO
          <p>
            Uma escuta atenta, uma seleção cuidadosa e a tranquilidade de estar
            bem acompanhado.
          </p>
        </div>
      </div>
      <div className="contact-form-card">
        <h2>
          {q.origem === "proprietario"
            ? "Apresente seu imóvel"
            : "Como podemos ajudar?"}
        </h2>
        <LeadForm
          origin={q.origem === "proprietario" ? "proprietario" : "contato"}
        />
      </div>
    </main>
  );
}
