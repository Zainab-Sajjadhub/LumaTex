// This server file creates the backend for LumaText. 
// It uses Express to handle HTTP requests,allows cross-origin access with CORS, and connects to Google's Gemini AI for generating summaries or answering questions. 
// The server listens for text uploads from the user, sends them to Gemini for summarization, and returns the results. 
// It includes better error handling to manage missing input, API errors, and other server problems, making the system more stable and user-friendly.
// server.js (REVISED - Enhanced Error Handling)
const express = require('express');
const cors = require('cors');
const multer = require('multer'); // For handling file uploads - REMOVE FROM SUMMARIZER
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');   // Import axios

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Handles JSON request bodies
// Initialize Gemini API
let genAI;
try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("Gemini API initialized successfully.");
} catch (error) {
    console.error("Error initializing Gemini API:", error);
    console.error("Make sure you have a .env file with a GEMINI_API_KEY");
    process.exit(1);
}

// Function to generate response from Gemini API
async function generateResponse(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Error while generating response from Gemini:", error);
        throw new Error("Error with Gemini API: " + error.message);
    }
}

// API endpoint for text summarization (Using Gemini)
app.post('/summarize-text', async (req, res) => {
    console.log("Request to /summarize-text received:", req.body);   // Log the request
    const text = req.body.text;

    if (!text) {
        console.warn("No text received in the summarization request.");
        return res.status(400).send({ error: "Text is required for summarization." });
    }

    try {
        // Construct prompt for Gemini API
        const prompt = `Summarize the following text: ${text}`;
        console.log("Sending prompt to Gemini:", prompt); // Log the prompt

        const summary = await generateResponse(prompt);
        console.log("Gemini Summary:", summary); // Log the summary from Gemini

        res.json({ summary: summary });

    } catch (error) {
        console.error("Error during summarization:", error);
        console.error("Error details:", error.response ? error.response.data : error.message);   // Log the detailed error
        res.status(500).send({ error: "Failed to generate summary. Check server logs for details." });
    }
});

// API endpoint for handling resume tips request - REMOVE FROM SUMMARIZER
app.post('/api/chat', async (req, res) => {
    console.log("Request received at /api/chat");
    try {
        console.log("Request body:", req.body);

        const userQuestion = req.body.question;

        if (!userQuestion) {
            console.log("Error: Question is missing");
            return res.status(400).json({ error: 'Question is required' });
        }

        let aiResponse;

        try {
            aiResponse = await generateResponse(userQuestion);
            console.log("AI Response:", aiResponse);
        } catch (geminiError) {
            console.error("Gemini API Error:", geminiError);
            return res.status(500).json({ error: "Failed to generate response from Gemini: " + geminiError.message });
        }

        res.json({ response: aiResponse });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: error.message || "Failed to generate response." });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});