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
const GeneralRoute_1 = __importDefault(require("@module/general/GeneralRoute"));
const EducationRoute_1 = __importDefault(require("@module/education/EducationRoute"));
const LicenseRoute_1 = __importDefault(require("./module/license/LicenseRoute"));
const WorkExperienceRoute_1 = __importDefault(require("./module/work-experience/WorkExperienceRoute"));
const AchievementRoute_1 = __importDefault(require("./module/achievement/AchievementRoute"));
const ExpertiseRoute_1 = __importDefault(require("./module/expertise/ExpertiseRoute"));
const VerifyRoute_1 = __importDefault(require("./module/verify/VerifyRoute"));
const PortfolioRoute_1 = __importDefault(require("./module/portfolio/PortfolioRoute"));
const ServicePackageRoute_1 = __importDefault(require("./module/service-package/ServicePackageRoute"));
const ServiceCategoryRoute_1 = __importDefault(require("./module/service-category/ServiceCategoryRoute"));
const path_1 = __importDefault(require("path"));
const cors_1 = require("@middleware/cors");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Setup CORS middleware
app.use((0, cors_1.corsMiddleware)());
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
app.use("/api/v1/portfolios", PortfolioRoute_1.default);
app.use("/api/v1/service-packages", ServicePackageRoute_1.default);
app.use("/api/v1/service-categories", ServiceCategoryRoute_1.default);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`API Base URL: http://localhost:${PORT}/api/v1`);
});
exports.default = app;
