const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/logicore';

async function main() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB!');

  const newPassword = 'Finance@123';
  const hashed = await bcrypt.hash(newPassword, 10);

  const result = await mongoose.connection.db.collection('users').updateOne(
    { email: 'ezz2026@gmail.com' },
    { $set: { password: hashed, isActive: true } }
  );

  console.log('Update result:', result.modifiedCount, 'document(s) updated');
  console.log('Password for ezz2026@gmail.com has been reset to: Finance@123');

  // Also check all finance dept users
  const financeUsers = await mongoose.connection.db.collection('users').find({
    role: { $in: ['FINANCE_MANAGER', 'ACCOUNTANT', 'FINANCE_AGENT'] }
  }).toArray();
  
  console.log('\nAll finance role users:');
  financeUsers.forEach(u => {
    console.log(`  - ${u.email} | role: ${u.role} | isActive: ${u.isActive} | hasPassword: ${!!u.password}`);
  });

  await mongoose.disconnect();
  console.log('\nDone!');
}

main().catch(console.error);
