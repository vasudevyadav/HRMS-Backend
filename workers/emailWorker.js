// emailWorker.js
const Bull = require('bull');
const Redis = require('ioredis');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const dayjs = require('dayjs');

const { generatePdfFromEjs } = require('../middleware/pdfGenerator');
const { sendEmail } = require('../helpers/emailService');
const User = require('../model/user');
const salaryRecordModel = require('../model/salary-record.model');
const department = require('../model/department');
const { cryptoFUN } = require('../helpers/function');

// Create Redis connection for monitoring only
const redisMonitor = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

redisMonitor.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

redisMonitor.on('connect', () => {
  console.log('✅ Worker Redis connected');
});

// Create the queue
const salarySlipQueue = new Bull('send-salary-slip', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// 👇 All logic must be inside this async processor
salarySlipQueue.process('send-salary-slip', async (job) => {
  console.log('📥 Processing job:', job.id, job.data);

  const {
    userId, month, year
  } = job.data;
  const monthName = dayjs().month(month - 1).format('MMMM');

  const employee = await User.findById(userId).lean();
  if (!employee) return;
  employee.primaryEmail = cryptoFUN(
    employee.primaryEmail,
    'decrypt'
  );
  console.log('====================================');
  console.log('employee.primaryEmail',employee.primaryEmail);
  console.log('====================================');
  const employeeSalaryData = await salaryRecordModel.findOne({
    userId,
    salaryMonth: month,
    salaryYear: year,
  }).lean();
  if (!employeeSalaryData?.data) return;

  const employeeSalaryRecord = {
    salaryMonth: monthName,
    salaryYear: year,
    ...employeeSalaryData.data,
  };

  const outputFileName = `Payslip-${employeeSalaryRecord.EmployeeName}-${monthName}-${year}.pdf`;
  const pdfBuffer = await generatePdfFromEjs('salarySlipAttachment', { data: employeeSalaryRecord }, outputFileName);

  const startDate = dayjs(`${year}-${month}-01`).format('DD-MM-YYYY');
  const endDate = dayjs(`${year}-${month}-01`).endOf('month').format('DD-MM-YYYY');
  const departmentData = await department.findById(employee.departmentId).lean();

  const templatePath = path.join(__dirname, '../views/templates/salary-slip-email.ejs');
  const htmlTemplate = ejs.render(
    fs.readFileSync(templatePath, 'utf8'),
    {
      username: `${employee.firstName} ${employee.lastName}`,
      employeeCode: employee.employeeCode,
      department: departmentData?.departmentName || 'N/A',
      paymentPeriod: `${startDate} - ${endDate}`,
      paymentDate: dayjs().format('DD-MM-YYYY'),
      finalAmount: employeeSalaryData.data.netPayable,
    }
  );
  const mailOptions = {
    from: process.env.EMAIL_HOST_USER,
    // to: employee.primaryEmail || 'rahulmehra66293@gmail.com',
    to: 'rahulmehra66293@gmail.com',
    subject: `Gohashinclude - ${monthName} ${year} Salary Slip`,
    html: htmlTemplate,
    attachments: [{
      filename: outputFileName,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  };

  await sendEmail(mailOptions);
  console.log(`✅ Email sent to ${employee.email || 'rahulmehra66293@gmail.com'}`);
});

// Job event handlers
salarySlipQueue.on('completed', (job) => {
  console.log(`🎉 Job completed: ${job.id}`);
});

salarySlipQueue.on('failed', (job, err) => {
  console.error(`❌ Job failed: ${job.id}`, err);
});
