import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  try {
    const body = await req.text();
    let event: any;

    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    // Gestion du succès du paiement (TWINT ou Carte)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const ticketId = session.metadata?.ticketId;

      if (ticketId) {
        // Valider le billet et enregistrer les métadonnées de paiement
        await supabase
          .from("tickets")
          .update({
            status: "valid",
            payment_status: "paid",
            stripe_session_id: session.id,
            payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
            amount_paid: session.amount_total ? session.amount_total / 100 : undefined,
          })
          .eq("id", ticketId);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});
