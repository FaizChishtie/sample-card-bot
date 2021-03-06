"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const restify = require("restify");
const path = require("path");
const dotenv_1 = require("dotenv");
// Import required bot services. See https://aka.ms/bot-services to learn more about the different parts of a bot.
const botbuilder_1 = require("botbuilder");
const teams = require("botbuilder-teams");
// Import required bot configuration.
const botframework_config_1 = require("botframework-config");
const bot_1 = require("./bot");
const echoBot_1 = require("./echoBot");
// Read botFilePath and botFileSecret from .env file
// Note: Ensure you have a .env file and include botFilePath and botFileSecret.
const ENV_FILE = path.join(__dirname, '..', '.env');
const loadFromEnv = dotenv_1.config({ path: ENV_FILE });
// Get the .bot file path
// See https://aka.ms/about-bot-file to learn more about .bot file its use and bot configuration.
const BOT_FILE = path.join(__dirname, '..', (process.env.botFilePath || ''));
let botConfig;
try {
    // read bot configuration from .bot file.
    botConfig = botframework_config_1.BotConfiguration.loadSync(BOT_FILE, process.env.botFileSecret);
}
catch (err) {
    console.error(`\nError reading bot file. Please ensure you have valid botFilePath and botFileSecret set for your environment.`);
    console.error(`\n - The botFileSecret is available under appsettings for your Azure Bot Service bot.`);
    console.error(`\n - If you are running this bot locally, consider adding a .env file with botFilePath and botFileSecret.`);
    console.error(`\n - See https://aka.ms/about-bot-file to learn more about .bot file its use and bot configuration.\n\n`);
    process.exit();
}
// For local development configuration as defined in .bot file.
const DEV_ENVIRONMENT = 'development';
// Define name of the endpoint configuration section from the .bot file.
const BOT_CONFIGURATION = (process.env.NODE_ENV || DEV_ENVIRONMENT);
// Get bot endpoint configuration by service name.
// Bot configuration as defined in .bot file.
const endpointConfig = botConfig.findServiceByNameOrId(BOT_CONFIGURATION);
// // Create adapter. 
// See https://aka.ms/about-bot-adapter to learn more about to learn more about bot adapter.
const botSetting = {
    appId: (endpointConfig && endpointConfig.appId) || process.env.microsoftAppID,
    appPassword: (endpointConfig && endpointConfig.appPassword) || process.env.microsoftAppPassword,
};
const adapter = new teams.TeamsAdapter(botSetting);
// Use Teams middleware
adapter.use(new teams.TeamsMiddleware());
// Catch-all for any unhandled errors in your bot.
adapter.onTurnError = (turnContext, error) => __awaiter(this, void 0, void 0, function* () {
    // This check writes out errors to console log .vs. app insights.
    console.error(`\n [onTurnError]: ${error}`);
    // Send a message to the user.
    turnContext.sendActivity(`Oops. Something went wrong!`);
    // Clear out state and save changes so the user is not stuck in a bad state.
    yield conversationState.clear(turnContext);
    yield conversationState.saveChanges(turnContext);
});
// For local development, in-memory storage is used.
// CAUTION: The Memory Storage used here is for local bot debugging only. When the bot
// is restarted, anything stored in memory will be gone.
const memoryStorage = new botbuilder_1.MemoryStorage();
// Define a state store for your bot. See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state store to persist the dialog and user state between messages.
// let conversationState = new ConversationState(memoryStorage);
let conversationState = new teams.TeamSpecificConversationState(memoryStorage);
// CAUTION: You must ensure your product environment has the NODE_ENV set
//          to use the Azure Blob storage or Azure Cosmos DB providers.
// import { BlobStorage } from 'botbuilder-azure';
// Storage configuration name or ID from .bot file
// const STORAGE_CONFIGURATION_ID = '<STORAGE-NAME-OR-ID-FROM-BOT-FILE>';
// // Default container name
// const DEFAULT_BOT_CONTAINER = '<DEFAULT-CONTAINER>';
// // Get service configuration
// const blobStorageConfig = botConfig.findServiceByNameOrId(STORAGE_CONFIGURATION_ID);
// const blobStorage = new BlobStorage({
//     containerName: (blobStorageConfig.container || DEFAULT_BOT_CONTAINER),
//     storageAccountOrConnectionString: blobStorageConfig.connectionString,
// });
// conversationState = new ConversationState(blobStorage);
// Create the TeamsBot or echo bot in local.
console.log(process.env.botType);
const bot = (process.env.botType && process.env.botType == "echoBot") ? new echoBot_1.EchoBot() : new bot_1.TeamsBot(conversationState);
// Create HTTP server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`\n${server.name} listening to ${server.url}`);
    console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator.`);
    console.log(`\nTo talk to your bot, open teams-bot.bot file in the Emulator.`);
});
// Listen for incoming activities and route them to your bot for processing.
server.use(require('restify-plugins').bodyParser());
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, (turnContext) => __awaiter(this, void 0, void 0, function* () {
        // Call bot.run() to handle all incoming messages.
        yield bot.run(turnContext);
    }));
});
server.get('/auth/:state', (req, res) => {
    const body = onAuthResultBody(true, req.params.state);
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/html'
    });
    res.write(body);
    res.end();
});
const onAuthResultBody = (succeeded, state, teamsSdk = 'https://statics.teams.microsoft.com/sdk/v1.0/js/MicrosoftTeams.min.js') => {
    return succeeded ? `
    <html>
    <head>
        <script src='${teamsSdk}'></script>        
    </head>
    <body>
        <script>
        function execute() {
        console.dir(microsoftTeams);
        microsoftTeams.initialize();
        microsoftTeams.authentication.notifySuccess('${state}');
        }
        </script>
        <button onClick="execute()">Ok</button>
    </body>
    </html>
    ` : `
    <html>
    <head>
        <script src='${teamsSdk}'></script>
    </head>
    <body>
        <script>
        microsoftTeams.initialize();
        microsoftTeams.authentication.notifyFailure();
        </script>
        <button onClick="execute()">Failed</button>
    </body>
    </html>
`;
};
//# sourceMappingURL=app.js.map