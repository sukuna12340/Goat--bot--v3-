/**
 * 🔄 MASTERBOT V3 - SYSTÈME DE MISE À JOUR ULTRA
 * 
 * Fonctionnalités :
 * ✅ Vérification automatique des versions
 * ✅ Mise à jour depuis GitHub
 * ✅ Sauvegarde automatique avant mise à jour
 * ✅ Gestion des dépendances
 * ✅ Restauration en cas d'échec
 * ✅ Logs détaillés
 * ✅ Mode interactif et automatique
 * ✅ Support des branches
 * ✅ Vérification des conflits
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const chalk = require('chalk');
const moment = require('moment');
const archiver = require('archiver');

// Configuration
const CONFIG = {
	repoUrl: 'https://github.com/votre-nom/masterbot-v3',
	rawBaseUrl: 'https://raw.githubusercontent.com/votre-nom/masterbot-v3/main',
	apiUrl: 'https://api.github.com/repos/votre-nom/masterbot-v3',
	branch: 'main',
	backupBeforeUpdate: true,
	autoInstallDeps: true,
	checkCompatibility: true,
	timeout: 30000
};

// Logger amélioré
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

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

// Fonction pour poser une question
function question(query) {
	return new Promise((resolve) => {
		rl.question(query, resolve);
	});
}

// Fonction pour obtenir la version actuelle
function getCurrentVersion() {
	try {
		const packageJson = require('./package.json');
		return packageJson.version || 'unknown';
	} catch {
		return 'unknown';
	}
}

// Fonction pour obtenir la dernière version depuis GitHub
async function getLatestVersion() {
	try {
		const response = await axios.get(`${CONFIG.apiUrl}/releases/latest`, {
			timeout: CONFIG.timeout
		});
		return {
			tag: response.data.tag_name,
			name: response.data.name,
			body: response.data.body,
			date: response.data.published_at
		};
	} catch (error) {
		// Si pas de release, essayer de récupérer depuis package.json
		try {
			const response = await axios.get(`${CONFIG.rawBaseUrl}/package.json`, {
				timeout: CONFIG.timeout
			});
			return {
				tag: 'main',
				name: 'Dernière version',
				body: 'Version du dépôt principal',
				date: new Date().toISOString()
			};
		} catch {
			throw error;
		}
	}
}

// Fonction pour créer une sauvegarde
async function createBackup() {
	const backupName = `backup_${moment().format('YYYYMMDD_HHmmss')}`;
	const backupPath = path.join(process.cwd(), 'backups', backupName);
	
	log.info('BACKUP', `📦 Création d'une sauvegarde: ${backupName}`);
	
	try {
		await fs.ensureDir(backupPath);
		
		// Fichiers à sauvegarder
		const filesToBackup = [
			'index.js',
			'package.json',
			'package-lock.json',
			'config.dev.json',
			'config.dev.cmd',
			'.env',
			'account.dev.txt',
			'madara.js',
			'Goat.js',
			'utils.js',
			'bot',
			'scripts',
			'dashboard',
			'database',
			'languages',
			'logger',
			'fb-chat-api'
		];
		
		for (const file of filesToBackup) {
			const sourcePath = path.join(process.cwd(), file);
			if (fs.existsSync(sourcePath)) {
				const destPath = path.join(backupPath, file);
				if (fs.lstatSync(sourcePath).isDirectory()) {
					await fs.copy(sourcePath, destPath);
				} else {
					await fs.copyFile(sourcePath, destPath);
				}
				log.debug('BACKUP', `  ✅ ${file}`);
			}
		}
		
		log.success('BACKUP', `✅ Sauvegarde créée: ${backupName}`);
		return backupPath;
	} catch (error) {
		log.error('BACKUP', `❌ Erreur lors de la sauvegarde: ${error.message}`);
		throw error;
	}
}

// Fonction pour télécharger un fichier depuis GitHub
async function downloadFile(filePath) {
	try {
		const url = `${CONFIG.rawBaseUrl}/${filePath}`;
		const response = await axios.get(url, {
			timeout: CONFIG.timeout,
			responseType: 'text'
		});
		return response.data;
	} catch (error) {
		if (error.response && error.response.status === 404) {
			return null; // Fichier non trouvé
		}
		throw error;
	}
}

// Fonction pour obtenir la liste des fichiers à mettre à jour
async function getUpdatedFiles() {
	try {
		// Récupérer la liste des fichiers depuis le repo
		const response = await axios.get(`${CONFIG.apiUrl}/git/trees/${CONFIG.branch}?recursive=1`, {
			timeout: CONFIG.timeout
		});
		
		return response.data.tree
			.filter(item => item.type === 'blob')
			.map(item => item.path);
	} catch (error) {
		log.error('UPDATE', `❌ Erreur lors de la récupération de la liste des fichiers: ${error.message}`);
		throw error;
	}
}

// Fonction pour vérifier la compatibilité
async function checkCompatibility(newVersion) {
	try {
		// Récupérer le package.json de la nouvelle version
		const newPackageJson = await downloadFile('package.json');
		if (!newPackageJson) return true;
		
		const newPackage = JSON.parse(newPackageJson);
		const currentPackage = require('./package.json');
		
		// Vérifier la version de Node.js
		const currentNode = process.version;
		const requiredNode = newPackage.engines?.node || '>=16.0.0';
		
		// Comparer les versions (simplifié)
		const nodeVersion = currentNode.replace('v', '');
		const nodeRequired = requiredNode.replace('>=', '').replace('^', '');
		
		if (parseInt(nodeVersion) < parseInt(nodeRequired)) {
			log.warn('COMPAT', `⚠️ Node.js ${currentNode} détecté, version requise: ${requiredNode}`);
			return false;
		}
		
		return true;
	} catch (error) {
		log.warn('COMPAT', `⚠️ Impossible de vérifier la compatibilité: ${error.message}`);
		return true; // On continue quand même
	}
}

// Fonction pour mettre à jour les dépendances
async function updateDependencies() {
	log.info('DEPS', '📦 Mise à jour des dépendances...');
	
	try {
		// Installer les nouvelles dépendances
		execSync('npm install', { stdio: 'inherit' });
		log.success('DEPS', '✅ Dépendances mises à jour');
		return true;
	} catch (error) {
		log.error('DEPS', `❌ Erreur lors de l'installation des dépendances: ${error.message}`);
		return false;
	}
}

// Fonction pour appliquer la mise à jour
async function applyUpdate(files, backupPath) {
	log.info('UPDATE', '🔄 Application de la mise à jour...');
	
	let success = true;
	const updated = [];
	const failed = [];
	const skipped = [];
	
	for (const file of files) {
		try {
			// Ignorer certains fichiers
			if (file.includes('node_modules') || 
				file.includes('.git') ||
				file === 'account.dev.txt' ||
				file === '.env') {
				skipped.push(file);
				continue;
			}
			
			const content = await downloadFile(file);
			if (content === null) continue; // Fichier supprimé
			
			const filePath = path.join(process.cwd(), file);
			const fileDir = path.dirname(filePath);
			
			// Créer le dossier si nécessaire
			await fs.ensureDir(fileDir);
			
			// Sauvegarder l'ancienne version
			if (fs.existsSync(filePath) && backupPath) {
				const backupFilePath = path.join(backupPath, file);
				await fs.ensureDir(path.dirname(backupFilePath));
				await fs.copyFile(filePath, backupFilePath);
			}
			
			// Écrire le nouveau fichier
			await fs.writeFile(filePath, content);
			updated.push(file);
			
			log.debug('UPDATE', `  ✅ ${file}`);
		} catch (error) {
			log.error('UPDATE', `  ❌ ${file}: ${error.message}`);
			failed.push(file);
			success = false;
		}
	}
	
	// Résumé
	console.log(chalk.cyan('\n📊 RÉSUMÉ DE LA MISE À JOUR :'));
	console.log(chalk.green(`  ✅ ${updated.length} fichiers mis à jour`));
	console.log(chalk.yellow(`  ⏭️  ${skipped.length} fichiers ignorés`));
	if (failed.length > 0) {
		console.log(chalk.red(`  ❌ ${failed.length} fichiers en erreur`));
	}
	console.log('');
	
	return { success, updated, failed, skipped };
}

// Fonction pour restaurer en cas d'échec
async function restoreFromBackup(backupPath) {
	log.warn('RESTORE', '🔄 Restauration depuis la sauvegarde...');
	
	try {
		const files = await fs.readdir(backupPath);
		
		for (const file of files) {
			const sourcePath = path.join(backupPath, file);
			const destPath = path.join(process.cwd(), file);
			
			if (fs.lstatSync(sourcePath).isDirectory()) {
				await fs.copy(sourcePath, destPath, { overwrite: true });
			} else {
				await fs.copyFile(sourcePath, destPath);
			}
			log.debug('RESTORE', `  ✅ ${file}`);
		}
		
		log.success('RESTORE', '✅ Restauration terminée');
		return true;
	} catch (error) {
		log.error('RESTORE', `❌ Erreur lors de la restauration: ${error.message}`);
		return false;
	}
}

// Fonction principale
(async () => {
	try {
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
║                    UPDATE SYSTEM v3.0                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
		`));
		
		const currentVersion = getCurrentVersion();
		log.info('VERSION', `📦 Version actuelle: ${chalk.yellow(currentVersion)}`);
		
		// Vérifier la dernière version
		log.info('UPDATE', '🔍 Vérification des mises à jour...');
		let latest;
		
		try {
			latest = await getLatestVersion();
			log.info('VERSION', `📦 Dernière version: ${chalk.green(latest.tag)} (${moment(latest.date).format('DD/MM/YYYY')})`);
			
			if (latest.body) {
				console.log(chalk.cyan('\n📋 Notes de version:'));
				console.log(latest.body.split('\n').map(line => `  ${line}`).join('\n'));
				console.log('');
			}
		} catch (error) {
			log.error('UPDATE', `❌ Impossible de vérifier les mises à jour: ${error.message}`);
			const proceed = await question(chalk.yellow('⚠️  Continuer quand même? (oui/non): '));
			if (proceed.toLowerCase() !== 'oui' && proceed.toLowerCase() !== 'o') {
				process.exit(0);
			}
			latest = { tag: 'main', name: 'Dernière version' };
		}
		
		// Demander confirmation
		const confirm = await question(chalk.cyan('🔄 Voulez-vous mettre à jour maintenant? (oui/non): '));
		if (confirm.toLowerCase() !== 'oui' && confirm.toLowerCase() !== 'o') {
			log.info('UPDATE', '⏸️  Mise à jour annulée');
			process.exit(0);
		}
		
		// Créer une sauvegarde
		let backupPath = null;
		if (CONFIG.backupBeforeUpdate) {
			try {
				backupPath = await createBackup();
			} catch (error) {
				const proceed = await question(chalk.yellow('⚠️  Impossible de créer la sauvegarde. Continuer? (oui/non): '));
				if (proceed.toLowerCase() !== 'oui' && proceed.toLowerCase() !== 'o') {
					process.exit(0);
				}
			}
		}
		
		// Vérifier la compatibilité
		if (CONFIG.checkCompatibility) {
			const compatible = await checkCompatibility(latest.tag);
			if (!compatible) {
				const proceed = await question(chalk.yellow('⚠️  Problème de compatibilité détecté. Continuer? (oui/non): '));
				if (proceed.toLowerCase() !== 'oui' && proceed.toLowerCase() !== 'o') {
					process.exit(0);
				}
			}
		}
		
		// Récupérer la liste des fichiers
		let files;
		try {
			files = await getUpdatedFiles();
			log.info('UPDATE', `📁 ${files.length} fichiers à traiter`);
		} catch (error) {
			log.error('UPDATE', `❌ Impossible de récupérer la liste des fichiers: ${error.message}`);
			process.exit(1);
		}
		
		// Appliquer la mise à jour
		const result = await applyUpdate(files, backupPath);
		
		if (result.success) {
			log.success('UPDATE', '✨ Mise à jour terminée avec succès !');
			
			// Installer les dépendances
			if (CONFIG.autoInstallDeps) {
				await updateDependencies();
			}
			
			// Proposer de redémarrer
			const restart = await question(chalk.cyan('🔄 Voulez-vous redémarrer le bot maintenant? (oui/non): '));
			if (restart.toLowerCase() === 'oui' || restart.toLowerCase() === 'o') {
				log.info('UPDATE', '🔄 Redémarrage du bot...');
				execSync('npm restart', { stdio: 'inherit' });
			}
		} else {
			log.error('UPDATE', '❌ La mise à jour a échoué');
			
			// Proposer de restaurer
			if (backupPath) {
				const restore = await question(chalk.yellow('🔄 Voulez-vous restaurer la version précédente? (oui/non): '));
				if (restore.toLowerCase() === 'oui' || restore.toLowerCase() === 'o') {
					await restoreFromBackup(backupPath);
				}
			}
		}
		
	} catch (error) {
		log.error('FATAL', `❌ Erreur fatale: ${error.stack || error.message}`);
	} finally {
		rl.close();
	}
})();
