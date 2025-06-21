const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());
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

app.post('/enviar', (req, res) => {
  const { nombre, email, txid } = req.body;

  const mensaje = `
📥 <b>Nuevo Formulario</b>
🆔 ID: <code>${txid}</code>
👤 Nombre: ${nombre}
📧 Email: ${email}
  `;

  const keyboard = {
    inline_keyboard: [
      [{ text: "✅ Aprobar", callback_data: `aprobar:${txid}` }],
      [{ text: "❌ Rechazar", callback_data: `rechazar:${txid}` }]
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

  if (!callback || !callback.data) {
    return res.sendStatus(400);
  }

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

app.get('/', (req, res) => {
  res.send("Servidor activo");
});

app.listen(3000, () => console.log("Servidor activo en Render puerto 3000"));
