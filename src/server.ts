import express from 'express';
import dotenv from 'dotenv';
import userRoutes from '@module/user/userRoute';

dotenv.config();
const app = express();

app.use(express.json());
app.use('/api/v1', userRoutes);

app.listen(process.env.PORT, () => {
  console.log("server is working");
});

export default app;
