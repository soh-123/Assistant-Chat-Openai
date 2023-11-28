const OpenAI = require("openai").default
const dotenv = require('dotenv')
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

// --------------- Configurations ---------------
dotenv.config()

const app = express()
app.use(express.json())
app.use(cors())

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

// --------------- MongoDB ---------------
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Connected to DB and Listening to request on port ${process.env.PORT}`)
        })
    })
    .catch((error) => {
        console.error(error)
    })

const chatSchema = new mongoose.Schema({
    messages: [{ role: String, content: String }]
})
const Chat = mongoose.model('Chat', chatSchema)

// --------------- Endpoint to handle conversation ---------------
app.post('/openai/chat', async (req, res) => {

    const { userInput, conversationId } = req.body

    try{
        // Retrieve or create a new conversation
        let chat;
        if (conversationId) {
            chat = await Chat.findById(conversationId);
        } else {
            chat = new Chat({ messages: [] });
        }

        // Use openai to get the answer
        const roadmap = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{
                role: 'user', 
                content: `Come up with a roadmap to ${userInput}`
            }]
        })

        // append use input to the database
        chat.messages.push({ 
            role: "user",
            content: userInput
        }) 

        // append ai respond to the conversation
        const aiMessage = roadmap.choices[0].message.content
        chat.messages.push({
            role: 'system',
            content: aiMessage
        })

        await chat.save()

        res.status(200).json({aiMessage, chatId: chat._id})

    }catch(error){
        res.status(400).json({ error: 'Error processing your request', details: error.message})
    }
})

