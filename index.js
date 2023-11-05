const express = require('express');
const request = require('request');
const fs = require('fs');
const { promisify } = require('util');
const { Configuration, OpenAIApi } = require('openai');
const app = express();

// Load environment variables with default values
const GPT_MODE = process.env.GPT_MODE || 'CHAT';
const HISTORY_LENGTH = parseInt(process.env.HISTORY_LENGTH) || 5;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME || 'gpt-3.5-turbo';

if (!OPENAI_API_KEY) {
    console.log('No OPENAI_API_KEY found. Please set it as an environment variable.');
    process.exit(1); // Exit the app if API key is missing
}

// Initialize global variables
const MAX_LENGTH = 399;
let fileContext = 'You are a helpful Twitch Chatbot.';
let lastUserMessage = '';

const messages = [{ role: 'system', content: fileContext }];

console.log('GPT_MODE is ' + GPT_MODE);
console.log('History length is ' + HISTORY_LENGTH);
console.log('OpenAI API Key: ' + OPENAI_API_KEY);
console.log('Model Name: ' + MODEL_NAME);

app.use(express.json({ extended: true, limit: '1mb' }));

app.all('/', (req, res) => {
    console.log('Just got a request!');
    res.send('Yo!');
});

if (GPT_MODE === 'CHAT') {
    fs.readFile('./file_context.txt', 'utf8', (err, data) => {
        if (!err) {
            console.log('Reading context file and adding it as a system-level message for the agent.');
            messages[0].content = data;
        } else {
            console.error('Error reading file_context.txt:', err);
        }
    });
} else {
    fs.readFile('./file_context.txt', 'utf8', (err, data) => {
        if (!err) {
            console.log('Reading context file and adding it in front of user prompts:');
            fileContext = data;
            console.log(fileContext);
        } else {
            console.error('Error reading file_context.txt:', err);
        }
    });
}

app.get('/gpt/:text', async (req, res) => {
    const text = req.params.text;
    const configuration = new Configuration({
        apiKey: OPENAI_API_KEY,
    });

    const openai = new OpenAIApi(configuration);

    if (GPT_MODE === 'CHAT') {
        // CHAT MODE EXECUTION
        messages.push({ role: 'user', content: text);

        if (messages.length > HISTORY_LENGTH * 2 + 1) {
            console.log('Message amount in history exceeded. Removing oldest user and agent messages.');
            messages.splice(1, 2);
        }

        console.log('Conversations in History: ' + (messages.length / 2 - 1) + '/' + HISTORY_LENGTH);
        console.log('Messages:');
        console.dir(messages);
        console.log('User Input: ' + text);

        const response = await openai.createChatCompletion({
            model: MODEL_NAME,
            messages: messages,
            temperature: 0.7,
            max_tokens: 256,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
        });

        if (response.data.choices) {
            let agentResponse = response.data.choices[0].message.content;
            messages.push({ role: 'assistant', content: agentResponse);

            let slicedAgentResponse = agentResponse.slice(0, MAX_LENGTH);

            if (agentResponse.length > MAX_LENGTH) {
                console.log('Agent answer exceeds Twitch chat limit. Slicing to first 399 characters.');
                lastUserMessage = agentResponse.slice(MAX_LENGTH);
                console.log('Sliced Agent answer: ' + agentResponse);
            }
            res.send(slicedAgentResponse);
        } else {
            res.send('Something went wrong. Try again later!');
        }
    } else {
        // PROMPT MODE EXECUTION
        const prompt = `${fileContext}\n\nQ:${text}\nA:`;
        console.log('User Input: ' + text);

        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: prompt,
            temperature: 0.7,
            max_tokens: 256,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
        });

        if (response.data.choices) {
            let agentResponse = response.data.choices[0].text;

            let slicedAgentResponse = agentResponse.slice(0, MAX_LENGTH);

            if (agentResponse.length > MAX_LENGTH) {
                console.log('Agent answer exceeds Twitch chat limit. Slicing to first 399 characters.');
                lastUserMessage = agentResponse.slice(MAX_LENGTH);
                console.log('Sliced Agent answer: ' + agentResponse);
            }
            res.send(slicedAgentResponse);
        } else {
            res.send('Something went wrong. Try again later!');
        }
    }
});

app.all('/continue/', (req, res) => {
    console.log(lastUserMessage);
    console.log('Just got a continue request!');

    if (lastUserMessage.length > 0) {
        let newuserMessage = lastUserMessage.slice(0, MAX_LENGTH);
        lastUserMessage = lastUserMessage.slice(MAX_LENGTH);

        console.log('Sliced Agent answer: ' + lastUserMessage);
        res.send(newuserMessage);
    } else {
        res.send('No message to continue. Please send a new message first.');
    }
});

app.listen(process.env.PORT || 3000);
