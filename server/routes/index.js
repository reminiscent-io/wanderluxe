"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
var share_notification_1 = __importDefault(require("./share-notification"));
function registerRoutes(app) {
    // Register all routes here
    app.use(share_notification_1.default);
}
