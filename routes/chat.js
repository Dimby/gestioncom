const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/", async (req, res) => {
  const userMessage = req.body.message;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: `
Tu es un assistant de gestion de stock.
Tu peux demander des actions sous forme JSON.

Exemples :
{
  "action": "getMonthlyMargin",
  "month": "2026-02"
}
`
      },
      { role: "user", content: userMessage }
    ]
  });

  const reply = completion.choices[0].message.content;

  res.json({ reply });
});

module.exports = router;