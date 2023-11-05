const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs').promises;
const axios = require('axios');
const axiosRetry = require('axios-retry');

const app = express();
const port = process.env.PORT || 3000;

const MAX_LENGTH = 399;

// Environment variables
const GPT_MODE = process.env.GPT_MODE || 'CHAT';
const HISTORY_LENGTH = parseInt(process.env.HISTORY_LENGTH, 10) || 5;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME || 'gpt-3.5-turbo';

const messages = [{ role: 'system', content: 'You are a helpful Twitch Chatbot.' }];
let file_context = 'You are a helpful Twitch Chatbot.';
let last_user_message = '';

async function readContextFile() {
  try {
    const data = await fs.readFile('./file_context.txt', 'utf8');
    console.log('Reading context file and adding it as a system-level message for the agent.');
    messages[0].content = data;
  } catch (err) {
    console.error('Error reading context file:', err);
  }
}

async function processChatRequest(text, res, openai) {
  messages.push({ role: 'user', content: text });

  if (messages.length > (HISTORY_LENGTH * 2 + 1)) {
    messages.splice(1, 2);
  }

  console.log('Messages:');
  console.dir(messages);
  console.log('User Input: ' + text);

  const response = await openai.createChatCompletion({
    model: MODEL_NAME,
    messages,
    temperature: 0.7,
    max_tokens: 256,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  if (response.data.choices) {
    let agent_response = response.data.choices[0].message.content;

    console.log('Agent answer: ' + agent_response);
    messages.push({ role: 'assistant', content: agent_response });

    let sliced_agent_response = agent_response.slice(0, MAX_LENGTH);
    last_user_message = agent_response.slice(MAX_LENGTH);
    res.send(sliced_agent_response);
  } else {
    res.send('Something went wrong. Try again later!');
  }
}

async function processPromptRequest(text, res, openai) {
  const prompt = `${file_context}\n\nQ:${text}\nA:`;

  console.log('User Input: ' + text);

  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt,
    temperature: 0.7,
    max_tokens: 256,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
const openai = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  },
});

// Configure axios-retry to automatically retry failed requests
axiosRetry(openai, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

// Use openai for making API requests
  
  if (response.data.choices) {
    let agent_response = response.data.choices[0].text;
    console.log('Agent answer: ' + agent_response);

    let sliced_agent_response = agent_response.slice(0, MAX_LENGTH);
    last_user_message = agent_response.slice(MAX_LENGTH);
    res.send(sliced_agent_response);
  } else {
    res.send('Something went wrong. Try again later!');
  }
}

app.use(express.json({ extended: true, limit: '1mb' }));

app.all('/', (req, res) => {
  console.log('Just got a request!');
  res.send('Yo!');
});

if (GPT_MODE === 'CHAT') {
  readContextFile();
} else {
  readContextFile().then(() => {
    console.log('Reading context file and adding it in front of user prompts:');
    file_context = data;
    console.log(file_context);
  });
}

app.get('/gpt/:text', async (req, res) => {
  const text = req.params.text;
  const configuration = new Configuration({
    apiKey: OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  if (GPT_MODE === 'CHAT') {
    processChatRequest(text, res, openai);
  } else {
    processPromptRequest(text, res, openai);
  }
});

app.all('/continue/', (req, res) => {
  if (last_user_message.length > 0) {
    let new_user_message = last_user_message.slice(0, MAX_LENGTH);
    last_user_message = last_user_message.slice(MAX_LENGTH);
    res.send(new_user_message);
  } else {
    res.send('No message to continue. Please send a new message first.');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
