import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

// Edge Function Supabase pour créer une session Stripe Checkout avec support TWINT et Carte Bancaire
// Note : TWINT requiert que la devise soit le CHF ('chf') et un compte Stripe basé en Suisse.

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      ticketId,
      eventTitle,
      categoryName,
      amount,
      currency = "chf",
      returnUrl,
      attendeeEmail,
      attendeeName,
    } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error("Le montant doit être supérieur à 0 pour déclencher un paiement.");
    }

    // Création de la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["twint", "card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `${eventTitle} — ${categoryName}`,
              description: `Billet d'entrée nominatif réservé pour ${attendeeName} (${attendeeEmail})`,
            },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: attendeeEmail,
      metadata: {
        ticketId: ticketId || "",
        attendeeName: attendeeName || "",
      },
      success_url: `${returnUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}&id=${ticketId || ""}`,
      cancel_url: `${returnUrl}?payment=cancelled&id=${ticketId || ""}`,
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
