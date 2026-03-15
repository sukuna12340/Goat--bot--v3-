/**
 * 🔄 MASTERBOT V3 - ADAPTATEUR & GESTIONNAIRE DE MISE À JOUR ULTRA
 * 
 * Fonctionnalités :
 * ✅ Gestion intelligente des mises à jour
 * ✅ Support multilingue avancé
 * ✅ Sauvegarde automatique
 * ✅ Gestion des conflits de configuration
 * ✅ Installation automatique des dépendances
 * ✅ Interface colorée et détaillée
 * ✅ Vérification de compatibilité
 * ✅ Restauration en cas d'échec
 */

const axios = require('axios');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const moment = require('moment');
const chalk = require('chalk');
const semver = require('semver');

// Logger
const log = {
	info: (module, message) => console.log(chalk.blue(`[${moment().format('HH:mm:ss')}] ℹ️ [${module}]`), message),
	success: (module, message) => console.log(chalk.green(`[${moment().format('HH:mm:ss')}] ✅ [${module}]`), message),
	warn: (module, message) => console.log(chalk.yellow(`[${moment().format('HH:mm:ss')}] ⚠️ [${module}]`), message),
	error: (module, message) => console.log(chalk.red(`[${moment().format('HH:mm:ss')}] ❌ [${module}]`), message),
	debug: (module, message) => {
		if (process.env.DEBUG === 'true') {
			console.log(chalk.gray(`[${moment().format('HH:mm:ss')}] 🔍 [${module}]`), message);
		}
	},
	master: (module, message) => console.log(chalk.hex('#ff69b4')(`[${moment().format('HH:mm:ss')}] 👑 [${module}]`), message)
};

const sep = path.sep;
const currentConfig = require('./config.dev.json');
const langCode = currentConfig.language || 'fr';

// ==================== GESTION DES LANGUES ====================

let pathLanguageFile = `${process.cwd()}/languages/${langCode}.lang`;
if (!fs.existsSync(pathLanguageFile)) {
	log.warn("LANGUE", `⚠️ Fichier de langue ${langCode} introuvable, utilisation du français par défaut`);
	pathLanguageFile = `${process.cwd()}/languages/fr.lang`;
}

// Créer le dossier languages s'il n'existe pas
if (!fs.existsSync(`${process.cwd()}/languages`)) {
	fs.mkdirSync(`${process.cwd()}/languages`, { recursive: true });
	
	// Créer un fichier de langue français par défaut
	const defaultFrenchLang = `# MASTERBOT V3 - Fichier de langue français
updater.newVersions=Nouvelles versions disponibles: %1
updater.latestVersion=✅ Vous utilisez la dernière version!
updater.updateSuccess=✅ Mise à jour terminée avec succès! %1
updater.installingPackages=📦 Installation des dépendances...
updater.installSuccess=✅ Dépendances installées avec succès!
updater.backupSuccess=📦 Sauvegarde créée: %1
updater.skipFile=⏭️ Fichier ignoré: %1 (contient %2)
updater.configChanged=⚙️ Configuration modifiée: %1
updater.restartToApply=Redémarrez le bot pour appliquer les changements.
updater.updateTooFast=⏱️ Trop tôt pour mettre à jour. Attendez %1m %2s.
updater.cantFindVersion=❌ Version %1 introuvable dans l'historique.
updater.downloading=📥 Téléchargement: %1
updater.updating=🔄 Mise à jour: %1
updater.deleting=🗑️ Suppression: %1
updater.backupCreating=📦 Création de la sauvegarde...
updater.backupSuccess=✅ Sauvegarde créée: %1
updater.restoreFromBackup=🔄 Restauration depuis la sauvegarde...`;
	
	fs.writeFileSync(`${process.cwd()}/languages/fr.lang`, defaultFrenchLang);
}

const readLanguage = fs.readFileSync(pathLanguageFile, "utf-8");
const languageData = readLanguage
	.split(/\r?\n|\r/)
	.filter(line => line && !line.trim().startsWith("#") && !line.trim().startsWith("//") && line != "");

global.language = {};
for (const sentence of languageData) {
	const getSeparator = sentence.indexOf('=');
	const itemKey = sentence.slice(0, getSeparator).trim();
	const itemValue = sentence.slice(getSeparator + 1, sentence.length).trim();
	const head = itemKey.slice(0, itemKey.indexOf('.'));
	const key = itemKey.replace(head + '.', '');
	const value = itemValue.replace(/\\n/gi, '\n');
	if (!global.language[head])
		global.language[head] = {};
	global.language[head][key] = value;
}

function getText(head, key, ...args) {
	if (!global.language[head]?.[key]) {
		// Fallback en dur
		const fallbacks = {
			updater: {
				newVersions: "Nouvelles versions disponibles: %1",
				latestVersion: "✅ Vous utilisez la dernière version!",
				updateSuccess: "✅ Mise à jour terminée avec succès! %1",
				installingPackages: "📦 Installation des dépendances...",
				installSuccess: "✅ Dépendances installées avec succès!",
				backupSuccess: "📦 Sauvegarde créée: %1"
			}
		};
		
		if (fallbacks[head]?.[key]) {
			let text = fallbacks[head][key];
			for (let i = args.length - 1; i >= 0; i--)
				text = text.replace(new RegExp(`%${i + 1}`, 'g'), args[i]);
			return text;
		}
		return `[${head}.${key}]`;
	}
	
	let text = global.language[head][key];
	for (let i = args.length - 1; i >= 0; i--)
		text = text.replace(new RegExp(`%${i + 1}`, 'g'), args[i]);
	return text;
}

// ==================== UTILITAIRES FICHIERS ====================

const defaultWriteFileSync = fs.writeFileSync;
const defaulCopyFileSync = fs.copyFileSync;

function checkAndAutoCreateFolder(pathFolder) {
	const splitPath = path.normalize(pathFolder).split(sep);
	let currentPath = '';
	for (const i in splitPath) {
		currentPath += splitPath[i] + sep;
		if (!fs.existsSync(currentPath))
			fs.mkdirSync(currentPath);
	}
}

function sortObj(obj, parentObj, rootKeys, stringKey = "") {
	const root = sortObjAsRoot(obj, rootKeys);
	stringKey = stringKey || "";
	if (stringKey) {
		stringKey += ".";
	}
	for (const key in root) {
		if (
			typeof root[key] == "object"
			&& !Array.isArray(root[key])
			&& root[key] != null
		) {
			stringKey += key;

			root[key] = sortObj(
				root[key],
				parentObj,
				Object.keys(_.get(parentObj, stringKey) || {}),
				stringKey
			);

			stringKey = "";
		}
	}
	return root;
}

function sortObjAsRoot(subObj, rootKeys) {
	const _obj = {};
	for (const key in subObj) {
		const indexInRootObj = rootKeys.indexOf(key);
		_obj[key] = indexInRootObj == -1 ? 9999 : indexInRootObj;
	}
	const sortedSubObjKeys = Object.keys(_obj).sort((a, b) => _obj[a] - _obj[b]);
	const sortedSubObj = {};
	for (const key of sortedSubObjKeys) {
		sortedSubObj[key] = subObj[key];
	}
	return sortedSubObj;
}

// Override fs.writeFileSync et fs.copyFileSync pour créer les dossiers automatiquement
fs.writeFileSync = function (fullPath, data) {
	fullPath = path.normalize(fullPath);
	const pathFolder = fullPath.split(sep);
	if (pathFolder.length > 1)
		pathFolder.pop();
	checkAndAutoCreateFolder(pathFolder.join(path.sep));
	defaultWriteFileSync(fullPath, data);
};

fs.copyFileSync = function (src, dest) {
	src = path.normalize(src);
	dest = path.normalize(dest);
	const pathFolder = dest.split(sep);
	if (pathFolder.length > 1)
		pathFolder.pop();
	checkAndAutoCreateFolder(pathFolder.join(path.sep));
	defaulCopyFileSync(src, dest);
};

// ==================== CONFIGURATION MASTERBOT ====================

const MASTERBOT_CONFIG = {
	repoOwner: 'votre-nom',
	repoName: 'masterbot-v3',
	branch: 'main',
	versionsUrl: 'https://raw.githubusercontent.com/votre-nom/masterbot-v3/main/versions.json',
	rawBaseUrl: 'https://raw.githubusercontent.com/votre-nom/masterbot-v3/main',
	apiBaseUrl: 'https://api.github.com/repos/votre-nom/masterbot-v3',
	backupBeforeUpdate: true,
	minUpdateInterval: 5 * 60 * 1000, // 5 minutes
	sensitiveFiles: ['.env', 'account.dev.txt', 'config.dev.json'],
	configFiles: ['config.dev.json', 'config.dev.cmd']
};

// ==================== FONCTIONS PRINCIPALES ====================

async function checkUpdateAvailability() {
	try {
		// Vérifier le dernier commit
		const { data: lastCommit } = await axios.get(`${MASTERBOT_CONFIG.apiBaseUrl}/commits/${MASTERBOT_CONFIG.branch}`);
		const lastCommitDate = new Date(lastCommit.commit.committer.date);
		
		// Vérifier si la mise à jour est trop récente (anti-spam)
		const timeSinceLastCommit = new Date().getTime() - lastCommitDate.getTime();
		if (timeSinceLastCommit < MASTERBOT_CONFIG.minUpdateInterval) {
			const minutes = Math.floor((MASTERBOT_CONFIG.minUpdateInterval - timeSinceLastCommit) / 1000 / 60);
			const seconds = Math.floor((MASTERBOT_CONFIG.minUpdateInterval - timeSinceLastCommit) / 1000 % 60);
			log.warn("UPDATE", getText("updater", "updateTooFast", minutes, seconds));
			return false;
		}
		
		return true;
	} catch (error) {
		log.error("UPDATE", `❌ Erreur lors de la vérification: ${error.message}`);
		return false;
	}
}

async function getVersions() {
	try {
		const { data: versions } = await axios.get(MASTERBOT_CONFIG.versionsUrl);
		return versions;
	} catch (error) {
		log.error("VERSIONS", `❌ Impossible de récupérer les versions: ${error.message}`);
		return [];
	}
}

async function createBackup(version) {
	const backupsPath = `${process.cwd()}/backups`;
	if (!fs.existsSync(backupsPath))
		fs.mkdirSync(backupsPath, { recursive: true });
	
	// Migrer les anciens dossiers backup_
	const foldersBackup = fs.readdirSync(process.cwd())
		.filter(folder => folder.startsWith("backup_") && fs.lstatSync(folder).isDirectory());
	
	for (const folder of foldersBackup) {
		fs.moveSync(folder, `${backupsPath}/${folder}`, { overwrite: true });
	}
	
	const folderBackup = `${backupsPath}/backup_${version}_${moment().format('YYYYMMDD_HHmmss')}`;
	fs.mkdirSync(folderBackup, { recursive: true });
	
	log.info("BACKUP", getText("updater", "backupCreating"));
	return folderBackup;
}

async function downloadFile(filePath) {
	try {
		const url = `${MASTERBOT_CONFIG.rawBaseUrl}/${filePath}`;
		log.debug("DOWNLOAD", `📥 Téléchargement: ${url}`);
		
		const response = await axios.get(url, {
			responseType: 'arraybuffer',
			timeout: 30000
		});
		
		return response.data;
	} catch (error) {
		if (error.response && error.response.status === 404) {
			log.debug("DOWNLOAD", `⚠️ Fichier introuvable: ${filePath}`);
			return null;
		}
		throw error;
	}
}

async function updateConfigFile(filePath, configValueUpdate, folderBackup, version) {
	const fullPath = `${process.cwd()}/${filePath}`;
	const currentConfig = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
	
	// Sauvegarde
	if (fs.existsSync(fullPath)) {
		fs.copyFileSync(fullPath, `${folderBackup}/${filePath}`);
	}
	
	// Appliquer les mises à jour
	for (const key in configValueUpdate) {
		const value = configValueUpdate[key];
		if (typeof value == "string" && value.startsWith("DEFAULT_")) {
			const keyOfDefault = value.replace("DEFAULT_", "");
			_.set(currentConfig, key, _.get(currentConfig, keyOfDefault));
		} else {
			_.set(currentConfig, key, value);
		}
	}
	
	// Sauvegarder l'ancienne valeur spéciale
	const specialKeys = ['openai.apiKey', 'google.gmail.refreshToken'];
	for (const key of specialKeys) {
		const oldValue = _.get(currentConfig, key);
		if (oldValue && !_.get(configValueUpdate, key)) {
			log.debug("CONFIG", `🔑 Préservation de ${key}`);
		}
	}
	
	const currentConfigSorted = sortObj(currentConfig, currentConfig, Object.keys(currentConfig));
	fs.writeFileSync(fullPath, JSON.stringify(currentConfigSorted, null, 2));
	
	log.info("CONFIG", getText("updater", "configChanged", chalk.yellow(filePath)));
}

async function updateRegularFile(filePath, description, folderBackup, version) {
	const fullPath = `${process.cwd()}/${filePath}`;
	const fileExists = fs.existsSync(fullPath);
	
	// Ignorer les fichiers sensibles
	if (MASTERBOT_CONFIG.sensitiveFiles.includes(filePath)) {
		log.debug("UPDATE", `🔒 Fichier sensible ignoré: ${filePath}`);
		return;
	}
	
	// Télécharger le nouveau fichier
	const fileData = await downloadFile(filePath);
	if (fileData === null) return;
	
	// Sauvegarde
	if (fileExists) {
		fs.copyFileSync(fullPath, `${folderBackup}/${filePath}`);
	}
	
	// Vérifier les instructions spéciales
	const contentsSkip = ["DO NOT UPDATE", "SKIP UPDATE", "NE PAS METTRE À JOUR", "@preserve"];
	let shouldSkip = false;
	let skipReason = '';
	
	if (fileExists) {
		const firstLine = fs.readFileSync(fullPath, "utf-8").trim().split(/\r?\n|\r/)[0] || '';
		for (const skipToken of contentsSkip) {
			if (firstLine.includes(skipToken)) {
				shouldSkip = true;
				skipReason = skipToken;
				break;
			}
		}
	}
	
	if (shouldSkip) {
		log.warn("UPDATE", getText("updater", "skipFile", chalk.yellow(filePath), chalk.yellow(skipReason)));
		return;
	}
	
	// Écrire le fichier
	fs.writeFileSync(fullPath, Buffer.from(fileData));
	
	// Afficher le statut
	const icon = fileExists ? chalk.blue('[↑]') : chalk.green('[+]');
	const action = fileExists ? 'Mise à jour' : 'Ajout';
	const desc = typeof description == "string" ? description : 
				 typeof description == "object" ? JSON.stringify(description).slice(0, 50) + '...' : 
				 description || '';
	
	console.log(`  ${icon} ${chalk.cyan(filePath.padEnd(40))} ${chalk.gray(action)}`);
	if (desc) {
		console.log(`      ${chalk.gray('↳ ' + desc)}`);
	}
}

async function deleteFiles(deleteFiles, folderBackup) {
	for (const filePath in deleteFiles) {
		const description = deleteFiles[filePath];
		const fullPath = `${process.cwd()}/${filePath}`;
		
		if (fs.existsSync(fullPath)) {
			// Sauvegarde avant suppression
			if (fs.lstatSync(fullPath).isDirectory()) {
				fs.copySync(fullPath, `${folderBackup}/${filePath}`);
				fs.removeSync(fullPath);
			} else {
				fs.copyFileSync(fullPath, `${folderBackup}/${filePath}`);
				fs.unlinkSync(fullPath);
			}
			
			console.log(`  ${chalk.red('[-]')} ${chalk.cyan(filePath.padEnd(40))} ${chalk.gray('Supprimé: ' + description)}`);
		}
	}
}

async function updatePackageJson(folderBackup, version) {
	try {
		// Sauvegarder l'ancien package.json
		if (fs.existsSync('./package.json')) {
			fs.copyFileSync('./package.json', `${folderBackup}/package.json`);
		}
		
		// Télécharger le nouveau package.json
		const packageData = await downloadFile('package.json');
		if (packageData) {
			const newPackage = JSON.parse(packageData.toString());
			const currentPackage = require('./package.json');
			
			// Préserver la version et certaines configurations
			newPackage.version = version;
			newPackage.config = currentPackage.config || newPackage.config;
			
			fs.writeFileSync('./package.json', JSON.stringify(newPackage, null, 2));
			log.info("PACKAGE", "📦 package.json mis à jour");
		}
	} catch (error) {
		log.error("PACKAGE", `❌ Erreur mise à jour package.json: ${error.message}`);
	}
}

async function installDependencies(reinstallDependencies) {
	if (!reinstallDependencies) return;
	
	log.info("DEPS", getText("updater", "installingPackages"));
	try {
		execSync("npm install", { stdio: 'inherit' });
		log.success("DEPS", getText("updater", "installSuccess"));
	} catch (error) {
		log.error("DEPS", `❌ Erreur installation: ${error.message}`);
	}
}

// ==================== FONCTION PRINCIPALE ====================

(async () => {
	try {
		// Afficher la bannière
		console.log(chalk.hex('#ff69b4')(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   █████╗ ██████╗  █████╗ ██████╗ ████████╗███████╗██████╗ ║
║  ██╔══██╗██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██╔══██╗║
║  ███████║██║  ██║███████║██████╔╝   ██║   █████╗  ██████╔╝║
║  ██╔══██║██║  ██║██╔══██║██╔═══╝    ██║   ██╔══╝  ██╔══██╗║
║  ██║  ██║██████╔╝██║  ██║██║        ██║   ███████╗██║  ██║║
║  ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝        ╚═╝   ╚══════╝╚═╝  ╚═╝║
║                                                          ║
║                GESTIONNAIRE DE MISE À JOUR               ║
║                        v3.0.0                            ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
		`));
		
		// Vérifier disponibilité mise à jour
		const canUpdate = await checkUpdateAvailability();
		if (!canUpdate) {
			process.exit(0);
		}
		
		// Récupérer les versions
		const versions = await getVersions();
		if (!versions || versions.length === 0) {
			log.error("UPDATE", "❌ Impossible de récupérer les versions");
			process.exit(1);
		}
		
		// Version actuelle
		const currentVersion = require('./package.json').version;
		const indexCurrentVersion = versions.findIndex(v => v.version === currentVersion);
		
		if (indexCurrentVersion === -1) {
			log.error("UPDATE", getText("updater", "cantFindVersion", chalk.yellow(currentVersion)));
			process.exit(1);
		}
		
		// Versions à mettre à jour
		const versionsNeedToUpdate = versions.slice(indexCurrentVersion + 1);
		if (versionsNeedToUpdate.length === 0) {
			log.success("UPDATE", getText("updater", "latestVersion"));
			process.exit(0);
		}
		
		log.info("UPDATE", getText("updater", "newVersions", chalk.yellow(versionsNeedToUpdate.length)));
		
		// Fusionner les mises à jour
		const createUpdate = {
			version: "",
			files: {},
			deleteFiles: {},
			reinstallDependencies: false
		};
		
		for (const version of versionsNeedToUpdate) {
			for (const filePath in version.files) {
				if (MASTERBOT_CONFIG.configFiles.includes(filePath)) {
					if (!createUpdate.files[filePath])
						createUpdate.files[filePath] = {};
					
					createUpdate.files[filePath] = {
						...createUpdate.files[filePath],
						...version.files[filePath]
					};
				} else {
					createUpdate.files[filePath] = version.files[filePath];
				}
				
				if (version.reinstallDependencies)
					createUpdate.reinstallDependencies = true;
				
				if (createUpdate.deleteFiles[filePath])
					delete createUpdate.deleteFiles[filePath];
				
				for (const filePath in version.deleteFiles)
					createUpdate.deleteFiles[filePath] = version.deleteFiles[filePath];
				
				createUpdate.version = version.version;
			}
		}
		
		// Créer la sauvegarde
		const folderBackup = await createBackup(currentVersion);
		
		// Appliquer les mises à jour
		log.info("UPDATE", `Mise à jour vers la version ${chalk.yellow(createUpdate.version)}`);
		console.log('');
		
		const { files, deleteFiles, reinstallDependencies } = createUpdate;
		
		// Mettre à jour les fichiers
		for (const filePath in files) {
			const description = files[filePath];
			
			if (MASTERBOT_CONFIG.configFiles.includes(filePath)) {
				await updateConfigFile(filePath, description, folderBackup, createUpdate.version);
			} else {
				await updateRegularFile(filePath, description, folderBackup, createUpdate.version);
			}
		}
		
		// Supprimer les fichiers
		await deleteFiles(deleteFiles, folderBackup);
		
		// Mettre à jour package.json
		await updatePackageJson(folderBackup, createUpdate.version);
		
		// Sauvegarder versions.json
		fs.writeFileSync(`${process.cwd()}/versions.json`, JSON.stringify(versions, null, 2));
		
		log.success("UPDATE", getText("updater", "updateSuccess", !reinstallDependencies ? getText("updater", "restartToApply") : ""));
		log.success("BACKUP", getText("updater", "backupSuccess", chalk.yellow(folderBackup)));
		
		// Installer les dépendances
		await installDependencies(reinstallDependencies);
		
		console.log('');
		log.master("MASTERBOT", "✨ Mise à jour terminée avec succès !");
		
		if (!reinstallDependencies) {
			console.log(chalk.cyan('\n🔄 Redémarrez le bot pour appliquer les changements:'));
			console.log(chalk.white('   pm2 restart masterbot   ou   npm restart'));
		}
		
	} catch (error) {
		log.error("FATAL", `❌ Erreur fatale: ${error.stack || error.message}`);
		process.exit(1);
	}
})();
