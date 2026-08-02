export async function triggerPush({ userId, title, body, link }) {
  try {
    await fetch("/api/send-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, body, link }),
    });
  } catch (e) {
    // L'échec de la notification push ne doit jamais bloquer l'action principale
  }
}
