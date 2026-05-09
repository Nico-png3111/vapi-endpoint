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
        const toolCall = req.body?.message?.toolCallList?.[0];
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
                if (!m || m[