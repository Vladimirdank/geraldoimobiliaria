import { properties } from "@/services/repository";
import { FavoriteList } from "@/components/property-card";
export const metadata = { title: "Seus favoritos" };
export default async function Favorites() {
  return (
    <main id="main" className="inner-page container">
      <span className="eyebrow">SUA SELEÇÃO PESSOAL</span>
      <h1>
        Lugares que <em>ficaram.</em>
      </h1>
      <p>Seus imóveis favoritos, reunidos para você comparar com calma.</p>
      <FavoriteList properties={await properties()} />
    </main>
  );
}
