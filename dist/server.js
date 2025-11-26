"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import module alias setup first
require("./moduleAlias");
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const AuthRoute_1 = __importDefault(require("@module/auth/AuthRoute"));
const ProfileRoute_1 = __importDefault(require("@module/profile/ProfileRoute"));
const GeneralRoute_1 = __importDefault(require("@module/location/GeneralRoute"));
const EducationRoute_1 = __importDefault(require("@module/education/EducationRoute"));
const LicenseRoute_1 = __importDefault(require("./module/license/LicenseRoute"));
const WorkExperienceRoute_1 = __importDefault(require("./module/work-experience/WorkExperienceRoute"));
const AchievementRoute_1 = __importDefault(require("./module/achievement/AchievementRoute"));
const ExpertiseRoute_1 = __importDefault(require("./module/expertise/ExpertiseRoute"));
const VerifyRoute_1 = __importDefault(require("./module/verify/VerifyRoute"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_APP_URL || "http://127.0.0.1:3000", // Fallback for development
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "..", "uploads")));
app.use("/api/v1", AuthRoute_1.default);
app.use("/api/v1", ProfileRoute_1.default);
app.use("/api/v1", GeneralRoute_1.default);
app.use("/api/v1", EducationRoute_1.default);
app.use("/api/v1/licenses", LicenseRoute_1.default);
app.use("/api/v1/work-experiences", WorkExperienceRoute_1.default);
app.use("/api/v1/achievements", AchievementRoute_1.default);
app.use("/api/v1/expertises", ExpertiseRoute_1.default);
app.use("/api/v1/verify", VerifyRoute_1.default);
app.listen(process.env.PORT, () => {
    console.log("server is working");
});
exports.default = app;
