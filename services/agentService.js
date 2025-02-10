const { OpenAI } = require("openai");
const axios = require("axios");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Executes AI agent queries.
 * The AI can fetch live data or perform actions based on query.
 */
async function executeAgentQuery(query) {
    try {
        console.log(`🤖 AI Agent received query: ${query}`);

        // First, check if the query requires an API call
        const apiResponse = await handleAPIActions(query);
        if (apiResponse) {
            return apiResponse;
        }

        // Otherwise, use OpenAI to generate a response
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: query }],
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error("❌ Agent Execution Error:", error);
        return "⚠️ Error: AI agent failed to process.";
    }
}

/**
 * Handles predefined API-based actions for real-world automation.
 */
async function handleAPIActions(query) {
    if (query.toLowerCase().includes("weather")) {
        return await getWeather(query);
    }
    if (query.toLowerCase().includes("stock price")) {
        return await getStockPrice(query);
    }
    if (query.toLowerCase().includes("restaurant")) {
        return await getRestaurants(query);
    }
    return null; // No predefined API action found
}

/**
 * Fetches live weather data based on user input.
 */
async function getWeather(query) {
    const location = extractLocation(query);
    if (!location) return "⚠️ Please specify a location for weather updates.";

    const apiKey = process.env.WEATHER_API_KEY;
    const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${location}`;

    try {
        const res = await axios.get(url);
        return `🌤️ Weather in ${location}: ${res.data.current.temp_c}°C, ${res.data.current.condition.text}`;
    } catch (error) {
        console.error("❌ Weather API Error:", error);
        return "⚠️ Unable to fetch weather data.";
    }
}

/**
 * Fetches stock prices based on user input.
 */
async function getStockPrice(query) {
    const stockSymbol = extractStockSymbol(query);
    if (!stockSymbol) return "⚠️ Please specify a stock symbol.";

    const apiKey = process.env.STOCK_API_KEY;
    const url = `https://api.twelvedata.com/price?symbol=${stockSymbol}&apikey=${apiKey}`;

    try {
        const res = await axios.get(url);
        return `📈 Stock Price of ${stockSymbol}: $${res.data.price}`;
    } catch (error) {
        console.error("❌ Stock API Error:", error);
        return "⚠️ Unable to fetch stock prices.";
    }
}

/**
 * Fetches restaurant recommendations based on user query.
 */
async function getRestaurants(query) {
    const location = extractLocation(query);
    if (!location) return "⚠️ Please specify a location for restaurant search.";

    const apiKey = process.env.ZOMATO_API_KEY;
    const url = `https://developers.zomato.com/api/v2.1/search?q=${location}`;

    try {
        const res = await axios.get(url, {
            headers: { "user-key": apiKey },
        });

        if (res.data.restaurants.length === 0) {
            return "🍽️ No restaurants found in this area.";
        }

        return `🍽️ Recommended restaurant in ${location}: ${res.data.restaurants[0].restaurant.name}`;
    } catch (error) {
        console.error("❌ Zomato API Error:", error);
        return "⚠️ Unable to fetch restaurant details.";
    }
}

/**
 * Extracts a location from the user query.
 */
function extractLocation(query) {
    const match = query.match(/(?:in|at|near)\s([a-zA-Z\s]+)/);
    return match ? match[1].trim() : null;
}

/**
 * Extracts a stock symbol from the user query.
 */
function extractStockSymbol(query) {
    const match = query.match(/\b[A-Z]{2,5}\b/);
    return match ? match[0] : null;
}

module.exports = { executeAgentQuery };
