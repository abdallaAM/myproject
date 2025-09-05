const db = require('../config/db');

exports.getCategories = (req, res) => {
  db.query(
    'SELECT * FROM categories WHERE user_id = ?',
    [req.userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'حدث خطأ أثناء جلب التصنيفات' });
      res.json(results);
    }
  );
};

exports.createCategory = (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم التصنيف مطلوب' });

  db.query(
    'INSERT INTO categories (user_id, name) VALUES (?, ?)',
    [req.userId, name],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'حدث خطأ أثناء إضافة التصنيف' });
      res.json({ id: result.insertId, name });
    }
  );
};

exports.deleteCategory = (req, res) => {
  const categoryId = req.params.id;

  db.query(
    'SELECT name FROM categories WHERE id = ? AND user_id = ?',
    [categoryId, req.userId],
    (err, result) => {
      if (err || result.length === 0) {
        return res.status(404).json({ error: 'التصنيف غير موجود' });
      }

      const categoryName = result[0].name;

      db.query(
        'DELETE FROM categories WHERE id = ? AND user_id = ?',
        [categoryId, req.userId],
        (err) => {
          if (err) return res.status(500).json({ error: 'فشل في حذف التصنيف من قاعدة البيانات' });

          db.query(
            'UPDATE tasks SET category = NULL WHERE user_id = ? AND category = ?',
            [req.userId, categoryName],
            (err) => {
              if (err) return res.status(500).json({ error: 'تم حذف التصنيف، لكن فشل تحديث المهام المرتبطة' });
              res.json({ message: 'تم حذف التصنيف وتحديث المهام المرتبطة به' });
            }
          );
        }
      );
    }
  );
};

exports.checkCategoryUsage = (req, res) => {
  const categoryId = req.params.id;

  const query = `
    SELECT COUNT(*) AS count
    FROM tasks
    WHERE user_id = ? AND category = (
      SELECT name FROM categories WHERE id = ? AND user_id = ?
    )
  `;

  db.query(query, [req.userId, categoryId, req.userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'حدث خطأ أثناء التحقق من استخدام التصنيف' });
    res.json({ usedCount: results[0].count });
  });
};
