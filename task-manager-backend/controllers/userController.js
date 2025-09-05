const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('❌ JWT_SECRET غير معرف في ملف البيئة (.env)');
}

exports.getProfile = (req, res) => {
  db.query(
    'SELECT id, name, email, avatar_url, role FROM users WHERE id = ?',
    [req.userId],
    (err, result) => {
      if (err || result.length === 0) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }
      res.json(result[0]);
    }
  );
};

exports.updateProfile = async (req, res) => {
  const { name, email, password } = req.body;
  let avatar_url = req.body.avatar_url;

  if (!name || !email) {
    return res.status(400).json({ error: 'الاسم والبريد مطلوبان' });
  }

  try {
    // أولاً: جلب المستخدم الحالي
    db.query('SELECT avatar_url FROM users WHERE id = ?', [req.userId], async (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      const currentAvatar = results[0].avatar_url;

      // ثانياً: تحديد avatar_url الجديد
      if (req.file) {
        const host = process.env.HOST || 'http://localhost';
        const port = process.env.PORT || 4000;
        avatar_url = `${host}:${port}/uploads/${req.file.filename}`;

        // حذف الصورة القديمة إن وُجدت
        if (currentAvatar) {
          const oldImagePath = path.join(__dirname, '../uploads', path.basename(currentAvatar));
          fs.unlink(oldImagePath, (err) => {
            if (err) console.error('⚠️ فشل حذف الصورة القديمة:', err);
            else console.log('🗑️ تم حذف الصورة القديمة');
          });
        }
      } else if (avatar_url === '') {
        // إذا تم إرسال avatar_url فارغ → حذف الصورة من السيرفر وقاعدة البيانات
        if (currentAvatar) {
          const oldImagePath = path.join(__dirname, '../uploads', path.basename(currentAvatar));
          fs.unlink(oldImagePath, (err) => {
            if (err) console.error('⚠️ فشل حذف الصورة:', err);
            else console.log('🗑️ تم حذف الصورة');
          });
        }
        avatar_url = null;
      }

      // ثالثاً: إعداد الاستعلام للتحديث
      let query = 'UPDATE users SET name = ?, email = ?, avatar_url = ?';
      const params = [name, email, avatar_url];

      if (password?.trim()) {
        const hashed = await bcrypt.hash(password, 10);
        query += ', password = ?';
        params.push(hashed);
      }

      query += ' WHERE id = ?';
      params.push(req.userId);

      // رابعاً: تنفيذ التحديث
      db.query(query, params, (err) => {
        if (err) return res.status(500).json({ error: 'حدث خطأ أثناء تحديث البيانات' });

        const newToken = jwt.sign(
          {
            userId: req.userId,
            role: req.userRole,
            email,
            name,
            avatar_url
          },
          secret,
          { expiresIn: '7d' }
        );

        res.json({ message: 'تم التحديث بنجاح', token: newToken });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ غير متوقع' });
  }
};
