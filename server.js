require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: "*",   // allow all origins (for testing)
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Nodemailer setup with environment variables
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,  // ✅ Use environment variable
    pass: process.env.EMAIL_PASS   // ✅ App password stored in Render
  }
});

let orders = [];

/**
 * ==============================
 * API ROUTES
 * ==============================
 */

// Checkout endpoint
app.post('/api/checkout', (req, res) => {
  console.log("✅ Checkout route hit");
  const { name, email, address, cart, paymentMethod, orderId } = req.body;

  if (!cart || cart.length === 0) {
    return res.status(400).json({ success: false, error: "Cart is empty" });
  }

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const order = { orderId, name, email, address, cart, paymentMethod, total, status: 'Pending' };
  orders.push(order);

  // Format ordered items
  const itemsList = cart.map(item =>
    `${item.product.name} (x${item.quantity}) - ₦${(item.product.price * item.quantity).toLocaleString()}`
  ).join("\n");

  // User email
  const userMailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Your Order Confirmation - ${orderId}`,
    text: `Dear ${name},\n\nThank you for your order!\n\nOrder ID: ${orderId}\n\n📦 Ordered Items:\n${itemsList}\n\n💳 Payment Method: ${paymentMethod}\n📍 Delivery Address: ${address}\n\nTotal: ₦${total.toLocaleString()}\n\nWe’ll notify you once your order is shipped.\n\nBest regards,\nMouth Munchers`
  };

  // Admin email
  const adminMailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `New Order Received - ${orderId}`,
    text: `New order received!\n\nOrder ID: ${orderId}\nCustomer: ${name}\nEmail: ${email}\nAddress: ${address}\nPayment: ${paymentMethod}\n\n📦 Items Ordered:\n${itemsList}\n\nTotal: ₦${total.toLocaleString()}`
  };

  Promise.all([
    transporter.sendMail(userMailOptions),
    transporter.sendMail(adminMailOptions)
  ])
    .then(() => res.json({ success: true, orderId }))
    .catch(error => {
      console.error('❌ Email error:', error);
      res.status(500).json({ success: false, error: 'Failed to send emails' });
    });
});

// Order tracking endpoint
app.get('/api/order/:orderId', (req, res) => {
  const order = orders.find(o => o.orderId === req.params.orderId);
  if (order) res.json(order);
  else res.status(404).json({ error: 'Order not found' });
});

// Contact endpoint
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `New Contact Message from ${name}`,
    text: `From: ${name} <${email}>\n\nMessage:\n${message}`
  };

  transporter.sendMail(mailOptions)
    .then(() => res.json({ success: true }))
    .catch(error => {
      console.error('❌ Contact email error:', error);
      res.status(500).json({ success: false, error: 'Failed to send message' });
    });
});

// Start server
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
