require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
// const fs = require('fs');
const { OpenAI } = require('openai');
const fs = require('fs').promises;

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
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb("Error: Images Only!");
    }
  }
});

// OpenAI config
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

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
  console.log("Received request to generate reminder");
  if (req.file) {
    console.log("File received:", req.file);
    try {
      // Read the file and convert it to base64
      const imageBuffer = await fs.readFile(req.file.path);
      const base64Image = imageBuffer.toString('base64');

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Analyze the image and extract the reminder message and date/time. Return a JSON object with 'reminderMsg' and 'remindAt' fields. The 'remindAt' should be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ). If the year is not specified, assume the current year. If the time is not specified, assume 09:00 AM. Return ONLY the JSON object, without any markdown formatting or additional text." 
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/${req.file.mimetype};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 300
      });

      console.log("OpenAI Response:", response.choices[0].message.content);

      // Remove any non-JSON characters and parse the response
      const jsonString = response.choices[0].message.content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const reminderData = JSON.parse(jsonString);

      // Delete the uploaded file after processing
      await fs.unlink(req.file.path);

      res.json({
        message: "Reminder generated",
        reminder: reminderData
      });

    } catch (error) {
      console.error("Error processing image with OpenAI:", error);
      res.status(500).send("Error processing image");
    }
  } else {
    console.log("No file received");
    res.status(400).send('Image upload failed!');
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