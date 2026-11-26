
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    console.log("PUSH: chamada recebida");

    const secret = process.env.PUSH_WEBHOOK_SECRET;
    const authorization = request.headers.get("authorization");

    if (!secret || authorization !== `Bearer ${secret}`) {
      console.error("PUSH: autorização inválida");
      return new Response("Não autorizado", { status: 401 });
    }

    const required = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "VAPID_PUBLIC_KEY",
      "VAPID_PRIVATE_KEY",
      "VAPID_SUBJECT",
    ];

    const missing = required.filter((name) => !process.env[name]);

    if (missing.length > 0) {
      console.error("PUSH: variáveis ausentes:", missing);
      return new Response("Configuração incompleta", { status: 500 });
    }

    const payload = await request.json();
    console.log("PUSH: evento recebido:", payload.type);

    const appointmentId = payload.record?.id;

    if (payload.type !== "INSERT" || !appointmentId) {
      console.log("PUSH: evento ignorado");
      return Response.json({ received: true });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        id,
        start_at,
        clients ( name ),
        services ( name )
      `)
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error("PUSH: erro ao buscar agendamento:", appointmentError);
      return new Response("Erro ao buscar agendamento", { status: 500 });
    }

    console.log("PUSH: agendamento encontrado");

    const { data: subscriptions, error: subscriptionsError } =
      await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth");

    if (subscriptionsError) {
      console.error("PUSH: erro ao buscar celulares:", subscriptionsError);
      return new Response("Erro ao buscar celulares", { status: 500 });
    }

    console.log(
      "PUSH: celulares encontrados:",
      subscriptions?.length ?? 0
    );

    if (!subscriptions || subscriptions.length === 0) {
      return Response.json({ sent: 0 });
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

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
      })
    );

    const sent = results.filter(
      (result) => result.status === "fulfilled"
    ).length;

    for (const result of results) {
      if (result.status === "rejected") {
        const error = result.reason as {
          statusCode?: number;
          message?: string;
        };

        console.error("PUSH: falha no envio:", {
          statusCode: error.statusCode,
          message: error.message,
        });
      }
    }

    console.log(`PUSH: enviados ${sent} de ${subscriptions.length}`);

    return Response.json({
      sent,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("PUSH: erro interno:", error);

    return new Response("Erro interno", { status: 500 });
  }
}
