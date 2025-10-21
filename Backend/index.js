const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const connect = require("./Connect");
const logger = require("./Middleware/winstonLogger");
const rateLimiter = require("./Middleware/rateLimiter");

const userRoutes = require("./Routes/User");
const courseRoutes = require("./Routes/Courses");
const enrollmentRoutes = require("./Routes/EnrollmentController");
const examRoutes = require("./Routes/Exams");
const moduleRoutes = require("./Routes/CourseModule");
const departmentRoutes = require("./Routes/Departments");
const termRoutes = require("./Routes/Terms");
const categoryRoutes = require("./Routes/CourseCatagory");
const assignmentRoutes = require("./Routes/Assignments");
const resultsRoutes = require("./Routes/Results");

const notificationRoutes = require("./Routes/Notifications");

const app = express();

// Middleware
app.use(cors());
// Configure helmet: allow cross-origin resource policy so frontend (different port) can load images/videos
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(rateLimiter);
app.use(express.json());
app.use(express.static("public"));
// Explicit static mount points for direct asset paths
app.use("/uploads", express.static("public/uploads"));
app.use("/api/uploads", express.static("public/uploads"));

const path = require("path");

app.get("/api/docs/actors", (req, res) => {
  res.sendFile(path.join(__dirname, "docs", "actors_endpoints.html"));
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/users", userRoutes);

app.use("/api/courses", courseRoutes);

app.use("/api/Enrollments", enrollmentRoutes);
// Aliases expected by frontend apiClient (keep legacy paths for backward compatibility)
app.use("/api/enroll", enrollmentRoutes);

app.use("/api/exams", examRoutes);

app.use("/api/modules", moduleRoutes);
// Frontend expects /api/coursemodule/* endpoints
app.use("/api/coursemodule", moduleRoutes);

app.use("/api/catagories", categoryRoutes);
// Alias singular spelling used in api client
app.use("/api/coursecatagory", categoryRoutes);

app.use("/api/departments", departmentRoutes);

app.use("/api/terms", termRoutes);

app.use("/api/notifications", notificationRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/results", resultsRoutes);

app.use((req, res, next) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Not Found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await connect();
    app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to connect to database:", err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
