/**
 * GOAT BOT V3 - Version Améliorée
 * Basé sur GoatBot V2 mais complètement modernisé
 * Auteur : Master Charbel 
 * Date : 2026
 */

const fs = require('fs-extra');
const path = require('path');
const login = require('fb-chat-api');
const chalk = require('chalk');
const figlet = require('figlet');
const express = require('express');
const mongoose = require('mongoose');
const { OpenAI } = require('openai');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const axios = require('axios');
const moment = require('moment');
require('dotenv').config();

// Configuration avancée
const CONFIG = {
    version: '3.0.0',
    name: 'GoatBot V3',
    prefix: process.env.PREFIX || '!',
    adminUIDs: process.env.ADMIN_UIDS ? process.env.ADMIN_UIDS.split(',') : [],
    mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/goatbot',
    openAIKey: process.env.OPENAI_API_KEY,
    port: process.env.PORT || 3000,
    debug: process.env.DEBUG === 'true',
    antiBan: {
        enabled: true,
        messageDelay: { min: 1000, max: 3000 },
        actionDelay: { min: 2000, max: 5000 }
    }
};

// Initialisation des services
class GoatBotV3 {
    constructor() {
        this.api = null;
        this.commands = new Map();
        this.events = new Map();
        this.modules = new Map();
        this.database = null;
        this.ai = null;
        this.stats = {
            startTime: Date.now(),
            messagesProcessed: 0,
            commandsExecuted: 0,
            errors: 0
        };
        
        this.initialize();
    }

    async initialize() {
        console.log(chalk.cyan(figlet.textSync('GoatBot V3', { horizontalLayout: 'full' })));
        console.log(chalk.green(`Version ${CONFIG.version} - Dernière amélioration : Mars 2026`));
        console.log(chalk.yellow('Initialisation du bot...\n'));

        // Connexion à MongoDB
        await this.connectDatabase();
        
        // Initialiser l'IA
        if (CONFIG.openAIKey) {
            this.ai = new OpenAI({ apiKey: CONFIG.openAIKey });
            console.log(chalk.green('✓ IA initialisée'));
        }

        // Charger les commandes
        await this.loadCommands();
        
        // Charger les événements
        await this.loadEvents();
        
        // Initialiser le dashboard
        this.startDashboard();
        
        console.log(chalk.green('\n✓ Bot prêt à se connecter à Facebook\n'));
    }

    async connectDatabase() {
        try {
            await mongoose.connect(CONFIG.mongoURI, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            console.log(chalk.green('✓ Base de données MongoDB connectée'));
        } catch (error) {
            console.log(chalk.red('✗ Erreur MongoDB :', error.message));
        }
    }

    async loadCommands() {
        const commandsPath = path.join(__dirname, 'bot', 'commands');
        if (!fs.existsSync(commandsPath)) return;

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            try {
                const command = require(path.join(commandsPath, file));
                this.commands.set(command.name || file.replace('.js', ''), command);
                console.log(chalk.gray(`  → Commande chargée : ${command.name || file}`));
            } catch (error) {
                console.log(chalk.red(`  ✗ Erreur chargement ${file}:`, error.message));
            }
        }
        console.log(chalk.green(`✓ ${this.commands.size} commandes chargées`));
    }

    async loadEvents() {
        const eventsPath = path.join(__dirname, 'bot', 'events');
        if (!fs.existsSync(eventsPath)) return;

        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        
        for (const file of eventFiles) {
            try {
                const event = require(path.join(eventsPath, file));
                this.events.set(event.name || file.replace('.js', ''), event);
                console.log(chalk.gray(`  → Événement chargé : ${event.name || file}`));
            } catch (error) {
                console.log(chalk.red(`  ✗ Erreur chargement ${file}:`, error.message));
            }
        }
        console.log(chalk.green(`✓ ${this.events.size} événements chargés`));
    }

    startDashboard() {
        const app = express();
        
        // Middlewares de sécurité
        app.use(helmet());
        app.use(compression());
        app.use(express.json());
        app.use(express.static('dashboard/public'));
        
        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100
        });
        app.use('/api/', limiter);
        
        // Routes API
        app.get('/api/stats', (req, res) => {
            res.json({
                ...this.stats,
                uptime: moment.duration(Date.now() - this.stats.startTime).humanize(),
                commandsCount: this.commands.size,
                eventsCount: this.events.size
            });
        });
        
        app.get('/api/commands', (req, res) => {
            const commandsList = Array.from(this.commands.values()).map(cmd => ({
                name: cmd.name,
                description: cmd.description || 'Aucune description',
                usage: cmd.usage,
                category: cmd.category || 'Général'
            }));
            res.json(commandsList);
        });
        
        // Page d'accueil du dashboard
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'dashboard', 'public', 'index.html'));
        });
        
        app.listen(CONFIG.port, () => {
            console.log(chalk.green(`✓ Dashboard disponible sur http://localhost:${CONFIG.port}`));
        });
    }

    async login(credentials) {
        console.log(chalk.yellow('\nConnexion à Facebook...'));
        
        return new Promise((resolve, reject) => {
            login(credentials, (err, api) => {
                if (err) {
                    console.log(chalk.red('✗ Erreur de connexion :', err.message));
                    return reject(err);
                }
                
                this.api = api;
                
                // Configuration de l'API
                api.setOptions({
                    listenEvents: true,
                    selfListen: false,
                    forceLogin: true,
                    autoMarkDelivery: true,
                    autoMarkRead: false,
                    logLevel: CONFIG.debug ? 'info' : 'silent'
                });
                
                console.log(chalk.green('✓ Connecté à Facebook !'));
                console.log(chalk.cyan(`\n🎉 ${CONFIG.name} est maintenant en ligne !`));
                
                this.listen();
                resolve(api);
            });
        });
    }

    async listen() {
        console.log(chalk.yellow('\n👂 En attente des messages...\n'));
        
        this.api.listenMqtt(async (err, event) => {
            if (err) {
                this.stats.errors++;
                console.log(chalk.red('✗ Erreur listener:', err.message));
                return;
            }
            
            // Traitement anti-ban
            if (CONFIG.antiBan.enabled) {
                await this.randomDelay(CONFIG.antiBan.messageDelay);
            }
            
            // Statistiques
            this.stats.messagesProcessed++;
            
            // Logs de débogage
            if (CONFIG.debug) {
                console.log(chalk.gray(`[${moment().format('HH:mm:ss')}] Événement reçu:`, event.type));
            }
            
            // Gestion des événements
            try {
                // D'abord les événements spéciaux
                if (this.events.has(event.type)) {
                    const eventHandler = this.events.get(event.type);
                    await eventHandler.execute(this, event);
                }
                
                // Ensuite les messages
                if (event.type === 'message' || event.type === 'message_reply') {
                    await this.handleMessage(event);
                }
            } catch (error) {
                this.stats.errors++;
                console.log(chalk.red('✗ Erreur traitement:', error.message));
            }
        });
    }

    async handleMessage(event) {
        const { body, threadID, senderID } = event;
        
        // Ignorer ses propres messages
        if (senderID === this.api.getCurrentUserID()) return;
        
        // Vérifier si c'est une commande
        if (body && body.startsWith(CONFIG.prefix)) {
            await this.handleCommand(event);
        } else {
            // Réponse automatique avec IA si activée
            await this.handleAutoReply(event);
        }
    }

    async handleCommand(event) {
        const { body, threadID, senderID } = event;
        
        // Parser la commande
        const args = body.slice(CONFIG.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        // Chercher la commande
        const command = this.commands.get(commandName) || 
                       Array.from(this.commands.values()).find(cmd => 
                           cmd.aliases && cmd.aliases.includes(commandName)
                       );
        
        if (command) {
            // Vérifier les permissions
            if (command.adminOnly && !CONFIG.adminUIDs.includes(senderID)) {
                return this.api.sendMessage('⛔ Cette commande est réservée aux administrateurs.', threadID);
            }
            
            try {
                this.stats.commandsExecuted++;
                
                // Exécuter la commande avec anti-ban
                const result = await command.execute({
                    api: this.api,
                    event,
                    args,
                    bot: this,
                    CONFIG
                });
                
                // Réponse avec délai anti-ban
                if (result && CONFIG.antiBan.enabled) {
                    await this.randomDelay(CONFIG.antiBan.actionDelay);
                }
                
            } catch (error) {
                console.log(chalk.red(`✗ Erreur commande ${commandName}:`, error.message));
                this.api.sendMessage(`❌ Erreur: ${error.message}`, threadID);
            }
        } else {
            this.api.sendMessage(`❓ Commande inconnue. Tapez ${CONFIG.prefix}help pour voir les commandes.`, threadID);
        }
    }

    async handleAutoReply(event) {
        // Implémentation de l'IA pour les réponses automatiques
        if (this.ai && Math.random() < 0.3) { // 30% de chance de répondre
            try {
                const response = await this.ai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: "Tu es un assistant utile et amical sur Messenger." },
                        { role: "user", content: event.body }
                    ],
                    max_tokens: 150
                });
                
                this.api.sendMessage(response.choices[0].message.content, event.threadID);
            } catch (error) {
                console.log(chalk.red('✗ Erreur IA:', error.message));
            }
        }
    }

    randomDelay(range) {
        const delay = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }
}

// Point d'entrée principal
if (require.main === module) {
    const bot = new GoatBotV3();
    
    // Lire les credentials
    const credentialsPath = path.join(__dirname, 'account.dev.txt');
    
    if (!fs.existsSync(credentialsPath)) {
        console.log(chalk.red('❌ Fichier account.dev.txt non trouvé!'));
        console.log(chalk.yellow('Veuillez créer ce fichier avec vos identifiants Facebook.'));
        process.exit(1);
    }
    
    try {
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        bot.login(credentials);
    } catch (error) {
        console.log(chalk.red('❌ Erreur lecture credentials:', error.message));
        process.exit(1);
    }
}

module.exports = GoatBotV3;
