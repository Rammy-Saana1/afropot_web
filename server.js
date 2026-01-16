// ===================== AFROPOT REGISTRATION, LOGIN & PAYMENT SERVER =====================

// 1️⃣ IMPORT DEPENDENCIES
require("dotenv").config(); // Load variables from .env file
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");

// 2️⃣ INITIALIZE APP
const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

// 3️⃣ STRIPE SETUP (SAFE: uses .env instead of hardcoding)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 4️⃣ NODEMAILER SETUP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "abdulrazaksaana855@gmail.com", // your Gmail
    pass: process.env.GMAIL_APP_PASSWORD, // from .env file (App Password)
  },
});

// 5️⃣ TEMPORARY STORAGE (until database is connected)
let registeredUsers = [];
let orders = [];

// ======================================================================
// 6️⃣ USER REGISTRATION
// ======================================================================
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required." });

    const exists = registeredUsers.find((u) => u.email === email);
    if (exists)
      return res.json({ success: false, error: "User already registered." });

    registeredUsers.push({ name, email, password });
    console.log(`✅ New Registration: ${name} (${email})`);

    // Notify admin via email
    const mailOptions = {
      from: "Afropot Registration <abdulrazaksaana855@gmail.com>",
      to: "abdulrazaksaana855@gmail.com",
      subject: `🧾 New Afropot Registration - ${name}`,
      text: `A new user has registered.\n\nName: ${name}\nEmail: ${email}`,
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) console.error("❌ Email error:", err);
      else console.log("📨 Registration email sent successfully!");
    });

    res.json({ success: true, message: "Registration successful." });
  } catch (error) {
    console.error("❌ Registration Error:", error.message);
    res.status(500).json({ error: "Registration failed." });
  }
});

// ======================================================================
// 7️⃣ USER LOGIN
// ======================================================================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required." });

    const user = registeredUsers.find(
      (u) => u.email === email && u.password === password
    );

    if (!user)
      return res.json({ success: false, error: "Invalid email or password." });

    console.log(`🔐 ${user.name} logged in.`);
    res.json({
      success: true,
      message: "Login successful!",
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("❌ Login Error:", error.message);
    res.status(500).json({ error: "Login failed." });
  }
});

// ======================================================================
// 8️⃣ CREATE BOOKING / PAYMENT SESSION
// ======================================================================
app.post("/create-booking-session", async (req, res) => {
  try {
    const { name, email, eventType, date, price } = req.body;

    if (!name || !email || !eventType || !date || !price)
      return res.status(400).json({ error: "Missing booking details." });

    // ✅ Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `Afropot Order - ${eventType}` },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // Redirect to delivery page after payment
      success_url: "http://127.0.0.1:5500/delivery.html?success=true",
      cancel_url: "http://127.0.0.1:5500/checkout.html?canceled=true",
      metadata: { name, email, eventType, date, price },
    });

    // Save temporary order data
    const order = { name, email, eventType, date, price, id: session.id };
    orders.push(order);
    console.log("🧾 New Order:", order);

    // Notify admin
    const mailOptions = {
      from: "Afropot Orders <abdulrazaksaana855@gmail.com>",
      to: "abdulrazaksaana855@gmail.com",
      subject: `🍽 New Afropot Order - ${eventType}`,
      text: `
New order received:
Name: ${name}
Email: ${email}
Event: ${eventType}
Date: ${date}
Amount: €${price}
      `,
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) console.error("❌ Email error:", err);
      else console.log("📨 Order email sent successfully!");
    });

    // Send session to frontend
    res.json({ id: session.id });
  } catch (error) {
    console.error("❌ Stripe Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ======================================================================
// 9️⃣ GET ALL ORDERS (DEBUGGING)
// ======================================================================
app.get("/orders", (req, res) => {
  res.json({ total: orders.length, orders });
});

// ======================================================================
// 🔟 ROOT & 404 HANDLERS
// ======================================================================
app.get("/", (req, res) => res.send("✅ Afropot Server Running Successfully!"));
app.use((req, res) => res.status(404).send("❌ Route not found."));

// ======================================================================
// 🚀 START SERVER
// ======================================================================
const PORT = 4242;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
