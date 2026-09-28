require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');
const Admin = require('./models/Admin');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const MONGO_URI = (process.env.MONGO_URI || '').trim();
const MONGO_DB_NAME = (process.env.MONGO_DB_NAME || 'shopping-center').trim();

if (!MONGO_URI || MONGO_URI === 'mongodb+srv://USER:PASSWORD@cluster0.XXXXXX.mongodb.net') {
  console.error('MONGO_URI missing in .env — apna naya connection string .env mein MONGO_URI ke aage paste karo.');
} else {
  mongoose.connect(MONGO_URI, { dbName: MONGO_DB_NAME })
    .then(() => console.log('MongoDB Atlas connected'))
    .catch((err) => { console.error('MongoDB connection failed:', err.message); });
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

async function sendBrevoEmail({ name, email, message }) {
  const url = 'https://api.brevo.com/v3/smtp/email';
  const payload = {
    sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME },
    to: [{ email: process.env.BREVO_TO_EMAIL }],
    replyTo: { email: email, name: name },
    subject: `New message from ${name}`,
    htmlContent: `<h3>New contact message</h3>
      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Message:</b> ${message}</p>`
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Brevo failed: ' + res.status);
}

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }
  try {
    try { await sendBrevoEmail({ name, email, message }); }
    catch (e) { console.error('Email not sent:', e.message); }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { user, pass } = req.body || {};
  if (!user || !pass) return res.json({ success: false, error: 'Missing fields' });
  try {
    const admin = await Admin.findOne({ username: user });
    if (!admin) return res.json({ success: false, error: 'Invalid credentials' });
    const check = hashPassword(pass, admin.salt);
    if (check !== admin.passwordHash) return res.json({ success: false, error: 'Invalid credentials' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));