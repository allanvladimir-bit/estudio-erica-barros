self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "Novo agendamento!";
  const options = {
    body: data.body || "Uma cliente fez um agendamento.",
    icon: "/icon-192%281%29.png",
    badge: "/icon-192%281%29.png",
    data: {
      url: data.url || "/admin",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/admin";

  event.waitUntil(
    clients.openWindow(url)
  );
});
