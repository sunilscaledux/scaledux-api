import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import userRoutes from '@module/user/userRoute';
import cors from 'cors';


dotenv.config();
const app = express();


app.use(
  cors({
    origin: process.env.CLIENT_APP_URL || "http://127.0.0.1:3000", // Fallback for development
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);


app.use(express.json());
app.use(cookieParser());
app.use('/api/v1', userRoutes);

app.listen(process.env.PORT, () => {
  console.log("server is working");
});

export default app;
