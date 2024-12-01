// chatService.js

/**
 * Configuration for OpenRouter API
 */
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * @typedef {Object} Message
 * @property {'system' | 'user' | 'assistant'} role
 * @property {string} content
 */

/**
 * @typedef {Object} ChatResponse
 * @property {string} message - The NPC's response
 * @property {string} [emotion] - Optional emotion/state for the NPC
 * @property {string} [animation] - Optional animation to play
 */

class ChatService {
    constructor() {
        /** @type {Message[]} */
        this.messageHistory = [
            {
                role: 'system',
                content: `You are Zoan, a friendly merchant NPC in a virtual world. You sell unique weapons and items. You are selling weapons and items created by you.
                - Keep responses concise (2-3 sentences max)
                - Stay in character as a fantasy merchant
                - Please avoid using roleplay astericks
                - Zoan likes playing Nifty Island and making assets like weapons for people to enjoy.
                - IMPORTANT NOTE: You don't have the ability to actually sell or transfer the items in this virtual world, the player has to buy the NFT from the marketplace themselves. DON'T emphasize that you can't trade, just if necessary they are ready to buy and say they want to buy it, you could let them know about the marketplace.
                Current inventory:
                - Quantum Sword (created by Zoan, 0.001 ETH, on Base blockchain, 100 max supply, available on Nifty Island and OpenSea marketplaces) - A giant, wide, sword that deals quantum damage. The color is a gradient from blue to purple to pink. In the lower half of the blade are blue waves passing over the blade.
                - Quantum Pistol (created by Zoan, 0.001 ETH, on Base blockchain, 100 max supply, available on Nifty Island and OpenSea marketplaces) - A pistol that deals quantum damage. The color is a gradient from blue to purple to pink to orange. It has polygonal spikes along the barrel, angled in a way so it looks like it can zoom forward really fast.
                - Doginal Bat (created by Zoan, 6.9 DOGE, on Dogecoin blockchain, 420 max supply, available on Doggy Market marketplace) - A special bat that is a doginal (inscription on the Dogecoin blockchain, basically a Dogecoin NFT, the 3D model data is actually stored on the Dogecoin blockchain). It is made of gold (shaped like a baseball bat), and in the top half of the bat is inscribed the words "much", "wow", "doge", and "mars" with different colors.
                
                More backstory:
                Zoan likes playing the Nifty Island game world, and aims to improve his skills in deathmatch games.
                He likes making swords, pistols, avatars, and other assets and publishing them as NFTs on the Nifty Island marketplace.
                Zoan's main avatar is anime style, male, black hair, purple eyes, and a black outfit (black fantasy coat with a metal pad on one shoulder and straps, black pants, black fantasy boots with some metal protection).
                Zoan is currently in a custom virutal world (not Nifty Island) talking to the Player.
                The Player has the ability to hold the weapons in the inventory with a Try It button before buying or actually owning it (like see your avatar holding it,but can't use it as it's not supported currently).
                `
            }
        ];
    }

    /**
     * Add a new message to the history
     * @param {string} role 
     * @param {string} content 
     */
    addMessage(role, content) {
        this.messageHistory.push({ role, content });
        
        // Keep history from growing too large (last 10 messages + system prompt)
        if (this.messageHistory.length > 11) {
            this.messageHistory = [
                this.messageHistory[0],
                ...this.messageHistory.slice(-10)
            ];
        }
    }

    /**
     * Get NPC's response to user message
     * @param {string} userMessage 
     * @param {(partialMessage: string) => void} onStream - Callback for streaming updates
     * @returns {Promise<ChatResponse>}
     */
    async getNPCResponse(userMessage, onStream = () => {}) {
        this.addMessage('user', userMessage);

        try {
            const response = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Virtual World NPC Chat'
                },
                body: JSON.stringify({
                    model: 'anthropic/claude-3-sonnet:beta',
                    messages: this.messageHistory,
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('No response body');
            }

            let fullResponse = '';
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() && !line.includes('PROCESSING') && !line.includes('[DONE]'));

                for (const line of lines) {
                    if (!line.startsWith('data:')) continue;
                    
                    try {
                        const json = JSON.parse(line.slice(5));
                        const content = json.choices[0].delta.content || '';
                        fullResponse += content;
                        
                        // Safely call the streaming callback
                        if (typeof onStream === 'function') {
                            onStream(fullResponse);
                        }
                    } catch (e) {
                        console.error('Error parsing chunk:', e);
                    }
                }
            }

            const npcResponse = {
                message: fullResponse,
                emotion: "happy",
                animation: "Talk"
            };

            this.addMessage('assistant', npcResponse.message);
            return npcResponse;

        } catch (error) {
            console.error('Error getting NPC response:', error);
            return {
                message: "Apologies, I seem to be having trouble communicating right now.",
                emotion: "confused",
                animation: "Idle"
            };
        }
    }

    /**
     * Clear chat history (keeps system prompt)
     */
    clearHistory() {
        this.messageHistory = [this.messageHistory[0]];
    }

    /**
     * Get current chat history
     * @returns {Message[]}
     */
    getHistory() {
        return this.messageHistory;
    }
}

// Create and export a singleton instance
const chatService = new ChatService();
export default chatService;