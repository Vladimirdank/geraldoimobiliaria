"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="inner-page container empty">
      <h1>Precisamos de um instante.</h1>
      <p>Não foi possível carregar o conteúdo agora.</p>
      <button className="button" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
