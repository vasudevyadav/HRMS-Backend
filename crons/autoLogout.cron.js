const cron = require('node-cron');
const dbService = require('../utils/dbService');
const attendance = require('../model/attendance');

// Run every day at 12:00 AM
console.log('✅ autoLogout.cron.js loaded');

cron.schedule('0 0 * * *', async () => {
  try {
    console.log('⏰ Cron running every minute for testing');
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const unattended = await dbService.findMany(attendance, {
      checkOutTime: null,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay 
      },
    });

    for (const record of unattended) {
      record.checkOutTime = new Date();
      record.autoCheckedOut = true; // 👈 this marks it as automatic
      await record.save();
    }
    console.log(`✅ Auto-logout completed at ${new Date().toLocaleString()}`);
  } catch (err) {
    console.error('❌ Error in auto-logout cron:', err);
  }
});
