const jwt = require('jsonwebtoken');
const db = require('../config/db');

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('❌ JWT_SECRET غير معرف في ملف البيئة (.env)');
}

// دالة فك التوكن
const decodeToken = (req) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return null;

  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
};

// ✅ التحقق العام
const verifyToken = (req, res, next) => {
  const decoded = decodeToken(req);
  if (!decoded) return res.status(403).json({ error: 'توكن غير صالح أو مفقود' });

  req.userId = decoded.userId;
  req.userRole = decoded.role;
  req.userEmail = decoded.email;
  req.userName = decoded.name;
  req.userAvatar = decoded.avatar_url;
  next();
};

// ✅ التحقق من صلاحيات المسؤول أو المالك (مع جلب الدور من قاعدة البيانات)
const verifyAdmin = (req, res, next) => {
  const decoded = decodeToken(req);
  if (!decoded) return res.status(403).json({ error: 'توكن غير صالح أو مفقود' });

  const userId = decoded.userId;

  // جلب الدور الحقيقي من قاعدة البيانات وليس من التوكن فقط
  db.query('SELECT role, email, name, avatar_url FROM users WHERE id = ?', [userId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(403).json({ error: 'المستخدم غير موجود' });
    }

    const user = results[0];

    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: 'صلاحية غير كافية' });
    }

    // حفظ البيانات بعد التأكد من الدور
    req.userId = userId;
    req.userRole = user.role;
    req.userEmail = user.email;
    req.userName = user.name;
    req.userAvatar = user.avatar_url;

    next();
  });
};

module.exports = {
  verifyToken,
  verifyAdmin
};
