import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import profileRoutes from "./routes/profile.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
