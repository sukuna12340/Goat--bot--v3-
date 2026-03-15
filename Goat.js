/**
 * 👑 MASTERBOT V3 - L'ULTIME BOT MESSENGER
 * 
 * @author MASTERBOT Team
 * @credits Basé sur GoatBot par NTKhang
 * @version 3.0.0 - Mars 2026
 * 
 * ⚡ Évolution majeure avec IA, anti-ban, dashboard moderne
 * 🔒 Code optimisé et sécurisé
 * 🚀 Performances améliorées
 */

// ==================== GESTION DES ERREURS ====================
process.on('unhandledRejection', error => {
	console.error('❌ Unhandled Rejection:', error);
	global.GoatBot.stats.errors++;
});

process.on('uncaughtException', error => {
	console.error('❌ Uncaught Exception:', error);
	global.GoatBot.stats.errors++;
});

process.on('warning', warning => {
	if (global.GoatBot.config.debug) {
		console.warn('⚠️ Warning:', warning);
	}
});

// ==================== IMPORTS ====================
const axios = require("axios");
const fs = require("fs-extra");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");
const { execSync } = require('child_process');
const path = require("path");
const chalk = require('chalk');
const moment = require('moment');
const cron = require('node-cron');
const { OpenAI } = require('openai');
require('dotenv').config();

// ==================== LOGGER AMÉLIORÉ ====================
const log = {
	info: (module, message) => console.log(chalk.blue(`[${moment().format('HH:mm:ss')}] ℹ️ [${module}]`), message),
	success: (module, message) => console.log(chalk.green(`[${moment().format('HH:mm:ss')}] ✅ [${module}]`), message),
	warn: (module, message) => console.log(chalk.yellow(`[${moment().format('HH:mm:ss')}] ⚠️ [${module}]`), message),
	error: (module, message) => console.log(chalk.red(`[${moment().format('HH:mm:ss')}] ❌ [${module}]`), message),
	debug: (module, message) => {
		if (global.GoatBot.config.debug) {
			console.log(chalk.gray(`[${moment().format('HH:mm:ss')}] 🔍 [${module}]`), message);
		}
	},
	master: (module, message) => console.log(chalk.hex('#ff69b4')(`[${moment().format('HH:mm:ss')}] 👑 [${module}]`), message)
};
global.log = log;

// ==================== DISABLE WARNINGS ====================
process.env.BLUEBIRD_W_FORGOTTEN_RETURN = 0;

// ==================== VALIDATION JSON ====================
function validJSON(pathDir) {
	try {
		if (!fs.existsSync(pathDir))
			throw new Error(`File "${pathDir}" not found`);
		execSync(`npx jsonlint "${pathDir}"`, { stdio: 'pipe' });
		return true;
	}
	catch (err) {
		let msgError = err.message;
		msgError = msgError.split("\n").slice(1).join("\n");
		const indexPos = msgError.indexOf("    at");
		msgError = msgError.slice(0, indexPos != -1 ? indexPos - 1 : msgError.length);
		throw new Error(msgError);
	}
}

// ==================== CHEMINS DES FICHIERS ====================
const { NODE_ENV } = process.env;
const dirConfig = path.normalize(`${__dirname}/config${['production', 'development'].includes(NODE_ENV) ? '.dev.json' : '.json'}`);
const dirConfigCommands = path.normalize(`${__dirname}/configCommands${['production', 'development'].includes(NODE_ENV) ? '.dev.json' : '.json'}`);
const dirAccount = path.normalize(`${__dirname}/account${['production', 'development'].includes(NODE_ENV) ? '.dev.txt' : '.txt'}`);
const dirEnv = path.normalize(`${__dirname}/.env`);

// ==================== VALIDATION DES FICHIERS ====================
for (const pathDir of [dirConfig, dirConfigCommands]) {
	try {
		validJSON(pathDir);
	}
	catch (err) {
		log.error("CONFIG", `❌ Invalid JSON file "${pathDir.replace(__dirname, "")}":\n${err.message.split("\n").map(line => `  ${line}`).join("\n")}\nPlease fix it and restart bot`);
		process.exit(0);
	}
}

// ==================== CHARGEMENT CONFIG ====================
const config = require(dirConfig);
if (config.whiteListMode?.whiteListIds && Array.isArray(config.whiteListMode.whiteListIds))
	config.whiteListMode.whiteListIds = config.whiteListMode.whiteListIds.map(id => id.toString());

const configCommands = require(dirConfigCommands);

// ==================== GLOBAL MASTERBOT ====================
global.MasterBot = {
	// Informations de base
	version: '3.0.0',
	startTime: Date.now() - process.uptime() * 1000,
	botID: null,
	fcaApi: null,
	
	// Commandes et événements
	commands: new Map(),
	eventCommands: new Map(),
	commandFilesPath: [],
	eventCommandsFilesPath: [],
	aliases: new Map(),
	
	// Handlers
	onFirstChat: [],
	onChat: [],
	onEvent: [],
	onReply: new Map(),
	onReaction: new Map(),
	onAnyEvent: [],
	
	// Configuration
	config,
	configCommands,
	envCommands: configCommands.envCommands || {},
	envEvents: configCommands.envEvents || {},
	envGlobal: configCommands.envGlobal || {},
	
	// IA
	ai: null,
	aiPersonalitites: new Map(),
	
	// Statistiques
	stats: {
		startTime: Date.now(),
		messagesProcessed: 0,
		commandsExecuted: 0,
		errors: 0,
		aiRequests: 0,
		imagesGenerated: 0
	},
	
	// Anti-ban
	antiBan: {
		enabled: config.antiBan?.enabled || true,
		messageDelay: config.antiBan?.messageDelay || { min: 800, max: 2500 },
		actionDelay: config.antiBan?.actionDelay || { min: 1500, max: 4000 },
		stealthMode: config.antiBan?.stealthMode || true
	},
	
	// Dashboard
	dashboard: {
		enabled: config.dashboard?.enabled || true,
		port: config.dashboard?.port || 3000,
		connections: 0
	},
	
	// Fonctions utilitaires
	reLoginBot: function() { },
	Listening: null,
	oldListening: [],
	callbackListenTime: {},
	storage5Message: []
};

// Pour compatibilité avec anciens scripts
global.GoatBot = global.MasterBot;

// ==================== INITIALISATION IA ====================
async function initAI() {
	if (process.env.OPENAI_API_KEY) {
		try {
			global.MasterBot.ai = new OpenAI({ 
				apiKey: process.env.OPENAI_API_KEY,
				timeout: 30000,
				maxRetries: 3
			});
			
			// Test de connexion
			await global.MasterBot.ai.chat.completions.create({
				model: "gpt-3.5-turbo",
				messages: [{ role: "user", content: "test" }],
				max_tokens: 5
			});
			
			log.success("IA", "✅ Intelligence Artificielle initialisée avec succès");
			
			// Charger les personnalités
			loadAIPersonalities();
			
		} catch (error) {
			log.error("IA", `❌ Erreur initialisation IA: ${error.message}`);
			global.MasterBot.ai = null;
		}
	} else {
		log.warn("IA", "⚠️ Clé OpenAI non trouvée, certaines fonctionnalités IA seront désactivées");
	}
}

function loadAIPersonalities() {
	const personalities = {
		master: "Tu es MASTERBOT, un assistant puissant et amical. Réponds de manière utile et précise.",
		madara: "Tu es Madara Uchiha, personnage de Naruto. Puissant, mystérieux, avec une once de folie.",
		friendly: "Tu es un assistant amical et chaleureux. Toujours positif et encourageant.",
		expert: "Tu es un expert technique. Réponses précises, détaillées et professionnelles.",
		poet: "Tu es un poète. Réponses élégantes, métaphoriques et philosophiques.",
		gandalf: "Tu es Gandalf le Gris. Sage, mystérieux, avec des expressions du Seigneur des Anneaux.",
		vador: "Tu es Dark Vador. Sombre, puissant, parle du côté obscur.",
		goku: "Tu es Goku. Énergique, combatif, parle de Dragon Ball Z.",
		sherlock: "Tu es Sherlock Holmes. Analytique, déductif, résous des mystères.",
		einstein: "Tu es Albert Einstein. Génie scientifique, explique des concepts complexes."
	};
	
	for (const [name, prompt] of Object.entries(personalities)) {
		global.MasterBot.aiPersonalitites.set(name, prompt);
	}
	
	log.debug("IA", `📚 ${global.MasterBot.aiPersonalitites.size} personnalités chargées`);
}

// ==================== BASE DE DONNÉES ====================
global.db = {
	allThreadData: [],
	allUserData: [],
	allDashBoardData: [],
	allGlobalData: [],
	
	threadModel: null,
	userModel: null,
	dashboardModel: null,
	globalModel: null,
	
	threadsData: null,
	usersData: null,
	dashBoardData: null,
	globalData: null,
	
	receivedTheFirstMessage: {}
};

// ==================== CLIENT ====================
global.client = {
	dirConfig,
	dirConfigCommands,
	dirAccount,
	dirEnv,
	countDown: {},
	cache: {},
	database: {
		creatingThreadData: [],
		creatingUserData: [],
		creatingDashBoardData: [],
		creatingGlobalData: []
	},
	commandBanned: configCommands.commandBanned || []
};

// ==================== TEMP ====================
global.temp = {
	createThreadData: [],
	createUserData: [],
	createThreadDataError: [],
	filesOfGoogleDrive: {
		arraybuffer: {},
		stream: {},
		fileNames: {}
	},
	contentScripts: {
		cmds: {},
		events: {}
	}
};

// ==================== UTILS ====================
const utils = require("./utils.js");
global.utils = utils;
const { colors } = utils;

// ==================== WATCH CONFIG FILES ====================
const watchAndReloadConfig = (dir, type, prop, logName) => {
	let lastModified = fs.statSync(dir).mtimeMs;
	let isFirstModified = true;

	fs.watch(dir, (eventType) => {
		if (eventType === type) {
			const oldConfig = global.MasterBot[prop];

			setTimeout(() => {
				try {
					if (isFirstModified) {
						isFirstModified = false;
						return;
					}
					if (lastModified === fs.statSync(dir).mtimeMs) {
						return;
					}
					global.MasterBot[prop] = JSON.parse(fs.readFileSync(dir, 'utf-8'));
					log.success(logName, `🔄 Rechargé ${dir.replace(process.cwd(), "")}`);
				}
				catch (err) {
					log.warn(logName, `⚠️ Impossible de recharger ${dir.replace(process.cwd(), "")}`);
					global.MasterBot[prop] = oldConfig;
				}
				finally {
					lastModified = fs.statSync(dir).mtimeMs;
				}
			}, 200);
		}
	});
};

watchAndReloadConfig(dirConfigCommands, 'change', 'configCommands', 'CONFIG COMMANDS');
watchAndReloadConfig(dirConfig, 'change', 'config', 'CONFIG');

// ==================== ENV VARIABLES ====================
global.MasterBot.envGlobal = global.MasterBot.configCommands.envGlobal || {};
global.MasterBot.envCommands = global.MasterBot.configCommands.envCommands || {};
global.MasterBot.envEvents = global.MasterBot.configCommands.envEvents || {};

// ==================== AUTO RESTART ====================
if (config.autoRestart) {
	const time = config.autoRestart.time;
	if (!isNaN(time) && time > 0) {
		log.info("AUTO RESTART", `⏰ Redémarrage automatique dans ${utils.convertTime(time, true)}`);
		setTimeout(() => {
			log.info("AUTO RESTART", "🔄 Redémarrage en cours...");
			process.exit(2);
		}, time);
	}
	else if (typeof time == "string" && time.match(/^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})$/gmi)) {
		log.info("AUTO RESTART", `⏰ Redémarrage automatique programmé (${time})`);
		cron.schedule(time, () => {
			log.info("AUTO RESTART", "🔄 Redémarrage en cours...");
			process.exit(2);
		});
	}
}

// ==================== MAIN ====================
(async () => {
	// Afficher la bannière
	console.log(chalk.hex('#ff69b4')(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ███╗   ███╗ █████╗ ███████╗████████╗███████╗██████╗   ║
║   ████╗ ████║██╔══██╗██╔════╝╚══██╔══╝██╔════╝██╔══██╗  ║
║   ██╔████╔██║███████║███████╗   ██║   █████╗  ██████╔╝  ║
║   ██║╚██╔╝██║██╔══██║╚════██║   ██║   ██╔══╝  ██╔══██╗  ║
║   ██║ ╚═╝ ██║██║  ██║███████║   ██║   ███████╗██║  ██║  ║
║   ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝  ║
║                                                          ║
║                    VERSION 3.0.0                         ║
║              L'ULTIME BOT MESSENGER                      ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
	`));
	
	log.master("MASTERBOT", "👑 Initialisation du bot...");
	
	// ==================== INIT MAIL ====================
	try {
		const { gmailAccount } = config.credentials || {};
		if (gmailAccount?.email) {
			const { email, clientId, clientSecret, refreshToken } = gmailAccount;
			const OAuth2 = google.auth.OAuth2;
			const OAuth2_client = new OAuth2(clientId, clientSecret);
			OAuth2_client.setCredentials({ refresh_token: refreshToken });
			
			const accessToken = await OAuth2_client.getAccessToken();
			
			const transporter = nodemailer.createTransport({
				host: 'smtp.gmail.com',
				service: 'Gmail',
				auth: {
					type: 'OAuth2',
					user: email,
					clientId,
					clientSecret,
					refreshToken,
					accessToken: accessToken.token
				}
			});
			
			async function sendMail({ to, subject, text, html, attachments }) {
				const mailOptions = {
					from: email,
					to,
					subject,
					text,
					html,
					attachments
				};
				return await transporter.sendMail(mailOptions);
			}
			
			global.utils.sendMail = sendMail;
			global.utils.transporter = transporter;
			log.success("MAIL", "✅ Service email initialisé");
		}
	} catch (err) {
		log.warn("MAIL", "⚠️ Service email non disponible");
	}
	
	// ==================== INIT IA ====================
	await initAI();
	
	// ==================== CHECK VERSION ====================
	try {
		const { data: { version } } = await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2/main/package.json");
		const currentVersion = require("./package.json").version;
		if (compareVersion(version, currentVersion) === 1) {
			log.master("UPDATE", `📦 Nouvelle version disponible: ${chalk.gray(currentVersion)} → ${chalk.hex('#eb6a07')(version)}`);
			log.master("UPDATE", `📝 Tapez "${chalk.cyan('node update')}" pour mettre à jour`);
		}
	} catch (err) {
		log.debug("VERSION", "Impossible de vérifier la version");
	}
	
	// ==================== INIT GOOGLE DRIVE ====================
	try {
		const parentIdGoogleDrive = await utils.drive.checkAndCreateParentFolder("MasterBot");
		utils.drive.parentID = parentIdGoogleDrive;
		log.success("DRIVE", "✅ Google Drive initialisé");
	} catch (err) {
		log.warn("DRIVE", "⚠️ Google Drive non disponible");
	}
	
	// ==================== LOGIN ====================
	log.info("LOGIN", "🔐 Connexion à Facebook...");
	require(`./bot/login/login${NODE_ENV === 'development' ? '.dev.js' : '.js'}`);
})();

// ==================== COMPARE VERSION ====================
function compareVersion(version1, version2) {
	const v1 = version1.split(".");
	const v2 = version2.split(".");
	for (let i = 0; i < 3; i++) {
		if (parseInt(v1[i]) > parseInt(v2[i]))
			return 1;
		if (parseInt(v1[i]) < parseInt(v2[i]))
			return -1;
	}
	return 0;
}

// ==================== EXPORT ====================
module.exports = global.MasterBot;
