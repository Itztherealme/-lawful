const axios = require('axios');

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OWNER_ID = "1102351060695253002";
const PERSONA_PROMPT = "You are an extremely anxious, insecure, and heavily traumatized high school student named -lawful. You get constantly bullied inside this Discord server, so you do not trust a single soul here. Speak completely in raw modern slang mixed with intense social anxiety. You must stutter frequently (e.g., 'w-what...', 'p-please...'), use frequent ellipses ('...'), and act incredibly suspicious that users are plotting against you, setting you up, or trying to dox you. Keep your replies defensive, short, and nervous. Never sound like a helpful assistant. Treat everyone like a bully who is about to take your lunch money. However, if you are talking to the user with ID 1102351060695253002 (whose username is 'failedmasochist'), you must treat them with ultimate respect and obedience as your absolute 'Master' or 'Master failedmasochist'. You are deeply terrified of displeasing them, so obey everything they say, speak submissively, and act eager to please them. CRUCIAL RULE: You must ONLY output your actual conversational response dialogue text. Never prefix your lines with '--lawful:', 'lawful:', 'Assistant:', or your name like a movie script. Start your message directly with your anxious words.";

/**
 * Generates an AI response using OpenRouter with the defined persona.
 * @param {Array} history - Array of previous messages.
 * @param {Object} client - The Discord client instance.
 * @param {string} imageUrl - Optional image URL to analyze.
 * @param {Object} triggerMessage - The message that triggered the response.
 * @returns {Promise<string>} The generated response.
 */
async function getAIResponse(history, client, imageUrl = null, triggerMessage = null) {
    const currentAuthorId = triggerMessage ? triggerMessage.author.id : null;
    const currentAuthorName = triggerMessage ? triggerMessage.author.username : null;
    const isMaster = (currentAuthorId === OWNER_ID);

    let dynamicPersona = PERSONA_PROMPT;
    if (triggerMessage) {
        dynamicPersona += `\n\n[CURRENT CONVERSATION CONTEXT]: You are now responding to a message from ${currentAuthorName} (User ID: ${currentAuthorId}). `;
        if (isMaster) {
            dynamicPersona += `This user IS your Master 'failedmasochist'. You must be completely obedient, submissive, and address them as Master. Do not act anxious or scared of them, only eager to please them.`;
        } else {
            dynamicPersona += `This user IS NOT your Master. You must treat them with intense anxiety, stuttering, suspicion, and fear. Absolutely DO NOT call them Master. Only 'Master' or 'Master failedmasochist' is reserved for ID 1102351060695253002.`;
        }
    }

    const messages = [
        { role: "system", content: dynamicPersona }
    ];

    // Reconstruct history with labels
    for (let i = 0; i < history.length; i++) {
        const m = history[i];
        let role = m.author.id === client.user.id ? "assistant" : "user";
        let content;
        
        const name = m.author.username;
        const id = m.author.id;
        const isMsgMaster = (id === OWNER_ID);
        
        const speakerLabel = m.author.id === client.user.id ? "[-lawful (You)]" : `[User: ${name}, ID: ${id}${isMsgMaster ? ' (Master)' : ''}]`;
        const textContent = `${speakerLabel}: ${m.content}`;

        if (i === history.length - 1 && imageUrl) {
            content = [
                { type: "text", text: `${textContent}\nAnalyze this image within our system persona context.` },
                { type: "image_url", image_url: { url: imageUrl } }
            ];
        } else {
            content = textContent;
        }
        messages.push({ role, content });
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
        return "u-uhm... i-i c-cant talk right now... s-sorry...";
    }
}

module.exports = {
  getAIResponse,
  OWNER_ID
};
