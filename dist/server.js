"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import module alias setup first
require("./moduleAlias");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const AuthRoute_1 = __importDefault(require("@module/auth/AuthRoute"));
const ProfileRoute_1 = __importDefault(require("@module/profile/ProfileRoute"));
const GeneralRoute_1 = __importDefault(require("@module/general/GeneralRoute"));
const FileRoute_1 = __importDefault(require("@module/general/FileRoute"));
const EducationRoute_1 = __importDefault(require("@module/education/EducationRoute"));
const LicenseRoute_1 = __importDefault(require("./module/license/LicenseRoute"));
const WorkExperienceRoute_1 = __importDefault(require("./module/work-experience/WorkExperienceRoute"));
const AchievementRoute_1 = __importDefault(require("./module/achievement/AchievementRoute"));
const ExpertiseRoute_1 = __importDefault(require("./module/expertise/ExpertiseRoute"));
const VerifyRoute_1 = __importDefault(require("./module/verify/VerifyRoute"));
const PortfolioRoute_1 = __importDefault(require("./module/portfolio/PortfolioRoute"));
const InvestmentPortfolioRoute_1 = __importDefault(require("./module/investment-portfolio/InvestmentPortfolioRoute"));
const FounderProjectRoute_1 = __importDefault(require("./module/founder-project/FounderProjectRoute"));
const ProposalRoute_1 = __importDefault(require("./module/proposal/ProposalRoute"));
const ChatRoute_1 = __importDefault(require("./module/chat/ChatRoute"));
const ServicePackageRoute_1 = __importDefault(require("./module/service-package/ServicePackageRoute"));
const ServiceCategoryRoute_1 = __importDefault(require("./module/service-category/ServiceCategoryRoute"));
const BillingRoute_1 = __importDefault(require("./module/billing/BillingRoute"));
const ReviewRoute_1 = __importDefault(require("./module/review/ReviewRoute"));
const path_1 = __importDefault(require("path"));
const cors_1 = require("@middleware/cors");
const loggerService_1 = require("@services/loggerService");
// Bull Board for queue monitoring
const bullBoard_1 = require("./config/bullBoard");
const app = (0, express_1.default)();
// Setup CORS middleware
app.use((0, cors_1.corsMiddleware)());
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "..", "uploads")));
app.use("/api/v1", AuthRoute_1.default);
app.use("/api/v1/profile", ProfileRoute_1.default);
app.use("/api/v1", GeneralRoute_1.default);
app.use("/api/v1/files", FileRoute_1.default);
app.use("/api/v1", EducationRoute_1.default);
app.use("/api/v1/licenses", LicenseRoute_1.default);
app.use("/api/v1/work-experiences", WorkExperienceRoute_1.default);
app.use("/api/v1/achievements", AchievementRoute_1.default);
app.use("/api/v1/expertises", ExpertiseRoute_1.default);
app.use("/api/v1/verify", VerifyRoute_1.default);
app.use("/api/v1/portfolios", PortfolioRoute_1.default);
app.use("/api/v1/investment-portfolios", InvestmentPortfolioRoute_1.default);
app.use("/api/v1/founder-projects", FounderProjectRoute_1.default);
app.use("/api/v1/proposals", ProposalRoute_1.default);
app.use("/api/v1", ChatRoute_1.default);
app.use("/api/v1/service-packages", ServicePackageRoute_1.default);
app.use("/api/v1/service-categories", ServiceCategoryRoute_1.default);
app.use("/api/v1/billing", BillingRoute_1.default);
app.use("/api/v1/reviews", ReviewRoute_1.default);
// Bull Board UI for queue monitoring (only in development)
if (process.env.NODE_ENV !== 'production') {
    app.use('/admin/queues', bullBoard_1.serverAdapter.getRouter());
    loggerService_1.Log.info('Bull Board available at: http://localhost:4000/admin/queues');
}
const PORT = process.env.PORT || 4000;
const httpServer = http_1.default.createServer(app);
async function start() {
    httpServer.listen(PORT, () => {
        loggerService_1.Log.info(`API Base URL: http://localhost:${PORT}/api/v1`);
    });
}
start();
exports.default = app;
