
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.PUSH_WEBHOOK_SECRET;
    const authorization = request.headers.get("authorization");

    if (!secret || authorization !== `Bearer ${secret}`) {
      return new Response("Não autorizado", { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!supabaseUrl || !supabaseKey || !publicKey || !privateKey || !subject) {
      return new Response("Configuração incompleta", { status: 500 });
    }

    const payload = await request.json();
    const appointmentId = payload.record?.id;

    if (payload.type !== "INSERT" || !appointmentId) {
      return Response.json({ received: true });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        id,
        start_at,
        status,
        clients ( name ),
        services ( name )
      `)
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return new Response("Agendamento não encontrado", { status: 404 });
    }

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");

    if (subscriptionsError) {
      return new Response("Erro ao buscar celulares", { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return Response.json({ sent: 0 });
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const client = Array.isArray(appointment.clients)
      ? appointment.clients[0]
      : appointment.clients;

    const service = Array.isArray(appointment.services)
      ? appointment.services[0]
      : appointment.services;

    const date = new Date(appointment.start_at).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "short",
      timeStyle: "short",
    });

    const notification = JSON.stringify({
      title: "Novo agendamento!",
      body: `${client?.name || "Cliente"} agendou ${service?.name || "um serviço"} para ${date}.`,
      url: "/admin",
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            notification
          );
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;

          if (statusCode === 404 || statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", subscription.id);
          }

          throw error;
        }
      })
    );

    const sent = results.filter(
      (result) => result.status === "fulfilled"
    ).length;

    return Response.json({ sent, total: subscriptions.length });
  } catch (error) {
    console.error("Erro no envio de notificações:", error);
    return new Response("Erro interno", { status: 500 });
  }
}
