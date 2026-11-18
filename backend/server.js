require('dotenv').config();
const app = require('./app');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy backend/.env.example to backend/.env first.');
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`FitLean API running on http://localhost:${PORT}`);
});
