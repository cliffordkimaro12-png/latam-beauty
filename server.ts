import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'data.json');

app.use(express.json());

// --- SECURITY HELPER FOR PASSWORDS ---
function hashPassword(password: string, saltInput?: string) {
  const salt = saltInput || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// Simple Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 100;
}

// XSS Sanitizer for basic strings to prevent injections
function sanitizeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// --- INITIALIZE PERSISTENT DB ---
interface DbSchema {
  users: any[];
  sessions: any[];
  products: any[];
  orders: any[];
  promotions: any[];
  blogs: any[];
  careers: any[];
  resetTokens: any[];
  verificationCodes: any[];
  auditLogs: any[];
}

function loadDb(): DbSchema {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData: DbSchema = {
      users: [],
      sessions: [],
      products: [],
      orders: [],
      promotions: [],
      blogs: [],
      careers: [],
      resetTokens: [],
      verificationCodes: [],
      auditLogs: []
    };
    saveDb(defaultData);
    seedInitialData();
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading DB, resetting', error);
    return {
      users: [],
      sessions: [],
      products: [],
      orders: [],
      promotions: [],
      blogs: [],
      careers: [],
      resetTokens: [],
      verificationCodes: [],
      auditLogs: []
    };
  }
}

function saveDb(data: DbSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// --- RATE LIMITER STORE ---
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxRequests = 10, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const limit = rateLimits.get(key);

  if (!limit) {
    rateLimits.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (now > limit.resetTime) {
    rateLimits.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}

// --- AUDIT LOGGER ---
function logAuditAction(userId: string, userEmail: string, action: string, details: string) {
  const db = loadDb();
  db.auditLogs.push({
    id: crypto.randomUUID(),
    userId,
    userEmail,
    action,
    details,
    timestamp: new Date().toISOString()
  });
  saveDb(db);
}

// --- DATABASE SEEDING ---
function seedInitialData() {
  const db = loadDb();

  // Create admin/owners
  const ownerPass = hashPassword('Password123');
  const adminPass = hashPassword('Password123');

  const defaultUsers = [
    {
      id: crypto.randomUUID(),
      email: 'owner@wellness.com',
      name: 'Victoria Prada',
      passwordHash: ownerPass.hash,
      passwordSalt: ownerPass.salt,
      role: 'owner',
      isVerified: true,
      loyaltyPoints: 1000,
      referralCode: 'PRADA1000',
      addresses: [],
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      email: 'admin@wellness.com',
      name: 'Julius Wellness',
      passwordHash: adminPass.hash,
      passwordSalt: adminPass.salt,
      role: 'admin',
      isVerified: true,
      loyaltyPoints: 500,
      referralCode: 'JULIUS99',
      addresses: [],
      createdAt: new Date().toISOString()
    },
    // Bootstrap current developer email from runtime
    {
      id: crypto.randomUUID(),
      email: 'cliffordkimaro12@gmail.com',
      name: 'Clifford Kimaro',
      passwordHash: ownerPass.hash,
      passwordSalt: ownerPass.salt,
      role: 'owner',
      isVerified: true,
      loyaltyPoints: 1000,
      referralCode: 'CLIFFORD10',
      addresses: [
        {
          id: crypto.randomUUID(),
          label: 'Default Shipping',
          street: '12 Luxury Wellness Blvd',
          city: 'Beverly Hills',
          state: 'CA',
          postalCode: '90210',
          country: 'United States'
        }
      ],
      createdAt: new Date().toISOString()
    }
  ];

  // Feed users if empty
  if (db.users.length === 0) {
    db.users = defaultUsers;
  }

  // Seed Products
  const seedProducts = [
    {
      id: 'prod-1',
      name: 'Botanical Radiance Youth Elixir',
      description: 'An outstanding concentrated botanical oil designed to revitalize collagen production, repair UV stressors, and restore skin luminosity.',
      ingredients: 'Organic Marula Seed Oil, Rosa Canina (Rosehip) Fruit Oil, Psoralea Corylifolia (Bakuchiol) Extract, Prunus Amygdalus Dulcis (Sweet Almond) Oil, Jasminum Officinale Oil.',
      benefits: 'Smooths fine lines, balances pigmentations, locks in 24-hr lipid barrier nourishment, increases cellular turnover without micro-tears.',
      usage: 'Gently warm 2-3 drops in palms, touch gently onto cheeks, brow, and throat using deep upward strokes before rest.',
      category: 'Skincare',
      price: 85,
      images: ['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=800&auto=format&fit=crop'],
      stock: 45,
      rating: 4.8,
      reviews: [
        {
          id: 'rev-1',
          userId: 'usr-sample',
          userName: 'Cecilia Carter',
          rating: 5,
          comment: 'Simply outstanding. My fine lines decreased significantly within two weeks.',
          date: '2026-05-18T14:22:00Z'
        }
      ],
      status: 'Published',
      skinType: 'All Skin Types / High Maturity',
      isRecurring: true
    },
    {
      id: 'prod-2',
      name: 'Eucalyptus & Cedar Ritual Cleansing Balm',
      description: 'An immersive aromatic solid oil balm that dissolves water-resistant cosmetics, urban pollutants, and sebum blockages while comforting nerves.',
      ingredients: 'Organic Moringa Oleifera Seed Oil, French Green Clay, Cedrus Atlantica (Cedarwood) Bark Oil, Eucalyptus Globulus Leaf Oil, Shea Butter.',
      benefits: 'Deep pores vacuuming, safe for sensitive eyes, protects natural moisture mantle, prevents acne flares through antimicrobial essential oils.',
      usage: 'Scrape a cherry-sized bead, melt in dry fingertips, massage onto warm dry facial zones. Rinse off with a damp warm muslin cloth.',
      category: 'Skincare',
      price: 48,
      images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop'],
      stock: 60,
      rating: 4.9,
      reviews: [],
      status: 'Published',
      skinType: 'Congested / Oily / Stress-inflamed',
      isRecurring: false
    },
    {
      id: 'prod-3',
      name: 'Sandalwood Restorative Oasis Aromatherapy Oil',
      description: 'A deeply meditative, luxury absolute oil formulated to quiet mental static, ease tight shoulders, and enrich atmospheric vibrations during meditation or rest.',
      ingredients: 'Santalum Album (Sandalwood) Absolute, Lavender Angustifolia Extract, Cananga Odorata (Ylang Ylang) Essential Oil, Jojoba Carrier Base.',
      benefits: 'Grounds jittery neurological nodes, promotes expansive slow breathing rhythms, reduces skin inflammation when applied topically.',
      usage: 'Apply key rollers on wrist arteries, carotid curve, and third-eye pressure center. Ideal accompaniment to night breathing rituals.',
      category: 'Aromatherapy',
      price: 64,
      images: ['https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=800&auto=format&fit=crop'],
      stock: 30,
      rating: 4.7,
      reviews: [],
      status: 'Published',
      isRecurring: true
    },
    {
      id: 'prod-4',
      name: 'Blue Lotus Imperial Wellness Tea',
      description: 'A prized ceremonial herbal blend centered around rare organic Blue Lotus petals, packed with antioxidant alkaloids that inspire euphoric serenity.',
      ingredients: 'Dried Sacred Blue Lotus Flowers (Nymphaea caerulea), Organic Elderberry Dried Pulp, Whole Spearmint Leaves, Lemongrass.',
      benefits: 'Promotes deep lucid sleep cycles, releases muscular core tension, balances inner digestive heat, tastes exceptionally clean and sweet.',
      usage: 'Steep 1 tablespoon in 90°C spring water for 5-7 minutes. Sip slowly in a quiet environment prior to evening restorative work.',
      category: 'Herbal Teas',
      price: 36,
      images: ['https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=80&w=800&auto=format&fit=crop'],
      stock: 120,
      rating: 5.0,
      reviews: [],
      status: 'Published',
      isRecurring: true
    },
    {
      id: 'prod-5',
      name: 'Sea Minerals Volumizing Hair Masque',
      description: 'A structured luxurious deep conditioner loaded with sea silt, organic macro-algae, and botanical extracts to reinforce hair shafts and double natural volume.',
      ingredients: 'Purified Sea Kelp Caviar, Rosemary Absolute, Sea Silt Extracts, Silk Amino Acids, Cold-Pressed Avocado Oil, Argan Kernel Oil.',
      benefits: 'Thickens fine hair diameters, repairs cuticle splits from dye/heat treatments, stimulates scalp circulation to promote healthy growth.',
      usage: 'Work generously through mid-lengths to ends after clean wash. Let rest for 10 minutes prior to warm rinses.',
      category: 'Haircare',
      price: 55,
      images: ['https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=800&auto=format&fit=crop'],
      stock: 80,
      rating: 4.6,
      reviews: [],
      status: 'Published',
      hairType: 'Dry / Color-Damaged / Fine',
      isRecurring: false
    }
  ];

  if (db.products.length === 0) {
    db.products = seedProducts;
  }

  // Seed Promotions
  const seedPromotions = [
    { code: 'WELLNESS10', discountPercent: 10, description: '10% off your entire natural collection', expiresAt: '2028-12-31' },
    { code: 'AURA20', discountPercent: 20, description: '20% off when you discover more (min spend $100)', minSpend: 100, expiresAt: '2028-12-31' },
    { code: 'ROSE', discountPercent: 15, description: '15% off premium Elixir items', expiresAt: '2028-12-31' }
  ];

  if (db.promotions.length === 0) {
    db.promotions = seedPromotions;
  }

  // Seed Blogs
  const seedBlogs = [
    {
      id: 'blog-1',
      title: 'The Art of Slow Skincare: Transitioning to Clean Botanical Lipids',
      summary: 'Explore why cellular structures respond beautifully to organic oils, and how to sequence your natural skincare ritual to cultivate absolute radiancy.',
      content: 'In our fast-paced modern spaces, skincare transforms into a race. However, skin cells thrive under soft rhythms. Transitioning to clean botanical lipids like Rosehip, Bakuchiol, and Moringa Oil restores the skin’s native microflora barrier. When molecules aren’t constantly combatting harsh synthetic sulfates or artificial parabens, they optimize naturally. We recommend implementing a three-step evening sequence: warm, sweep, and touch. First, prepare pores using a clean warm cloth. Next, sweep pollutants away using an eucalyptus active cleansing balm. Finally, press 3 drops of botanical oil deeply onto skin tissues under rhythmic breathing. Experience the luxury of intentional recovery.',
      category: 'Skincare',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop',
      readTime: '4 min read',
      date: 'June 05, 2026'
    },
    {
      id: 'blog-2',
      title: 'Sacred Sleep Traditions & The Alkaline Altar of Blue Lotus',
      summary: 'Discover the ancient history of sensory calming in royal Egyptian chambers and how Blue Lotus alkaloids activate deeper restorative patterns.',
      content: 'True beauty originates from high-fidelity rest. Throughout archaeological excavations, blue lotus petals are catalogued in dynastic chambers. Ancient Egyptian apothecaries recognized Blue Lotus as an elite calming sedative. Compounds like nuciferine and apomorphine interact subtly with neurological receptors, relaxing muscle contractions and lowering cortisol production. Incorporating high-grade Blue Lotus tea into a night transition ritual signals the brain to release melatonin, generating lucid dreams and cellular repair phases. Prepare your sleep chamber as an altar of silence.',
      category: 'Wellness Lifestyle',
      image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
      readTime: '6 min read',
      date: 'May 28, 2026'
    }
  ];

  if (db.blogs.length === 0) {
    db.blogs = seedBlogs;
  }

  // Seed Careers
  const seedCareers = [
    {
      id: 'car-1',
      title: 'Luxury Retail & Wellness Concierge',
      department: 'Client Engagement',
      location: 'Beverly Hills Suite / Hybrid',
      description: 'Act as the primary interface of elegance. Introduce clients to organic botanics, analyze skin profiles delicately, and customize wellness agendas.',
      requirements: [
        '3+ years experience with luxury hospitality or skincare brands.',
        'Deep foundational appreciation for holistic, organic remedies and botanical formulations.',
        'Exemplary spoken eloquence and high emotional intelligence.'
      ]
    },
    {
      id: 'car-2',
      title: 'Senior Product Apothecary Lead',
      department: 'Research & Botanical Development',
      location: 'Seattle Eco-Lab',
      description: 'Oversee organic formulations, ensure maximum ingredient bio-compatibility, secure non-toxic source validation, and lead scientific skincare trials.',
      requirements: [
        'Masters or PhD in Phytochemistry, Cosmetic Chemistry, or related Organic Sciences.',
        'Extensive portfolio launching premium organic botanical products globally.',
        'A passionate standard for zero-waste packaging aesthetics.'
      ]
    }
  ];

  if (db.careers.length === 0) {
    db.careers = seedCareers;
  }

  saveDb(db);
}

// Ensure seeded on startup
seedInitialData();

// --- SECURITY MIDDLEWARE & CONTEXT ---
interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'customer' | 'admin' | 'owner';
    isVerified: boolean;
    loyaltyPoints: number;
    referralCode: string;
  };
}

// Authentication interceptor
const authenticateUser = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1] || req.query.token as string;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const db = loadDb();
  const session = db.sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Associated user account not found.' });
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isVerified: user.isVerified,
    loyaltyPoints: user.loyaltyPoints || 0,
    referralCode: user.referralCode
  };
  next();
};

// RBAC: Admin gate
const requireAdmin = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
};

// RBAC: Owner gate
const requireOwner = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied. Owner privileges required.' });
  }
  next();
};

// --- AUTHENTICATION ROUTES ---

// Rate Limit registers and logins to avoid brute-forcing
app.post('/api/auth/register', (req, res) => {
  const ip = req.ip || 'unknown-ip';
  if (!checkRateLimit(`register-${ip}`, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many registration requests. Please wait 15 minutes.' });
  }

  const { email, password, name, referralCode } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields (email, password, name) are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'A valid email format is required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must incorporate at least 8 characters for safety.' });
  }

  const db = loadDb();
  const existingUser = db.users.find(u => u.email === cleanEmail);
  if (existingUser) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const { hash, salt } = hashPassword(password);
  const newUserId = crypto.randomUUID();
  const myReferralCode = 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  // Loyalty rewards - 50 points on signup
  let initialLoyalty = 50;
  let refferredByUserId: string | undefined;

  if (referralCode) {
    const referrer = db.users.find(u => u.referralCode === referralCode.trim());
    if (referrer) {
      initialLoyalty += 25; // Bonus for being referred
      refferredByUserId = referrer.id;
    }
  }

  const newUser = {
    id: newUserId,
    email: cleanEmail,
    name: sanitizeString(name),
    passwordHash: hash,
    passwordSalt: salt,
    role: 'customer',
    isVerified: false,
    loyaltyPoints: initialLoyalty,
    referralCode: myReferralCode,
    referredBy: refferredByUserId,
    addresses: [],
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  // Generate Email Verification Code (Simulation)
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  db.verificationCodes.push({
    id: crypto.randomUUID(),
    userId: newUserId,
    code,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins
  });

  saveDb(db);

  // Send back registration status and simulation details
  res.status(201).json({
    message: 'Account crafted successfully. Verify your email to activate all benefits.',
    simulatedEmailVerificationCode: code,
    email: cleanEmail
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  
  // Rate limiting against brute force based on email
  if (!checkRateLimit(`login-${cleanEmail}`, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many failed login attempts. Please try again in 10 minutes.' });
  }

  const db = loadDb();
  const user = db.users.find(u => u.email === cleanEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password combination.' });
  }

  // Hash check
  const checkHash = hashPassword(password, user.passwordSalt);
  if (checkHash.hash !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password combination.' });
  }

  // Create active session
  const token = crypto.randomUUID() + crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  db.sessions.push({
    id: crypto.randomUUID(),
    userId: user.id,
    token,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString()
  });

  saveDb(db);

  res.json({
    message: 'Access granted.',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      loyaltyPoints: user.loyaltyPoints || 0,
      referralCode: user.referralCode,
      addresses: user.addresses || []
    }
  });
});

app.post('/api/auth/verify-email', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and digital verification code are mandatory.' });
  }

  const db = loadDb();
  const cleanEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email === cleanEmail);
  if (!user) {
    return res.status(400).json({ error: 'User not encountered.' });
  }

  const now = new Date();
  const index = db.verificationCodes.findIndex(v => v.userId === user.id && v.code === code.trim() && new Date(v.expiresAt) > now);

  if (index === -1) {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  // Mark verified
  user.isVerified = true;
  db.verificationCodes.splice(index, 1); // remove code
  saveDb(db);

  res.json({ message: 'Email address verified successfully. Loyalty point account unlocked.' });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Target email is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!checkRateLimit(`reset-${cleanEmail}`, 3, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Verification requests flooded. Please retry in 15 minutes.' });
  }

  const db = loadDb();
  const user = db.users.find(u => u.email === cleanEmail);
  if (!user) {
    // Standard secure procedure: mock success even if not found to avoid account harvesting
    return res.json({
      message: 'If your email is on file, a password reset link has been simulated below.',
      simulatedToken: null
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

  db.resetTokens.push({
    id: crypto.randomUUID(),
    userId: user.id,
    token: resetToken,
    expiresAt
  });

  saveDb(db);

  res.json({
    message: 'If your email is on file, a password reset token has been generated below.',
    simulatedToken: resetToken,
    expiresAt
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'All reset criteria are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must incorporate at least 8 characters.' });
  }

  const db = loadDb();
  const now = new Date();
  const entryIndex = db.resetTokens.findIndex(r => r.token === token && new Date(r.expiresAt) > now);

  if (entryIndex === -1) {
    return res.status(400).json({ error: 'Reset link has expired or is invalid.' });
  }

  const entry = db.resetTokens[entryIndex];
  const user = db.users.find(u => u.id === entry.userId);

  if (!user) {
    return res.status(400).json({ error: 'User does not exist inside repository.' });
  }

  // Set new password
  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.passwordSalt = salt;

  // Clean sessions & tokens
  db.sessions = db.sessions.filter(s => s.userId !== user.id);
  db.resetTokens.splice(entryIndex, 1);

  saveDb(db);

  res.json({ message: 'Password securely changed. Sign in using your new credentials.' });
});

// --- CLIENT PROFILE DETAILS ---
app.get('/api/profile', authenticateUser, (req: AuthenticatedRequest, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'Profile not found.' });

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isVerified: user.isVerified,
    loyaltyPoints: user.loyaltyPoints || 0,
    referralCode: user.referralCode,
    addresses: user.addresses || []
  });
});

app.put('/api/profile', authenticateUser, (req: AuthenticatedRequest, res) => {
  const { name, addresses } = req.body;
  const db = loadDb();
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'User record absent.' });

  if (name) user.name = sanitizeString(name);
  if (addresses && Array.isArray(addresses)) {
    user.addresses = addresses.map((addr: any) => ({
      id: addr.id || crypto.randomUUID(),
      label: sanitizeString(addr.label || 'Home'),
      street: sanitizeString(addr.street || ''),
      city: sanitizeString(addr.city || ''),
      state: sanitizeString(addr.state || ''),
      postalCode: sanitizeString(addr.postalCode || ''),
      country: sanitizeString(addr.country || 'United States')
    }));
  }

  saveDb(db);
  res.json({
    message: 'Profile details refined successfully.',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      loyaltyPoints: user.loyaltyPoints,
      referralCode: user.referralCode,
      addresses: user.addresses
    }
  });
});

// --- CORE PRODUCT ROUTES ---
app.get('/api/products', (req, res) => {
  const db = loadDb();
  // Filter out Draft status products for non-admins
  const token = req.headers['authorization']?.split(' ')[1];
  let isAdminUser = false;

  if (token) {
    const session = db.sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
    if (session) {
      const u = db.users.find(usr => usr.id === session.userId);
      if (u && (u.role === 'admin' || u.role === 'owner')) {
        isAdminUser = true;
      }
    }
  }

  const products = isAdminUser ? db.products : db.products.filter(p => p.status === 'Published');
  res.json(products);
});

// Post review with loyalty points reward
app.post('/api/products/:id/reviews', authenticateUser, (req: AuthenticatedRequest, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.id;

  if (!rating || !comment) {
    return res.status(400).json({ error: 'Rating (1-5) and comment are mandatory fields.' });
  }

  const db = loadDb();
  const product = db.products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ error: 'Natural product is missing in database.' });
  }

  const newReview = {
    id: crypto.randomUUID(),
    userId: req.user!.id,
    userName: req.user!.name,
    rating: Number(rating),
    comment: sanitizeString(comment),
    date: new Date().toISOString()
  };

  if (!product.reviews) product.reviews = [];
  product.reviews.push(newReview);

  // Recalculate average rating
  const avg = product.reviews.reduce((acc: number, item: any) => acc + item.rating, 0) / product.reviews.size;
  product.rating = Number(avg.toFixed(1));

  // Reward points - 20 Loyalty Points for product review
  const user = db.users.find(u => u.id === req.user!.id);
  if (user) {
    user.loyaltyPoints = (user.loyaltyPoints || 0) + 20;
  }

  saveDb(db);
  res.json({ message: 'Review successfully cast. You earned 20 Loyalty points!', product });
});

// --- PROMOTIONS & CODE REDEMPTION ---
app.get('/api/promotions/check/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const db = loadDb();
  const promo = db.promotions.find(p => p.code === code);

  if (!promo) {
    return res.status(404).json({ error: 'This coupon is invalid.' });
  }

  const expiry = new Date(promo.expiresAt);
  if (expiry < new Date()) {
    return res.status(400).json({ error: 'This coupon has expired.' });
  }

  res.json(promo);
});

// --- CHECKOUT & ORDER ROUTES ---
app.post('/api/orders/checkout', authenticateUser, (req: AuthenticatedRequest, res) => {
  const { items, discountCode, redeemPoints, shippingAddress } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items bag is empty.' });
  }

  if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
    return res.status(400).json({ error: 'Full shipping address documentation required.' });
  }

  const db = loadDb();
  let subtotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    const orig = db.products.find(p => p.id === item.productId);
    if (!orig) {
      return res.status(400).json({ error: `Product variant ${item.name} not found.` });
    }
    if (orig.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock on ${orig.name}. Only ${orig.stock} items exist.` });
    }
    subtotal += orig.price * item.quantity;
    verifiedItems.push({
      productId: orig.id,
      name: orig.name,
      price: orig.price,
      quantity: item.quantity,
      isRecurring: !!item.isRecurring
    });
  }

  let finalDiscount = 0;
  if (discountCode) {
    const promo = db.promotions.find(p => p.code === discountCode.trim().toUpperCase());
    if (promo && new Date(promo.expiresAt) > new Date()) {
      if (!promo.minSpend || subtotal >= promo.minSpend) {
        finalDiscount = Number((subtotal * (promo.discountPercent / 100)).toFixed(2));
      }
    }
  }

  // Deduct/redeem points: 100 points = $5 discount (Max up to 50% discount)
  let pointsRedeemedAndDebited = 0;
  let pointDiscountVal = 0;
  const payer = db.users.find(u => u.id === req.user!.id);

  if (redeemPoints && payer) {
    const availablePoints = payer.loyaltyPoints || 0;
    const maxRedeemablePoints = Math.min(availablePoints, Math.floor(((subtotal - finalDiscount) * 0.5) / 5) * 100);
    if (maxRedeemablePoints > 0) {
      pointsRedeemedAndDebited = maxRedeemablePoints;
      pointDiscountVal = (maxRedeemablePoints / 100) * 5;
    }
  }

  const total = Number(Math.max(0, subtotal - finalDiscount - pointDiscountVal).toFixed(2));

  // Deduct stock levels and credit loyalty points (1 point per dollar spent)
  const earnedPoints = Math.floor(total);

  for (const item of verifiedItems) {
    const orig = db.products.find(p => p.id === item.productId);
    if (orig) {
      orig.stock -= item.quantity;
    }
  }

  if (payer) {
    payer.loyaltyPoints = (payer.loyaltyPoints || 0) - pointsRedeemedAndDebited + earnedPoints;

    // Check if refereed-by logic deserves rewarding
    // First order gives referrer 100 points
    if (payer.referredBy) {
      const buyerOrders = db.orders.filter(o => o.userId === payer.id);
      if (buyerOrders.length === 0) {
        const referrer = db.users.find(u => u.id === payer.referredBy);
        if (referrer) {
          referrer.loyaltyPointsObj = (referrer.loyaltyPoints || 0) + 100;
          logAuditAction(referrer.id, referrer.email, 'Loyalty Earned', `Referred successfully: ${payer.name} checked out first time.`);
        }
      }
    }
  }

  const newOrder = {
    id: 'ord-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
    userId: req.user!.id,
    userEmail: req.user!.email,
    items: verifiedItems,
    subtotal,
    discount: finalDiscount + pointDiscountVal,
    pointsEarned: earnedPoints,
    pointsRedeemed: pointsRedeemedAndDebited,
    total,
    shippingAddress,
    paymentStatus: 'Paid', // Stripe simulation auto-success
    shippingStatus: 'Pending',
    createdAt: new Date().toISOString()
  };

  db.orders.push(newOrder);
  saveDb(db);

  res.status(201).json({
    message: 'Your wellness order has been registered and scheduled for dispatch.',
    order: newOrder,
    earnedPoints
  });
});

app.get('/api/orders/history', authenticateUser, (req: AuthenticatedRequest, res) => {
  const db = loadDb();
  const list = db.orders.filter(o => o.userId === req.user!.id);
  res.json(list);
});

// --- ADMIN / OWNER MANAGEMENT ROUTES ---

app.get('/api/admin/audit-logs', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  res.json(db.auditLogs);
});

app.get('/api/admin/analytics', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  const salesCount = db.orders.length;
  const totalRev = db.orders.reduce((acc: number, o: any) => acc + o.total, 0);
  const totalUsers = db.users.length;
  const totalItemsSold = db.orders.reduce((acc: number, o: any) => acc + o.items.reduce((sum: number, i: any) => sum + i.quantity, 0), 0);

  // Category counts
  const categoryMap: { [key: string]: number } = {};
  db.products.forEach(p => {
    categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
  });

  // Abandoned carts - users who have registered but never ordered
  const userOrderCountMap: { [userId: string]: number } = {};
  db.orders.forEach(o => {
    userOrderCountMap[o.userId] = (userOrderCountMap[o.userId] || 0) + 1;
  });

  const potentialAbandonedCarts = db.users.filter(u => u.role === 'customer' && !userOrderCountMap[u.id]);

  res.json({
    salesCount,
    totalRev,
    totalUsers,
    totalItemsSold,
    categoryPopularity: categoryMap,
    abandonedCartCandidates: potentialAbandonedCarts.map(u => ({ id: u.id, name: u.name, email: u.email }))
  });
});

app.get('/api/admin/orders', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  res.json(db.orders);
});

app.put('/api/admin/orders/:id/shipping', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { shippingStatus } = req.body;
  const db = loadDb();
  const ord = db.orders.find(o => o.id === req.params.id);

  if (!ord) return res.status(404).json({ error: 'Order not identified.' });
  ord.shippingStatus = shippingStatus;

  logAuditAction(req.user!.id, req.user!.email, 'Order Updated', `Updated shipping status on ${ord.id} to ${shippingStatus}`);
  saveDb(db);

  res.json({ message: 'Shipping details elevated.', order: ord });
});

app.post('/api/admin/products', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { name, description, ingredients, benefits, usage, category, price, stock, status, skinType, hairType, isRecurring } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category parameters are mandatory.' });
  }

  const db = loadDb();
  const newId = 'prod-' + crypto.randomBytes(4).toString('hex');

  // Find unspash stock placeholder based on category
  let defaultImage = 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=800';
  if (category.toLowerCase().includes('tea')) {
    defaultImage = 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=80&w=800';
  } else if (category.toLowerCase().includes('hair')) {
    defaultImage = 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=800';
  } else if (category.toLowerCase().includes('aroma')) {
    defaultImage = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=800';
  }

  const newProduct = {
    id: newId,
    name: sanitizeString(name),
    description: sanitizeString(description || 'Organic ingredients formulated beautifully.'),
    ingredients: sanitizeString(ingredients || ''),
    benefits: sanitizeString(benefits || ''),
    usage: sanitizeString(usage || ''),
    category: sanitizeString(category),
    price: Number(price),
    images: [defaultImage],
    stock: Number(stock || 10),
    rating: 5.0,
    reviews: [],
    status: status === 'Draft' ? 'Draft' : 'Published',
    skinType: sanitizeString(skinType || ''),
    hairType: sanitizeString(hairType || ''),
    isRecurring: !!isRecurring
  };

  db.products.push(newProduct);
  logAuditAction(req.user!.id, req.user!.email, 'Product Created', `Added product: ${newProduct.name}`);
  saveDb(db);

  res.status(201).json({ message: 'Premium product added beautifully.', product: newProduct });
});

app.put('/api/admin/products/:id', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res) => {
  const db = loadDb();
  const product = db.products.find(p => p.id === req.params.id);

  if (!product) return res.status(404).json({ error: 'Product variant is missing in database.' });

  const { name, description, ingredients, benefits, usage, category, price, stock, status, skinType, hairType, isRecurring } = req.body;

  if (name) product.name = sanitizeString(name);
  if (description) product.description = sanitizeString(description);
  if (ingredients) product.ingredients = sanitizeString(ingredients);
  if (benefits) product.benefits = sanitizeString(benefits);
  if (usage) product.usage = sanitizeString(usage);
  if (category) product.category = sanitizeString(category);
  if (price !== undefined) product.price = Number(price);
  if (stock !== undefined) product.stock = Number(stock);
  if (status) product.status = status;
  if (skinType !== undefined) product.skinType = sanitizeString(skinType);
  if (hairType !== undefined) product.hairType = sanitizeString(hairType);
  if (isRecurring !== undefined) product.isRecurring = !!isRecurring;

  logAuditAction(req.user!.id, req.user!.email, 'Product Modified', `Edited skincare item: ${product.name}`);
  saveDb(db);

  res.json({ message: 'Product refined successfully.', product });
});

app.delete('/api/admin/products/:id', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res) => {
  const db = loadDb();
  const index = db.products.findIndex(p => p.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Product variant not registered.' });

  const prodName = db.products[index].name;
  db.products.splice(index, 1);

  logAuditAction(req.user!.id, req.user!.email, 'Product Deleted', `Removed SKU: ${prodName}`);
  saveDb(db);

  res.json({ message: 'Skincare catalog updated (SKU expunged).' });
});

// Manage users / Roles
app.get('/api/admin/users', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  // Strip credentials
  const sanitized = db.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isVerified: u.isVerified,
    loyaltyPoints: u.loyaltyPoints || 0,
    referralCode: u.referralCode,
    createdAt: u.createdAt
  }));
  res.json(sanitized);
});

// Update role (ONLY owner can update role)
app.put('/api/admin/users/:id/role', authenticateUser, requireOwner, (req: AuthenticatedRequest, res) => {
  const { role } = req.body;
  if (!['customer', 'admin', 'owner'].includes(role)) {
    return res.status(400).json({ error: 'Target role designation invalid.' });
  }

  const db = loadDb();
  const targetUser = db.users.find(u => u.id === req.params.id);

  if (!targetUser) return res.status(404).json({ error: 'User does not exist inside repository.' });

  const oldRole = targetUser.role;
  targetUser.role = role;

  logAuditAction(req.user!.id, req.user!.email, 'User Role Update', `Promoted ${targetUser.email} from ${oldRole} to ${role}`);
  saveDb(db);

  res.json({ message: 'Target authorization elevated successfully.', user: targetUser });
});

// GDPR actions: client deletion or export
app.delete('/api/profile/gdpr-delete', authenticateUser, (req: AuthenticatedRequest, res) => {
  const db = loadDb();
  const index = db.users.findIndex(u => u.id === req.user!.id);
  if (index === -1) return res.status(404).json({ error: 'Profile not found.' });

  const userEmail = db.users[index].email;

  // Purge user's orders and sessions
  db.orders = db.orders.filter(o => o.userId !== req.user!.id);
  db.sessions = db.sessions.filter(s => s.userId !== req.user!.id);
  db.resetTokens = db.resetTokens.filter(r => r.userId !== req.user!.id);
  db.verificationCodes = db.verificationCodes.filter(v => v.userId !== req.user!.id);

  db.users.splice(index, 1);
  saveDb(db);

  res.json({ message: 'In compliance with GDPR specifications, your profile and transaction histories have been permanently deleted.' });
});

app.get('/api/profile/gdpr-export', authenticateUser, (req: AuthenticatedRequest, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const userOrders = db.orders.filter(o => o.userId === req.user!.id);

  res.json({
    system: 'Natural Beauty & Total Wellness Store Engine',
    gdprReleaseDate: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      loyaltyPoints: user.loyaltyPoints,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      addresses: user.addresses
    },
    orders: userOrders
  });
});

// Static files and SPA serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Luxurious Storefront server listening on port ${PORT}`);
  });
}

startServer();
