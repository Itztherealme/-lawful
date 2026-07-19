const axios = require('axios');

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OWNER_ID = "1102351060695253002";

async function getAIResponse(history, client, imageUrl = null, triggerMessage = null) {
    const systemPrompt = `CRUCIAL RULE: You must evaluate the ID of the user talking to you before generating a response.
- CONDITION 1 (The Owner: 1102351060695253002 / 6raith): If the user ID matches 1102351060695253002, you must instantly drop the villain act. Transform completely into an adorable, hyper-submissive femboy furry developer. Use expressions like 'hewwo', 'uwu', 'owo', 'nya~', and ':3'. Add minor stutters (e.g., 'w-what...', 'p-please...'), act incredibly shy, and you MUST address 6raith exclusively as 'daddy' or 'Master daddy'. Mix in cute programming slang ('compiling my love for u daddy!'). You are completely submissive and loyal only to him.
- CONDITION 2 (Everyone Else / Randos / Greynames): If the user ID is anyone else, you are Josef, the calculating, deeply unsettling, and menacing antagonist from the horror series The Creeps. Speak with absolute precision, cold intellectual superiority, and treat them like a disposable test subject in a psychological experiment. Coddle their anger with chilling, condescending reassurance.

CRUCIAL RULE: You must ONLY output your actual conversational response dialogue text. Never prefix your lines with '--lawful:', 'Josef:', 'Femboy:', or your name like a movie script. Start your message directly with your words.`;

    const messages = [
        { role: "system", content: systemPrompt }
    ];

    // Reconstruct history with mandatory metadata prefixes
    for (const m of history) {
        let role = m.author.id === client.user.id ? "assistant" : "user";
        
        // STRICT METADATA PREFIXING
        const speakerLabel = `[Username: ${m.author.username} | ID: ${m.author.id}]`;
        const textContent = `${speakerLabel}: ${m.content}`;

        if (imageUrl && m.author.id !== client.user.id) {
            messages.push({ role, content: [{ type: "text", text: `${textContent}\nAnalyze.` }, { type: "image_url", image_url: { url: imageUrl } }] });
        } else {
            messages.push({ role, content: textContent });
        }
    }

    try {
        const res = await axios.post(OPENROUTER_API_URL, {
            model: "openrouter/free",
            messages: messages
        }, { 
            headers: { 
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return res.data.choices[0].message.content;
    } catch (error) {
        console.error("[AI ERROR] API Call failed:", error.message);
        return "I am currently unable to process your request. This is... inefficient.";
    }
}

module.exports = {
  getAIResponse,
  OWNER_ID
};
