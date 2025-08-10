const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const connect = require('./Connect');
const logger = require('./Middleware/winstonLogger');
const rateLimiter = require('./Middleware/rateLimiter');


const userRoutes = require('./Routes/User');
const courseRoutes = require('./Routes/Courses');
const enrollmentRoutes = require('./Routes/EnrollmentController');
const examRoutes = require('./Routes/Exams');
const moduleRoutes = require('./Routes/CourseModule');
const departmentRoutes = require('./Routes/Departments');
const termRoutes = require('./Routes/Terms');
const categoryRoutes = require('./Routes/CourseCatagory');


const notificationRoutes = require('./Routes/Notifications');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(rateLimiter);
app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static('public'));


const path = require('path');

app.get('/api/docs/actors', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'actors_endpoints.html'));
});


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));



app.use('/api/users', userRoutes);

app.use('/api/courses', courseRoutes);

app.use('/api/Enrollments', enrollmentRoutes);

app.use('/api/exams', examRoutes);

app.use('/api/modules', moduleRoutes);

app.use('/api/catagories', categoryRoutes);

app.use('/api/departments', departmentRoutes);

app.use('/api/terms', termRoutes);


app.use('/api/notifications', notificationRoutes);



app.use((req, res, next) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Not Found' });
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 8080;


const startServer = async () => {
  try {
    await connect();
    app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to connect to database:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
