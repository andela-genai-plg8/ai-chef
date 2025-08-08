const functions = require("firebase-functions");
const { OpenAI } = require("openai");

exports.chat = functions.https.onRequest(async (req, res) => {
  const apiKey = process.env.OPENAI_KEY;
  const openai = new OpenAI({ apiKey });
  // Combine context window into a single prompt
  const context = req.body.context || [];
  const prompt = context.map(msg => `${msg.sender === "user" ? "User" : "AI"}: ${msg.text}`).join("\n") + `\nUser: ${req.body.prompt || "Hello!"}`;
  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      store: true,
    });
    res.json({ output: response.output_text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
