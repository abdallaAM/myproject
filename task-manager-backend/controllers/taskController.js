const db = require('../config/db');

const formatDateForMySQL = (date) =>
  new Date(date).toISOString().slice(0, 19).replace('T', ' ');

// جلب جميع المهام
exports.getTasks = (req, res) => {
  const uid = parseInt(req.params.userId);
  if (uid !== req.userId) return res.status(403).json({ error: 'ليس لديك صلاحية' });

  db.query('SELECT * FROM tasks WHERE user_id = ?', [uid], (err, results) => {
    if (err) return res.status(500).json({ error: 'خطأ في جلب المهام' });
    res.json(results);
  });
};

// جلب المهام الفرعية
exports.getSubtasks = (req, res) => {
  const uid = parseInt(req.params.userId);
  const parentId = parseInt(req.params.parentId);

  if (uid !== req.userId) return res.status(403).json({ error: 'ليس لديك صلاحية' });

  db.query(
    `SELECT * FROM tasks WHERE user_id = ? AND parent_task_id = ? AND recurrence = 'none'`,
    [uid, parentId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'فشل جلب المهام الفرعية' });
      res.json(results);
    }
  );
};

// إضافة مهمة (مع تكرار)
exports.createTask = (req, res) => {
  const {
    title, start_datetime, end_datetime, category, priority,
    parent_task_id, recurrence, recurrence_end
  } = req.body;

  const startFormatted = formatDateForMySQL(start_datetime);
  const endFormatted = formatDateForMySQL(end_datetime);
  const recurrenceEndFormatted = recurrence_end ? formatDateForMySQL(recurrence_end) : null;

  db.query(
    'INSERT INTO tasks (user_id, title, start_datetime, end_datetime, category, priority, parent_task_id, recurrence, recurrence_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.userId, title, startFormatted, endFormatted, category || null, priority || null, parent_task_id || null, recurrence || 'none', recurrenceEndFormatted],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'فشل في إضافة المهمة' });

      // إنشاء التكرار إذا لزم الأمر
      if (recurrence && recurrence !== 'none' && recurrence_end) {
        const occurrences = [];
        let currentStart = new Date(start_datetime);
        let currentEnd = new Date(end_datetime);
        const endRepeat = new Date(recurrence_end);
        endRepeat.setHours(23, 59, 59, 999);

        while (true) {
          switch (recurrence) {
            case 'daily':
              currentStart.setDate(currentStart.getDate() + 1);
              currentEnd.setDate(currentEnd.getDate() + 1);
              break;
            case 'weekly':
              currentStart.setDate(currentStart.getDate() + 7);
              currentEnd.setDate(currentEnd.getDate() + 7);
              break;
            case 'monthly':
              currentStart.setMonth(currentStart.getMonth() + 1);
              currentEnd.setMonth(currentEnd.getMonth() + 1);
              break;
            default:
              return res.status(400).json({ error: 'نوع التكرار غير صالح' });
          }

          if (currentEnd > endRepeat) break;

          occurrences.push([
            req.userId,
            title,
            formatDateForMySQL(currentStart),
            formatDateForMySQL(currentEnd),
            category || null,
            priority || null,
            null,
            'none',
            null
          ]);
        }

        if (occurrences.length > 0) {
          db.query(
            'INSERT INTO tasks (user_id, title, start_datetime, end_datetime, category, priority, parent_task_id, recurrence, recurrence_end) VALUES ?',
            [occurrences],
            (repeatErr) => {
              if (repeatErr) return res.status(500).json({ error: 'فشل إنشاء التكرارات' });
              res.json({ message: 'تمت إضافة المهمة والتكرارات' });
            }
          );
        } else {
          res.json({ message: 'تمت إضافة المهمة بدون تكرار إضافي' });
        }
      } else {
        res.json({ message: 'تمت إضافة المهمة' });
      }
    }
  );
};

// تعديل المهمة
exports.updateTask = (req, res) => {
  const taskId = req.params.id;
  const userId = req.userId;

  db.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId], (err, results) => {
    if (err || results.length === 0)
      return res.status(404).json({ error: 'المهمة غير موجودة' });

    const existing = results[0];
    const {
      title = existing.title,
      description = existing.description,
      start_datetime = existing.start_datetime,
      end_datetime = existing.end_datetime,
      category = existing.category,
      priority = existing.priority
    } = req.body;

    db.query(
      'UPDATE tasks SET title = ?, description = ?, start_datetime = ?, end_datetime = ?, category = ?, priority = ? WHERE id = ? AND user_id = ?',
      [
        title,
        description,
        formatDateForMySQL(start_datetime),
        formatDateForMySQL(end_datetime),
        category || null,
        priority || null,
        taskId,
        userId
      ],
      (err) => {
        if (err) return res.status(500).json({ error: 'فشل التعديل' });
        res.json({ message: '✅ تم التحديث بنجاح' });
      }
    );
  });
};

// حذف المهمة
exports.deleteTask = (req, res) => {
  db.query('DELETE FROM tasks WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'فشل الحذف' });
    res.json({ message: 'تم الحذف' });
  });
};

// تحديث حالة الإنجاز
exports.markCompleted = (req, res) => {
  const { completed } = req.body;
  db.query('UPDATE tasks SET completed = ? WHERE id = ?', [completed, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'فشل التحديث' });
    res.json({ message: 'تم تحديث الحالة' });
  });
};

// تعديل تاريخ المهمة
exports.updateEndDate = (req, res) => {
  let { end_datetime } = req.body;
  const taskId = req.params.id;
  const userId = req.userId;

  if (!end_datetime) return res.status(400).json({ error: 'يرجى إدخال التاريخ' });

  const formattedDate = formatDateForMySQL(end_datetime);

  db.query(
    'UPDATE tasks SET end_datetime = ? WHERE id = ? AND user_id = ?',
    [formattedDate, taskId, userId],
    (err) => {
      if (err) return res.status(500).json({ error: 'فشل تحديث التاريخ' });
      res.json({ message: 'تم التحديث' });
    }
  );
};
