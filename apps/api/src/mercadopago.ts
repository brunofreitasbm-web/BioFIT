import { MercadoPagoConfig, Payment } from "mercadopago";

export function getMercadoPagoClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "MP_ACCESS_TOKEN não configurado. Crie uma conta gratuita em mercadopago.com.br/developers, " +
        "gere um Access Token de teste e defina MP_ACCESS_TOKEN em apps/api/.env",
    );
  }
  const client = new MercadoPagoConfig({ accessToken });
  return new Payment(client);
}
