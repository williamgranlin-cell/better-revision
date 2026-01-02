import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get raw body
    const body = await req.text();
    
    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      logStep("Webhook signature verification failed", { error: err.message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event verified", { type: event.type });

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Processing subscription", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          customerId 
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) {
          logStep("Customer was deleted");
          break;
        }

        const email = customer.email;
        if (!email) {
          logStep("Customer has no email");
          break;
        }

        // Find user by email
        const { data: profiles, error: profileError } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("email", email)
          .limit(1);

        if (profileError || !profiles || profiles.length === 0) {
          logStep("User not found for email", { email, error: profileError });
          break;
        }

        const userId = profiles[0].id;
        logStep("Found user", { userId, email });

        // Update or insert subscription
        const subscriptionData = {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          status: subscription.status === "active" || subscription.status === "trialing" ? "active" : "inactive",
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        };

        // Check if subscription exists
        const { data: existingSub } = await supabaseClient
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .limit(1);

        if (existingSub && existingSub.length > 0) {
          // Update existing subscription
          const { error: updateError } = await supabaseClient
            .from("subscriptions")
            .update(subscriptionData)
            .eq("user_id", userId);

          if (updateError) {
            logStep("Error updating subscription", { error: updateError });
          } else {
            logStep("Subscription updated successfully");
          }
        } else {
          // Insert new subscription
          const { error: insertError } = await supabaseClient
            .from("subscriptions")
            .insert(subscriptionData);

          if (insertError) {
            logStep("Error inserting subscription", { error: insertError });
          } else {
            logStep("Subscription created successfully");
          }
        }

        // Update user role to premium if active
        if (subscription.status === "active" || subscription.status === "trialing") {
          const { data: existingRole } = await supabaseClient
            .from("user_roles")
            .select("id, role")
            .eq("user_id", userId)
            .limit(1);

          if (existingRole && existingRole.length > 0) {
            // Don't downgrade admin to premium
            if (existingRole[0].role !== "admin") {
              await supabaseClient
                .from("user_roles")
                .update({ role: "premium" })
                .eq("user_id", userId);
              logStep("User role updated to premium");
            }
          } else {
            await supabaseClient
              .from("user_roles")
              .insert({ user_id: userId, role: "premium" });
            logStep("User role created as premium");
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Processing subscription deletion", { subscriptionId: subscription.id });

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) break;

        const email = customer.email;
        if (!email) break;

        // Find user by email
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("email", email)
          .limit(1);

        if (!profiles || profiles.length === 0) break;

        const userId = profiles[0].id;

        // Update subscription status to inactive
        await supabaseClient
          .from("subscriptions")
          .update({ status: "inactive" })
          .eq("user_id", userId);

        // Downgrade user role to free (unless admin)
        const { data: userRole } = await supabaseClient
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .limit(1);

        if (userRole && userRole.length > 0 && userRole[0].role !== "admin") {
          await supabaseClient
            .from("user_roles")
            .update({ role: "free" })
            .eq("user_id", userId);
          logStep("User role downgraded to free");
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment succeeded", { invoiceId: invoice.id });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { invoiceId: invoice.id });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
