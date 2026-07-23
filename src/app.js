import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.routes.js";
import verificationRoutes from "./routes/verification.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import { csrfProtection } from "./middleware/csrf.js";
import config from "./config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for EJS templates
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Express Session configuration
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CSRF Protection middleware
app.use(csrfProtection);

app.use(verificationRoutes);
app.use(authRoutes);
app.use('/api', uploadRoutes);
app.use('/api', profileRoutes);


app.get("/", (req, res) => {
  res.redirect("/auth/login");
});

app.use((req, res) => {
  res
    .status(404)
    .json({ success: false, message: "Resource not found.", data: null });
});

app.use((err, req, res, next) => {
  res
    .status(500)
    .json({
      success: false,
      message: "An unexpected error occurred.",
      data: null,
    });
});

const PORT = 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
