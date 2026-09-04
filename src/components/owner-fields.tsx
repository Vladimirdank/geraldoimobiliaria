"use client";
export function OwnerFields() {
  return (
    <>
      <div className="form-row">
        <label>
          Cidade
          <input
            name="owner_city"
            required
            maxLength={100}
            placeholder="Cidade do imóvel"
          />
        </label>
        <label>
          Bairro
          <input
            name="owner_neighborhood"
            required
            maxLength={100}
            placeholder="Bairro do imóvel"
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Tipo de imóvel
          <select name="owner_type" required>
            <option value="">Selecione</option>
            {[
              "Casa",
              "Apartamento",
              "Condomínio",
              "Terreno",
              "Lote",
              "Comercial",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Valor estimado (R$)
          <input
            name="owner_price"
            type="number"
            min="0"
            max="1000000000000"
            placeholder="Faixa de valor"
          />
        </label>
      </div>
    </>
  );
}
