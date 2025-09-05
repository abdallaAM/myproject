const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');

const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ربط قاعدة البيانات
require('dotenv').config(); 

// استيراد المسارات
app.use(require('./routes/authRoutes'));
app.use(require('./routes/profileRoutes'));
app.use(require('./routes/categoryRoutes'));
app.use(require('./routes/taskRoutes'));
app.use(require('./routes/adminRoutes'));

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
