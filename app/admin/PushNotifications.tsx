
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

const VAPID_PUBLIC_KEY =
  "BGGPLbiagbPOUjL9pJsuf03bTRWiYYkEmDl8zNAiLff2tjBch5wcWvCBKP6xVXwphJaA50_PQDQGQmao-Ym2hjI";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }

  return output;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const item = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    return [
      item.message,
      item.details,
      item.hint,
      item.code ? `Código: ${item.code}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
  }

  return String(error);
}

export default function PushNotifications() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function activateNotifications() {
    setLoading(true);
    setMessage("");

    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        throw new Error(
          "Este navegador não oferece suporte a notificações."
        );
      }

      if (!("Notification" in window)) {
        throw new Error(
          "As notificações não estão disponíveis neste aparelho."
        );
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error(
          "Permissão não concedida. Verifique as notificações nas configurações do Android."
        );
      }

      const registration =
        await navigator.serviceWorker.register("/sw.js");

      await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            VAPID_PUBLIC_KEY
          ) as BufferSource,
        });
      }

      const subscriptionData = subscription.toJSON();

      if (
        !subscriptionData.endpoint ||
        !subscriptionData.keys?.p256dh ||
        !subscriptionData.keys?.auth
      ) {
        throw new Error(
          "O aparelho não forneceu os dados necessários para o cadastro."
        );
      }

      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscriptionData.endpoint);

      if (deleteError) {
        throw deleteError;
      }

      const { error: insertError } = await supabase
        .from("push_subscriptions")
        .insert({
          id: crypto.randomUUID(),
          endpoint: subscriptionData.endpoint,
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth,
        });

      if (insertError) {
        throw insertError;
      }

      setMessage(
        "Sucesso! Este celular foi cadastrado para receber notificações."
      );
    } catch (error) {
      console.error("Erro ao ativar notificações:", error);

      setMessage(
        "Falha no cadastro: " + getErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      style={{
        background: "#FBF8F1",
        border: "1px solid #D8D2C5",
        borderRadius: "14px",
        padding: "20px",
        marginBottom: "24px",
      }}
    >
      <h2 style={{ color: "#244C3B", marginTop: 0 }}>
        Notificações no celular
      </h2>

      <p style={{ color: "#526157" }}>
        Ative para receber avisos de novos agendamentos,
        mesmo quando o aplicativo estiver fechado.
      </p>

      <button
        onClick={activateNotifications}
        disabled={loading}
        style={{
          background: "#244C3B",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "8px",
          padding: "13px 20px",
          fontWeight: "bold",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "ATIVANDO..." : "ATIVAR NOTIFICAÇÕES"}
      </button>

      {message && (
        <p
          style={{
            color: "#244C3B",
            marginBottom: 0,
            overflowWrap: "anywhere",
          }}
        >
          {message}
        </p>
      )}
    </section>
  );
}
