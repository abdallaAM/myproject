const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
  const { email, password, name, avatar_url } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Недостаточно данных.' });

  try {
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {
      if (err) return res.status(500).json({ error: 'Не удалось установить соединение с базой данных.' });
      if (result.length > 0) return res.status(400).json({ error: 'Электронная почта уже используется.'});

      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        'INSERT INTO users (email, password, name, avatar_url) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, name, avatar_url || null],
        (err) => {
          if (err) return res.status(500).json({ error: 'Ошибка при сохранении.' });
          res.status(201).json({ message: 'Регистрация прошла успешно.' });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Произошла непредвиденная ошибка.' });
  }
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ error: 'Неверный адрес электронной почты или пароль.' });

    const user = results[0];

    if (!user.is_active) return res.status(403).json({ error: 'Учетная запись не активирована.' });

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) return res.status(401).json({ error: 'Неверный адрес электронной почты или пароль.' });

      const token = jwt.sign(
        {
          userId: user.id,
          role: user.role,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ token });
    });
  });
};
