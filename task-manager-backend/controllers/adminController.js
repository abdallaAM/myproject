const db = require('../config/db');
const bcrypt = require('bcryptjs');

// ✅ جلب كل المستخدمين
exports.getAllUsers = (req, res) => {
  db.query(
    'SELECT id, email, name, avatar_url, role, is_active FROM users',
    (err, results) => {
      if (err) return res.status(500).json({ error: 'خطأ في جلب المستخدمين' });
      res.json(results);
    }
  );
};

// ✅ حذف مستخدم مع التحقق من الصلاحيات
exports.deleteUser = (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const currentUserId = req.userId;
  const currentUserRole = req.userRole;

  if (!currentUserId || !currentUserRole) {
    return res.status(403).json({ error: 'غير مصرح' });
  }

  if (targetUserId === currentUserId) {
    return res.status(400).json({ error: '❌ لا يمكنك حذف نفسك' });
  }

  db.query('SELECT role FROM users WHERE id = ?', [targetUserId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const targetUserRole = results[0].role;

    if (targetUserRole === 'admin' && currentUserRole !== 'owner') {
      return res.status(403).json({ error: '❌ فقط المالك يمكنه حذف المسؤول' });
    }

    db.query('DELETE FROM users WHERE id = ?', [targetUserId], (err) => {
      if (err) {
        console.error('🔥 خطأ أثناء الحذف:', err);
        return res.status(500).json({ error: 'فشل في الحذف' });
      }
      res.json({ message: '✅ تم حذف المستخدم' });
    });
  });
};

// إنزال رتبة admin إلى user (فقط للمالك)
exports.demoteUser = (req, res) => {
  const id = req.params.id;

  if (req.userRole !== 'owner') {
    return res.status(403).json({ error: '❌ فقط المالك يمكنه إنزال رتبة المستخدم' });
  }

  db.query('SELECT role FROM users WHERE id = ?', [id], (err, result) => {
    if (err || result.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const targetRole = result[0].role;

    if (targetRole !== 'admin') {
      return res.status(400).json({ error: '👤 المستخدم ليس مسؤولاً ليتم إنزاله' });
    }

    db.query('UPDATE users SET role = "user" WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: 'فشل الإنزال' });
      res.json({ message: '✅ تم إنزال رتبة المستخدم إلى مستخدم عادي' });
    });
  });
};

// ✅ تحديث بيانات مستخدم
exports.updateUser = async (req, res) => {
  const { email, password, name, avatar_url } = req.body;
  const userId = req.params.id;

  if (!email || !name) return res.status(400).json({ error: 'البيانات ناقصة' });

  db.query('SELECT role FROM users WHERE id = ?', [userId], async (err, result) => {
    if (err || result.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });

    const targetRole = result[0].role;
    const isOwner = targetRole === 'owner';

    if (isOwner && req.userRole !== 'owner') {
      return res.status(403).json({ error: '❌ لا يمكن تعديل بيانات المالك' });
    }

    const baseQuery = password?.trim()
      ? 'UPDATE users SET email = ?, password = ?, name = ?, avatar_url = ? WHERE id = ?'
      : 'UPDATE users SET email = ?, name = ?, avatar_url = ? WHERE id = ?';

    const values = password?.trim()
      ? [email, await bcrypt.hash(password, 10), name, avatar_url || null, userId]
      : [email, name, avatar_url || null, userId];

    db.query(baseQuery, values, (err) => {
      if (err) return res.status(500).json({ error: 'فشل التحديث' });
      res.json({ message: 'تم التحديث بنجاح' });
    });
  });
};

// ✅ ترقية مستخدم إلى admin (مسموح فقط للمالك)
exports.promoteUser = (req, res) => {
  const id = req.params.id;

  if (req.userRole !== 'owner') {
    return res.status(403).json({ error: '🔒 فقط المالك يمكنه الترقية إلى مسؤول' });
  }

  db.query('UPDATE users SET role = "admin" WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'فشل الترقية' });
    res.json({ message: '✅ تم ترقية المستخدم إلى مسؤول' });
  });
};

// ✅ تفعيل أو تعطيل مستخدم (فقط المالك يمكنه تعطيل owner)
exports.toggleActive = (req, res) => {
  const { isActive } = req.body;
  const id = req.params.id;

  db.query('SELECT role FROM users WHERE id = ?', [id], (err, result) => {
    if (err || result.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });

    const targetRole = result[0].role;

    if (targetRole === 'owner' && req.userRole !== 'owner') {
      return res.status(403).json({ error: '❌ لا يمكن تعديل حالة المالك إلا من قبل المالك نفسه' });
    }

    db.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive, id], (err) => {
      if (err) return res.status(500).json({ error: 'فشل التحديث' });
      res.json({ message: '✅ تم تغيير حالة المستخدم' });
    });
  });
};
