// controllers/auth.controller.js
const User = require("../models/User.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const norm = (s) => (s ?? "").toString().trim();
const lower = (s) => norm(s).toLowerCase();
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function issueJwt(user) {
  const payload = { email: user.email };
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // This creates a clear log + prevents the vague jsonwebtoken error
    throw new Error("JWT_SECRET is not set (check your .env or runtime env)");
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(payload, secret, { expiresIn });
}

function toSafeUser(doc) {
  const u = doc?.toObject ? doc.toObject() : { ...doc };
  delete u.password;
  return u;
} 

/**
 * POST /auth/register
 * body: { firstName, lastName, email, phone?, password, gender?, dob? (ISO), roleName? }
 */
const registerUser = async (req, res) => {
  try {
    let { firstName, lastName, email, phone, password, gender, dob } =
      req.body || {};

    firstName = norm(firstName);
    lastName = norm(lastName);
    email = lower(email);
    phone = norm(phone);
    password = norm(password);

    // Basic validations
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    // Duplicate checks (email OR phone)
    const dup = await User.findOne({
      $or: [{ email }, ...(phone ? [{ phone }] : [])],
    }).lean();
    if (dup) {
      return res.status(409).json({ success: false, message: "Email or phone already in use" });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      password: hash,
      gender: gender || undefined,
      dob: dob || undefined,
    });

    const token = issueJwt(user);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      data: toSafeUser(user),
    });
  } catch (error) {
    console.error("registerUser error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const registerAdmin = async (req, res) => {
  try {

    let { firstName, lastName, email, phone, password, gender, dob, role } =
      req.body || {};

    firstName = norm(firstName);
    lastName = norm(lastName);
    email = lower(email);
    phone = norm(phone);
    password = norm(password);

    // Basic validations
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    // Duplicate checks (email OR phone)
    const dup = await User.findOne({
      $or: [{ email }, ...(phone ? [{ phone }] : [])],
    }).lean();
    if (dup) {
      return res.status(409).json({ success: false, message: "Email or phone already in use" });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      password: hash,
      gender: gender || undefined,
      dob: dob || undefined,
      role: role || undefined
    });

    const token = issueJwt(user);

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      token,
      data: toSafeUser(user),
    });
  } catch (error) {
    console.error("registerUser error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body || {};
    password = norm(password);

    if (!password || !email) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    // Build query
    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    // Fetch user with password
    // If your schema has password select:false, this ensures we still get it.
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Email not found" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    const token = issueJwt(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: toSafeUser(user),
    });
  } catch (error) {
    console.error("loginUser error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { registerUser, registerAdmin, loginUser };
