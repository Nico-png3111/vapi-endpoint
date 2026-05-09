const express = require('express');
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Vapi Calendar Endpoint funcionando' });
});

app.post('/check-availability', async (req, res) => {
  console.log("BODY:", JSON.stringify(req.body));
  const toolCall = req.body?.message?.toolCallList?.[0];
  console.log("TOOL CALL ID:", toolCall?.id);
  return res.json({
    results: [
      {
        toolCallId: toolCall?.id,
        result: { ok: true, note: "dummy response working" }
      }
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
