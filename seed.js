require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const crypto = require('crypto');
const Admin = require('./models/Admin');

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;
const email = process.env.ADMIN_EMAIL;

if (!username || !password) {
  console.error('ADMIN_USERNAME / ADMIN_PASSWORD .env mein set karo');
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME || 'shopping-center' });
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  await Admin.updateOne(
    { username },
    { $set: { username, passwordHash, salt, email } },
    { upsert: true }
  );
  console.log('Admin user ready:', username);
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e.message); process.exit(1); });