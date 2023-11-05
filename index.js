const express = require('express');
const request = require('request'); // Use the 'request' library
const app = express();
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);

// Your existing code for environment variables and initializations

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

app.get('/gpt/:text', (req, res) => {
    const text = req.params.text;

    if (GPT_MODE === 'CHAT') {
        // Your code for handling GPT chat requests

        const requestOptions = {
            uri: 'https://api.openai.com/v1/completions',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            json: {
                model: MODEL_NAME,
                messages,
                temperature: 0.7,
                max_tokens: 256,
                top_p: 0.95,
                frequency_penalty: 0,
                presence_penalty: 0,
            },
        };

        request(requestOptions, (error, response, body) => {
            if (error) {
                console.error('Error while making OpenAI API request:', error);
                res.status(500).send('Internal Server Error: Could not fulfill the request');
            } else {
                // Your response handling code
                // ...
            }
        });
    } else {
        // Your code for handling GPT prompt requests
        // ...

        const requestOptions = {
            uri: 'https://api.openai.com/v1/completions',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            json: {
                model: 'text-davinci-003',
                prompt,
                temperature: 0.7,
                max_tokens: 256,
                top_p: 0.95,
                frequency_penalty: 0,
                presence_penalty: 0,
            };

            request(requestOptions, (error, response, body) => {
                if (error) {
                    console.error('Error while making OpenAI API request:', error);
                    res.status(500).send('Internal Server Error: Could not fulfill the request');
                } else {
                    // Your response handling code
                    // ...
                }
            });
        }
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
