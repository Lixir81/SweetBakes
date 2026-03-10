const express = require('express');
const Database = require('better-sqlite3');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Use /tmp for Vercel, or local for development
const dbPath = process.env.VERCEL ? '/tmp/app.db' : './app.db';

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize database
let db;
try {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  console.log('✓ Connected to SQLite database');
} catch (err) {
  console.error('Database Error:', err);
  process.exit(1);
}

// Create tables
const createTables = () => {
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      image_url TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      total_price REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS custom_cake_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      event_date TEXT NOT NULL,
      event_type TEXT NOT NULL,
      cake_flavor TEXT NOT NULL,
      design_description TEXT NOT NULL,
      servings INTEGER NOT NULL,
      reference_image TEXT,
      additional_notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Create admin user if doesn't exist
    const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
    if (!adminExists) {
      bcrypt.hash('admin123', 10, (err, hash) => {
        if (!err) {
          try {
            db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)')
              .run('admin', 'admin@sweetbakes.com', hash, 'admin');
            console.log('✓ Demo admin user created');
          } catch (e) {
            console.log('Admin user already exists');
          }
        }
      });
    }

    // Create demo products if none exist
    const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get();
    if (productCount.count === 0) {
      const products = [
        { name: 'Croissant', description: 'Buttery, flaky French pastry', price: 4.50, stock: 20 },
        { name: 'Chocolate Eclair', description: 'Elegant eclair with dark chocolate glaze', price: 5.00, stock: 15 },
        { name: 'Strawberry Tart', description: 'Fresh strawberries on creamy custard', price: 6.00, stock: 10 },
        { name: 'Macarons', description: 'Assorted French macarons', price: 3.50, stock: 25 },
        { name: 'Vanilla Cupcake', description: 'Classic vanilla with buttercream', price: 3.00, stock: 30 },
        { name: 'Chocolate Mousse Cake', description: 'Rich and decadent', price: 7.00, stock: 8 }
      ];

      const insertProduct = db.prepare(
        'INSERT INTO products (name, description, price, stock, created_by) VALUES (?, ?, ?, ?, ?)'
      );

      products.forEach(p => {
        insertProduct.run(p.name, p.description, p.price, p.stock, 1);
      });
      console.log('✓ Demo products created');
    }
  } catch (err) {
    console.error('Error creating tables:', err);
  }
};

createTables();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
    }
  }
});

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'sweet-bakes-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.VERCEL ? true : false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Auth middleware
const checkAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

const checkAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/custom-cake', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'custom-cake.html'));
});

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)');
    const result = stmt.run(username, email, hashedPassword, 'user');

    req.session.user = {
      id: result.lastInsertRowid,
      username,
      email,
      role: 'user'
    };

    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    res.json({ success: true, role: user.role });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ success: true });
  });
});

app.get('/api/user', checkAuth, (req, res) => {
  res.json(req.session.user);
});

app.post('/api/change-password', checkAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.session.user.id);
    
    if (!user) {
      return res.status(500).json({ error: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.session.user.id);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/change-username', checkAuth, async (req, res) => {
  try {
    const { newUsername, password } = req.body;

    if (!newUsername || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (newUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    const user = db.prepare('SELECT password, username FROM users WHERE id = ?').get(req.session.user.id);
    
    if (!user) {
      return res.status(500).json({ error: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    if (newUsername === user.username) {
      return res.status(400).json({ error: 'New username must be different from current username' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(newUsername);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(newUsername, req.session.user.id);
    req.session.user.username = newUsername;

    res.json({ success: true, message: 'Username changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/dashboard', checkAuth, (req, res) => {
  if (req.session.user.role === 'admin') {
    return res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html'));
});

// Products API
app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
    res.json(products || []);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/products', checkAuth, checkAdmin, upload.single('image'), (req, res) => {
  try {
    const { name, description, price, stock } = req.body;

    if (!name || !price || stock === undefined) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(400).json({ error: 'Required fields: name, price, stock' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '/uploads/default-product.png';

    const stmt = db.prepare('INSERT INTO products (name, description, price, stock, image_url, created_by) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(name, description || '', parseFloat(price), parseInt(stock), imageUrl, req.session.user.id);

    res.json({ id: result.lastInsertRowid, name, description, price, stock, imageUrl });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', checkAuth, checkAdmin, upload.single('image'), (req, res) => {
  try {
    const { name, description, price, stock } = req.body;

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(404).json({ error: 'Product not found' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : product.image_url;

    db.prepare('UPDATE products SET name = ?, description = ?, price = ?, stock = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(name, description || '', parseFloat(price), parseInt(stock), imageUrl, req.params.id);

    if (req.file && product.image_url && !product.image_url.includes('default')) {
      const oldImagePath = path.join(__dirname, 'public', product.image_url);
      fs.unlink(oldImagePath, (err) => {
        if (err) console.error('Error deleting old image:', err);
      });
    }

    res.json({ success: true });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', checkAuth, checkAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Orders API
app.get('/api/orders', checkAuth, (req, res) => {
  try {
    let orders;
    if (req.session.user.role === 'admin') {
      orders = db.prepare('SELECT o.*, u.username, p.name as product_name FROM orders o JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id ORDER BY o.created_at DESC').all();
    } else {
      orders = db.prepare('SELECT o.*, p.name as product_name FROM orders o JOIN products p ON o.product_id = p.id WHERE o.user_id = ? ORDER BY o.created_at DESC').all(req.session.user.id);
    }
    res.json(orders || []);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/orders', checkAuth, (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Invalid product or quantity' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock' });

    const totalPrice = product.price * quantity;

    const result = db.prepare('INSERT INTO orders (user_id, product_id, quantity, total_price, status) VALUES (?, ?, ?, ?, ?)')
      .run(req.session.user.id, product_id, quantity, totalPrice, 'pending');

    db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, product_id);

    res.json({ id: result.lastInsertRowid, product_id, quantity, totalPrice });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.put('/api/orders/:id', checkAuth, checkAdmin, (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'ready', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Order not found' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

app.delete('/api/orders/:id', checkAuth, checkAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Export APIs
app.get('/api/export/products-xml', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products').all();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?xml-stylesheet type="text/xsl" href="products.xslt"?>\n';
    xml += '<products>\n';

    (products || []).forEach(p => {
      xml += `  <product>\n`;
      xml += `    <id>${p.id}</id>\n`;
      xml += `    <name>${p.name}</name>\n`;
      xml += `    <description>${p.description || ''}</description>\n`;
      xml += `    <price>${p.price}</price>\n`;
      xml += `    <stock>${p.stock}</stock>\n`;
      xml += `  </product>\n`;
    });

    xml += '</products>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/export/orders-xml', checkAuth, (req, res) => {
  try {
    const orders = db.prepare('SELECT o.*, u.username, p.name as product_name FROM orders o JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id').all();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<orders>\n';

    (orders || []).forEach(o => {
      xml += `  <order>\n`;
      xml += `    <id>${o.id}</id>\n`;
      xml += `    <username>${o.username}</username>\n`;
      xml += `    <product_name>${o.product_name}</product_name>\n`;
      xml += `    <quantity>${o.quantity}</quantity>\n`;
      xml += `    <total_price>${o.total_price}</total_price>\n`;
      xml += `    <status>${o.status}</status>\n`;
      xml += `    <created_at>${o.created_at}</created_at>\n`;
      xml += `  </order>\n`;
    });

    xml += '</orders>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Custom Cake Requests API
app.post('/api/custom-cake-request', checkAuth, upload.single('reference_image'), (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      event_date,
      event_type,
      cake_flavor,
      design_description,
      servings,
      additional_notes
    } = req.body;

    if (!customer_name || !customer_email || !customer_phone || !event_date || !event_type || !cake_flavor || !design_description || !servings) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    const referenceImage = req.file ? `/uploads/${req.file.filename}` : null;

    const result = db.prepare(`INSERT INTO custom_cake_requests 
      (user_id, customer_name, customer_email, customer_phone, event_date, event_type, cake_flavor, design_description, servings, reference_image, additional_notes, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        req.session.user.id,
        customer_name,
        customer_email,
        customer_phone,
        event_date,
        event_type,
        cake_flavor,
        design_description,
        parseInt(servings),
        referenceImage,
        additional_notes || '',
        'pending'
      );

    res.json({
      id: result.lastInsertRowid,
      message: 'Custom cake request submitted successfully! We will contact you soon.'
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({ error: 'Failed to submit custom cake request' });
  }
});

app.get('/api/custom-cake-requests', checkAuth, (req, res) => {
  try {
    const requests = db.prepare('SELECT * FROM custom_cake_requests WHERE user_id = ? ORDER BY created_at DESC').all(req.session.user.id);
    res.json(requests || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

app.get('/api/admin/custom-cake-requests', checkAuth, checkAdmin, (req, res) => {
  try {
    const requests = db.prepare('SELECT ccr.*, u.username FROM custom_cake_requests ccr JOIN users u ON ccr.user_id = u.id ORDER BY ccr.created_at DESC').all();
    res.json(requests || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

app.put('/api/custom-cake-request/:id', checkAuth, checkAdmin, (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = db.prepare('UPDATE custom_cake_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.params.id);

    if (result.changes === 0) return res.status(404).json({ error: 'Request not found' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🍰 Sweet Bakes Server running on http://localhost:${PORT}\n`);
  console.log('Demo Credentials:');
  console.log('  Admin: admin / admin123');
  console.log('');
});
