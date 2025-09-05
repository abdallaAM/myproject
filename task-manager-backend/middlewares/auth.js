const jwt = require('jsonwebtoken');
const db = require('../config/db'); 

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'التوكن مفقود' });

  jwt.verify(token, 'secretkey', (err, decoded) => {
    if (err) return res.status(403).json({ error: 'توكن غير صالح' });
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.userEmail = decoded.email;
    req.userName = decoded.name;
    req.userAvatar = decoded.avatar_url;
    next();
  });
};

const verifyAdmin = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'التوكن مفقود' });

  jwt.verify(token, 'secretkey', (err, decoded) => {
    if (err) return res.status(403).json({ error: 'توكن غير صالح' });

    db.query('SELECT role FROM users WHERE id = ?', [decoded.userId], (err, results) => {
      if (err || results.length === 0) return res.status(403).json({ error: 'المستخدم غير موجود' });
      if (results[0].role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
      next();
    });
  });
};

module.exports = {
  verifyToken,
  verifyAdmin
};
