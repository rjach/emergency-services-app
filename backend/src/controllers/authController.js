const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 12;

const SERVICE_TYPES = new Set([
  "medical",
  "fire",
  "police",
  "rescue",
  "disaster",
]);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign({ sub: user._id.toString(), role: user.role }, secret, {
    expiresIn,
  });
}

function userToPublic(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    phone: user.phone || "",
    agency:
      user.role === "agency_admin" && user.agency
        ? {
            name: user.agency.name || "",
            serviceType: user.agency.serviceType || "",
            address: user.agency.address || "",
          }
        : null,
  };
}

async function signup(req, res) {
  try {
    const { role, email, password, phone, agencyName, serviceType, address } =
      req.body;

    if (!role || !["user", "agency_admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'role must be "user" or "agency_admin"',
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required for signup",
      });
    }

    let agency = undefined;
    if (role === "agency_admin") {
      if (!agencyName?.trim() || !serviceType || !address?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Agency signup requires agencyName, serviceType, and address",
        });
      }
      if (!SERVICE_TYPES.has(serviceType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid serviceType",
        });
      }
      agency = {
        name: agencyName.trim(),
        serviceType,
        address: address.trim(),
      };
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      phone: phone.trim(),
      agency: role === "agency_admin" ? agency : undefined,
    });

    const token = signToken(user);
    return res.status(201).json({
      success: true,
      token,
      user: userToPublic(user),
    });
  } catch (err) {
    console.error("signup error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not create account",
    });
  }
}

async function signin(req, res) {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    if (!role || !["user", "agency_admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'role must be "user" or "agency_admin"',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        message:
          role === "user"
            ? "This account is registered as an agency admin. Use Agency Admin sign-in."
            : "This account is a citizen account. Use User sign-in.",
      });
    }

    const token = signToken(user);
    return res.status(200).json({
      success: true,
      token,
      user: userToPublic(user),
    });
  } catch (err) {
    console.error("signin error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not sign in",
    });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    return res.status(200).json({
      success: true,
      user: userToPublic(user),
    });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not load profile",
    });
  }
}

module.exports = {
  signup,
  signin,
  me,
};
