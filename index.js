const express = require('express');
const app = express();
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const request = require('request');
const axios = require('axios');
const axiosRetry = require('axios-retry');

// load env variables
const GPT_MODE = process.env.GPT_MODE || 'CHAT';
const HISTORY_LENGTH = parseInt(process.env.HISTORY_LENGTH, 10) || 5;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME || 'gpt-3.5-turbo';

if (!OPENAI_API_KEY) {
    console.log('No OPENAI_API_KEY found. Please set it as an environment variable.');
    process.exit(1);
}

// init global variables
const MAX_LENGTH = 399;
let file_context = 'You are a helpful Twitch Chatbot.';
let last_user_message = '';

const messages = [{ role: 'system', content: 'You are a helpful Twitch Chatbot.' }];

console.log('GPT_MODE is ' + GPT_MODE);
console.log('History length is ' + HISTORY_LENGTH);
console.log('OpenAI API Key: ' + OPENAI_API_KEY);
console.log('Model Name: ' + MODEL_NAME);

app.use(express.json({ extended: true, limit: '1mb' });

app.all('/', (req, res) => {
    console.log('Just got a request!');
    res.send('Yo!');
});

if (GPT_MODE === 'CHAT') {
    readFile('./file_context.txt', 'utf8')
        .then(data => {
            console.log('Reading context file and adding it as a system-level message for the agent.');
            messages[0].content = data;
        })
        .catch(err => {
            console.error('Error reading context file:', err);
        });
} else {
    readFile('./file_context.txt', 'utf8')
        .then(data => {
            console.log('Reading context file and adding it in front of user prompts:');
            file_context = data;
            console.log(file_context);
        })
        .catch(err => {
            console.error('Error reading context file:', err);
        });
}

const openai = axios.create({
    baseURL: 'https://api.openai.com/v1',
    headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
});

// Configure axios-retry to automatically retry failed requests
axiosRetry(openai, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

app.get('/gpt/:text', async (req, res) => {
    const text = req.params.text;

    try {
        if (GPT_MODE === 'CHAT') {
            // Your code for handling GPT chat requests
            // ...

            const response = await openai.post('/completions', {
                model: MODEL_NAME,
                messages,
                temperature: 0.7,
                max_tokens: 256,
                top_p: 0.95,
                frequency_penalty: 0,
                presence_penalty: 0,
            });

            // Your response handling code
            // ...

        } else {
            // Your code for handling GPT prompt requests
            // ...

            const response = await openai.post('/completions', {
                model: 'text-davinci-003',
                prompt,
                temperature: 0.7,
                max_tokens: 256,
                top_p: 0.95,
                frequency_penalty: 0,
                presence_penalty: 0,
            });

            // Your response handling code
            // ...
        }
    } catch (error) {
        console.error('Error while handling GPT request:', error);
        res.status(500).send('Internal Server Error: Could not fulfill the request');
    }
});

app.all('/continue/', (req, res) => {
    console.log(last_user_message);
    console.log('Just got a continue request!');

    if (last_user_message.length > 0) {
        let new_user_message = last_user_message;
        if (last_user_message.length > MAX_LENGTH) {
            console.log('Agent answer exceeds twitch chat limit. Slicing to the first 399 characters.');
            new_user_message = last_user_message.slice(0, MAX_LENGTH);
        }
        last_user_message = last_user_message.slice(MAX_LENGTH);
        console.log('Sliced Agent answer: ' + last_user_message);
        res.send(new_user_message);
    } else {
        res.send('No message to continue. Please send a new message first.');
    }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
