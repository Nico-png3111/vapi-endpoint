const express = require('express');
const { google } = require('googleapis');
const app = express();
app.use(express.json());

const INVENTORY = {
  "Habitación Estándar": 4,
  "Habitación Superior": 5,
  "Suite Junior": 3,
  "Suite Pacífico": 2,
  "Cabina de Selva": 4,
  "Villa Familiar": 2
};

function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  return oauth2Client;
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Vapi Calendar Endpoint funcionando' });
});

app.post('/check-availability', async (req, res) => {
  try {
    const toolCall = req.body?.message?.toolCallList?.[0];:console.log("BODY RECIBIDO:", JSON.stringify(req.body));
console.log("TOOL CALL:", JSON.stringify(toolCall));
    if (!toolCall) return res.status(400).json({ error: 'No toolCall encontrado' });

    const args = JSON.parse(toolCall.function.arguments);
    const { roomType, startDate, endDate } = args;
    const calendarId = process.env.CALENDAR_ID;
    const inventory = INVENTORY[roomType] ?? 0;

    const auth = getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const eventsRes = await calendar.events.list({
      calendarId,
      timeMin: new Date(startDate + 'T00:00:00').toISOString(),
      timeMax: new Date(endDate + 'T00:00:00').toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = eventsRes.data.items || [];
    const nights = [];
    let cur = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    while (cur < end) {
      const dateStr = cur.toISOString().split('T')[0];
      const reserved = events.filter(ev => {
        const m = (ev.summary || '').match(/^Reserva - (.*?) \|/);
        if (!m || m[1] !== roomType) return false;
        const evStart = new Date(ev.start.date || ev.start.dateTime);
        const evEnd = new Date(ev.end.date || ev.end.dateTime);
        const night = new Date(dateStr + 'T00:00:00');
        return evStart <= night && night < evEnd;
      }).length;

      nights.push({ date: dateStr, reserved, available: Math.max(0, inventory - reserved) });
      cur.setDate(cur.getDate() + 1);
    }

    const maxReserved = nights.length > 0 ? Math.max(...nights.map(n => n.reserved)) : 0;
    const minAvailable = nights.length > 0 ? Math.min(...nights.map(n => n.available)) : inventory;

    res.status(200).json({
      results: [{
        toolCallId: toolCall.id,
        result: {
          ok: true,
          roomType, inventory,
          range: { startDate, endDate },
          nights, maxReserved, minAvailable,
          isAvailableForEntireRange: minAvailable > 0
        }
      }]
    });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
