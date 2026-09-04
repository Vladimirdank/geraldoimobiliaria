"use client";
import { useState } from "react";
import { Search, SlidersHorizontal, ArrowUpRight } from "lucide-react";
export function SearchForm({
  cities,
  types,
  compact = false,
}: {
  cities: string[];
  types: string[];
  compact?: boolean;
}) {
  const [purpose, setPurpose] = useState("Comprar");
  const [open, setOpen] = useState(false);
  return (
    <div className={`search-panel ${compact ? "compact" : ""}`}>
      <div className="search-tabs">
        {["Comprar", "Alugar"].map((p) => (
          <button
            className={p === purpose ? "active" : ""}
            key={p}
            onClick={() => setPurpose(p)}
          >
            {p}
          </button>
        ))}
        <span>Um novo lugar. Do seu jeito.</span>
      </div>
      <button className="mobile-filter button" onClick={() => setOpen(!open)}>
        <SlidersHorizontal size={18} />
        Filtrar imóveis
      </button>
      <form
        className={`quick-search ${open ? "expanded" : ""}`}
        action="/imoveis"
      >
        <input type="hidden" name="purpose" value={purpose} />
        <label>
          TIPO DE IMÓVEL
          <select name="type">
            <option value="">O que você procura?</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          LOCALIZAÇÃO
          <select name="city">
            <option value="">Onde você quer viver?</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          VALOR ATÉ
          <select name="max">
            <option value="">Escolha uma faixa</option>
            {(purpose === "Alugar"
              ? [3000, 5000, 10000, 20000]
              : [500000, 1000000, 1500000, 2500000, 5000000]
            ).map((v) => (
              <option key={v} value={v}>
                {v.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                })}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="submit">
          <Search size={18} />
          Encontrar imóveis <ArrowUpRight size={18} />
        </button>
      </form>
    </div>
  );
}
