import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// =========================
// SIGNUP
// =========================
router.post("/signup", async (req, res) => {
  try {
    console.log("========== SIGNUP REQUEST ==========");

    console.log("Request body:", {
      name: req.body?.name,
      email: req.body?.email,
      password: req.body?.password
        ? "[PROVIDED]"
        : "[MISSING]",
    });

    const { name, email, password } = req.body;

    // =========================
    // VALIDATION
    // =========================
    if (!name || !email || !password) {
      console.log(
        "Signup validation failed: Missing fields"
      );

      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      console.log(
        "Signup validation failed: Password too short"
      );

      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    console.log(
      "Normalized email:",
      normalizedEmail
    );

    // =========================
    // PREVENT ADMIN SIGNUP
    // =========================
    if (
      process.env.ADMIN_EMAIL &&
      normalizedEmail ===
        process.env.ADMIN_EMAIL
          .toLowerCase()
          .trim()
    ) {
      console.log(
        "Signup blocked: Admin email used"
      );

      return res.status(403).json({
        message: "This email is reserved for admin",
      });
    }

    // =========================
    // CHECK EXISTING USER
    // =========================
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      console.log(
        "Signup blocked: Email already exists"
      );

      return res.status(409).json({
        message: "Email already registered",
      });
    }

    console.log("No existing user found");
    console.log("Hashing password...");

    // =========================
    // HASH PASSWORD
    // =========================
    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    console.log(
      "Password hashed successfully"
    );

    console.log(
      "Creating employee in MongoDB..."
    );

    // =========================
    // CREATE USER
    // =========================
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "employee",
    });

    // =========================
    // DATABASE DEBUG
    // =========================
    const totalUsers = await User.countDocuments();

    console.log(
      "======================================"
    );

    console.log(
      "USER CREATED SUCCESSFULLY"
    );

    console.log(
      "User ID:",
      user._id.toString()
    );

    console.log(
      "User name:",
      user.name
    );

    console.log(
      "User email:",
      user.email
    );

    console.log(
      "User role:",
      user.role
    );

    console.log(
      "--------------------------------------"
    );

    console.log(
      "DATABASE NAME:",
      User.db.name
    );

    console.log(
      "COLLECTION NAME:",
      User.collection.name
    );

    console.log(
      "TOTAL USERS IN DATABASE:",
      totalUsers
    );

    console.log(
      "======================================"
    );

    return res.status(201).json({
      message: "Account created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "========== SIGNUP ERROR =========="
    );

    console.error(
      "Error name:",
      error.name
    );

    console.error(
      "Error message:",
      error.message
    );

    console.error(error);

    console.error(
      "==================================="
    );

    return res.status(500).json({
      message: "Server error during signup",
      error: error.message,
    });
  }
});

// =========================
// LOGIN
// =========================
router.post("/login", async (req, res) => {
  try {
    console.log(
      "========== LOGIN REQUEST =========="
    );

    const { email, password } = req.body;

    console.log(
      "Login email:",
      email
    );

    console.log(
      "Password provided:",
      password ? "YES" : "NO"
    );

    // =========================
    // VALIDATION
    // =========================
    if (!email || !password) {
      console.log(
        "Login validation failed: Missing fields"
      );

      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    // =====================================
    // ADMIN LOGIN
    // =====================================
    if (
      process.env.ADMIN_EMAIL &&
      normalizedEmail ===
        process.env.ADMIN_EMAIL
          .toLowerCase()
          .trim()
    ) {
      console.log(
        "Admin login attempt"
      );

      if (!process.env.ADMIN_PASSWORD_HASH) {
        console.error(
          "ADMIN_PASSWORD_HASH is missing in environment"
        );

        return res.status(500).json({
          message:
            "Admin authentication is not configured",
        });
      }

      const isAdminPasswordValid =
        await bcrypt.compare(
          password,
          process.env.ADMIN_PASSWORD_HASH
        );

      if (!isAdminPasswordValid) {
        console.log(
          "Admin password invalid"
        );

        return res.status(401).json({
          message:
            "Invalid email or password",
        });
      }

      console.log(
        "Admin password valid"
      );

      const token = jwt.sign(
        {
          userId: "admin",
          role: "admin",
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "1d",
        }
      );

      console.log(
        "Admin login successful"
      );

      return res.json({
        message:
          "Admin login successful",

        token,

        user: {
          id: "admin",
          name: "Admin",
          email: process.env.ADMIN_EMAIL,
          role: "admin",
        },
      });
    }

    // =====================================
    // EMPLOYEE LOGIN
    // =====================================
    console.log(
      "Employee login attempt"
    );

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      console.log(
        "Employee not found:",
        normalizedEmail
      );

      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    console.log(
      "Employee found:",
      user._id.toString()
    );

    // =========================
    // PASSWORD CHECK
    // =========================
    const isPasswordValid =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isPasswordValid) {
      console.log(
        "Employee password invalid"
      );

      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    console.log(
      "Employee password valid"
    );

    // =========================
    // CREATE TOKEN
    // =========================
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    console.log(
      "Employee login successful"
    );

    console.log(
      "================================="
    );

    return res.json({
      message: "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "========== LOGIN ERROR =========="
    );

    console.error(
      "Error name:",
      error.name
    );

    console.error(
      "Error message:",
      error.message
    );

    console.error(error);

    console.error(
      "================================="
    );

    return res.status(500).json({
      message:
        "Server error during login",
      error: error.message,
    });
  }
});

export default router;