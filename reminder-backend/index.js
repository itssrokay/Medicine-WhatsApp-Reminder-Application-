require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');


// App config
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Suppress Mongoose strictQuery warning
mongoose.set('strictQuery', true);

// DB config
mongoose.connect(
  'mongodb://localhost:27017/reminderAppDB',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => console.log('DB connected')
);

const reminderSchema = new mongoose.Schema({
  reminderMsg: String,
  remindAt: String,
  isReminded: Boolean,
});

const Reminder = new mongoose.model('reminder', reminderSchema);

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// OpenAI config
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// API routes
app.get('/getAllReminder', (req, res) => {
  Reminder.find({}, (err, reminderList) => {
    if (err) {
      console.log(err);
      res.status(500).send('Error fetching reminders');
    } else {
      res.send(reminderList);
    }
  });
});

app.post('/generateReminder', upload.single('photo'), async (req, res) => {
  const photoPath = req.file.path;

  try {
    // Upload the image to OpenAI's API to get the file ID
    const fileResponse = await openai.files.create({
      purpose: 'vision',
      file: fs.createReadStream(photoPath)
    });

    const fileId = fileResponse.id;

    // Use OpenAI to generate reminder message and time
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: "I will send you a photo that contains handwritten reminder name and date and time. You have to return JSON type, example:\n{\n  \"reminderMsg\": \"Test Reminder\",\n  \"remindAt\": \"2024-07-01T18:30:00.000Z\"\n}\n"
            },
            {
              type: 'image_file',
              image_file: {
                file_id: fileId,
                purpose: 'vision'
              }
            }
          ]
        }
      ],
      temperature: 1,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    let result;
    try {
      console.log(response.choices[0]);
      //result = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return res.status(500).send('Error parsing response from OpenAI');
    }

    res.send(result);
  } catch (error) {
    console.error('Error generating reminder:', error);
    res.status(500).send('Error generating reminder');
  }
});


app.post('/addReminder', (req, res) => {
  const { reminderMsg, remindAt } = req.body;
  const reminder = new Reminder({
    reminderMsg,
    remindAt,
    isReminded: false,
  });
  reminder.save((err, savedReminder) => {
    if (err) {
      console.log(err);
      res.status(500).send('Error saving reminder');
    } else {
      Reminder.find({}, (err, reminderList) => {
        if (err) {
          console.log(err);
          res.status(500).send('Error fetching reminders');
        } else {
          res.send(reminderList);
        }
      });
    }
  });
});

app.post('/deleteReminder', (req, res) => {
  Reminder.deleteOne({ _id: req.body.id }, (err) => {
    if (err) {
      console.log(err);
      res.status(500).send('Error deleting reminder');
    } else {
      Reminder.find({}, (err, reminderList) => {
        if (err) {
          console.log(err);
          res.status(500).send('Error fetching reminders');
        } else {
          res.send(reminderList);
        }
      });
    }
  });
});

// Existing reminder checking functionality
setInterval(() => {
  Reminder.find({}, (err, reminderList) => {
    if (err) {
      console.log(err);
    }
    if (reminderList) {
      reminderList.forEach((reminder) => {
        if (!reminder.isReminded) {
          const now = new Date();
          if (new Date(reminder.remindAt) - now < 0) {
            Reminder.findByIdAndUpdate(
              reminder.id,
              { isReminded: true },
              (err, remindObj) => {
                if (err) {
                  console.log(err);
                }
                // Whatsapp reminding functionality by Twilio
                const accountSid = process.env.ACCOUNT_SID;
                const authToken = process.env.AUTH_TOKEN;
                const client = require('twilio')(accountSid, authToken);

                client.messages
                  .create({
                    body: reminder.reminderMsg,
                    from: 'whatsapp:+14155238886',
                    to: 'whatsapp:+917033762468',
                  })
                  .then((message) => console.log(message.sid))
                  .done();
              }
            );
          }
        }
      });
    }
  });
}, 1000);

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));