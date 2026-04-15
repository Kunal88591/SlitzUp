const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/config.js", (_req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

  res.type("application/javascript");
  res.send(
    `window.SLITZUP_CONFIG = { SUPABASE_URL: "${supabaseUrl}", SUPABASE_ANON_KEY: "${supabaseAnonKey}" };`
  );
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`SlitzUp running on http://localhost:${port}`);
});
