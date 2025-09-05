const multer = require('multer');
const path = require('path');
const fs = require('fs');

// مجلد التخزين
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// إعدادات التخزين
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `avatar_${req.userId || 'anon'}_${Date.now()}${ext}`;
    cb(null, name);
  }
});

// الفلتر: قبول الصور فقط
const fileFilter = (req, file, cb) => {
  const allowed = ['.png', '.jpg', '.jpeg', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. يسمح فقط بالصور.'));
  }
};

// قيود الحجم: 2 ميجا
const limits = { fileSize: 2 * 1024 * 1024 }; 

const upload = multer({ storage, fileFilter, limits });

module.exports = upload;
