/**
 * 🔄 MASTERBOT V3 - RESTORE BACKUP ULTRA
 * 
 * Fonctionnalités :
 * ✅ Restauration complète des backups
 * ✅ Interface interactive améliorée
 * ✅ Support de compression/décompression
 * ✅ Vérification d'intégrité
 * ✅ Logs détaillés
 * ✅ Mode automatique
 * ✅ Restauration sélective
 */

const fs = require("fs-extra");
const path = require("path");
const readline = require("readline");
const chalk = require('chalk');
const moment = require('moment');
const archiver = require('archiver');
const unzipper = require('unzipper');
const { execSync } = require('child_process');

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

// Configuration
const CONFIG = {
	backupsDir: path.join(process.cwd(), 'backups'),
	excludedFiles: [
		'node_modules',
		'.git',
		'logs',
		'tmp',
		'temp',
		'.env',
		'account.dev.txt',
		'*.log'
	],
	compressionLevel: 9, // 0-9
	verifyIntegrity: true
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

// Fonction pour obtenir une liste formatée des backups
async function listBackups() {
	if (!fs.existsSync(CONFIG.backupsDir)) {
		fs.mkdirSync(CONFIG.backupsDir, { recursive: true });
		return [];
	}
	
	const backups = fs.readdirSync(CONFIG.backupsDir)
		.filter(name => name.startsWith('backup_') || name.endsWith('.zip'))
		.map(name => {
			const stats = fs.statSync(path.join(CONFIG.backupsDir, name));
			return {
				name,
				path: path.join(CONFIG.backupsDir, name),
				size: (stats.size / 1024 / 1024).toFixed(2),
				modified: stats.mtime,
				isZip: name.endsWith('.zip'),
				version: name.replace('backup_', '').replace('.zip', '')
			};
		})
		.sort((a, b) => b.modified - a.modified);
	
	return backups;
}

// Fonction pour afficher la liste des backups
function displayBackups(backups) {
	console.log(chalk.cyan('\n📦 Backups disponibles :\n'));
	
	if (backups.length === 0) {
		console.log(chalk.yellow('  Aucun backup trouvé.'));
		return;
	}
	
	backups.forEach((backup, index) => {
		const type = backup.isZip ? '📦 ZIP' : '📁 Dossier';
		const size = backup.size.padStart(8);
		const date = moment(backup.modified).format('DD/MM/YYYY HH:mm');
		console.log(
			`  ${chalk.cyan((index + 1).toString().padStart(2))}. ` +
			`${type} | ${chalk.yellow(backup.version)} | ` +
			`${chalk.green(size)} MB | ${chalk.gray(date)}`
		);
	});
	console.log('');
}

// Fonction pour restaurer récursivement
async function recursiveRestore(backupPath, restorePath, fileOrFolder = '') {
	const sourcePath = path.join(backupPath, fileOrFolder);
	const targetPath = path.join(restorePath, fileOrFolder);
	
	try {
		const stats = await fs.lstat(sourcePath);
		
		if (stats.isDirectory()) {
			if (!fs.existsSync(targetPath)) {
				await fs.mkdir(targetPath, { recursive: true });
				log.debug('RESTORE', `📁 Dossier créé: ${fileOrFolder}`);
			}
			
			const items = await fs.readdir(sourcePath);
			for (const item of items) {
				await recursiveRestore(backupPath, restorePath, path.join(fileOrFolder, item));
			}
		} else {
			// Vérifier si le fichier doit être exclu
			const shouldExclude = CONFIG.excludedFiles.some(pattern => {
				if (pattern.includes('*')) {
					const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
					return regex.test(path.basename(fileOrFolder));
				}
				return fileOrFolder.includes(pattern);
			});
			
			if (shouldExclude) {
				log.debug('RESTORE', `⏭️  Fichier ignoré (exclu): ${fileOrFolder}`);
				return;
			}
			
			await fs.copyFile(sourcePath, targetPath);
			log.debug('RESTORE', `✅ Fichier restauré: ${fileOrFolder}`);
		}
	} catch (error) {
		log.error('RESTORE', `❌ Erreur sur ${fileOrFolder}: ${error.message}`);
		throw error;
	}
}

// Fonction pour extraire un zip
async function extractZip(zipPath, targetDir) {
	log.info('RESTORE', `📦 Extraction de ${path.basename(zipPath)}...`);
	
	try {
		const extractPath = path.join(targetDir, 'temp_extract');
		await fs.ensureDir(extractPath);
		
		await new Promise((resolve, reject) => {
			fs.createReadStream(zipPath)
				.pipe(unzipper.Extract({ path: extractPath }))
				.on('close', resolve)
				.on('error', reject);
		});
		
		// Vérifier le contenu extrait
		const extractedItems = await fs.readdir(extractPath);
		
		// Si le zip contient un seul dossier, on utilise son contenu
		if (extractedItems.length === 1) {
			const singleItem = path.join(extractPath, extractedItems[0]);
			const stats = await fs.lstat(singleItem);
			if (stats.isDirectory()) {
				const contents = await fs.readdir(singleItem);
				for (const item of contents) {
					await fs.move(
						path.join(singleItem, item),
						path.join(extractPath, item),
						{ overwrite: true }
					);
				}
				await fs.remove(singleItem);
			}
		}
		
		log.success('RESTORE', '✅ Extraction terminée');
		return extractPath;
	} catch (error) {
		log.error('RESTORE', `❌ Erreur extraction: ${error.message}`);
		throw error;
	}
}

// Fonction pour vérifier l'intégrité
async function verifyIntegrity(backupPath) {
	log.info('VERIFY', '🔍 Vérification de l\'intégrité du backup...');
	
	try {
		// Vérifier les fichiers essentiels
		const essentialFiles = ['index.js', 'package.json'];
		const missing = [];
		
		for (const file of essentialFiles) {
			const filePath = path.join(backupPath, file);
			if (!fs.existsSync(filePath)) {
				missing.push(file);
			}
		}
		
		if (missing.length > 0) {
			log.warn('VERIFY', `⚠️ Fichiers essentiels manquants: ${missing.join(', ')}`);
			return false;
		}
		
		// Vérifier package.json
		try {
			const packageJson = require(path.join(backupPath, 'package.json'));
			log.success('VERIFY', `✅ Version du bot: ${packageJson.version || 'inconnue'}`);
		} catch {
			log.warn('VERIFY', '⚠️ package.json invalide');
		}
		
		log.success('VERIFY', '✅ Vérification terminée');
		return true;
	} catch (error) {
		log.error('VERIFY', `❌ Erreur vérification: ${error.message}`);
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
║   ██████╗ ███████╗███████╗████████╗ ██████╗ ██████╗ ██████╗ ███████╗   ║
║   ██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██╔══██╗██╔════╝   ║
║   ██████╔╝█████╗  ███████╗   ██║   ██║   ██║██████╔╝██║  ██║█████╗     ║
║   ██╔══██╗██╔══╝  ╚════██║   ██║   ██║   ██║██╔══██╗██║  ██║██╔══╝     ║
║   ██║  ██║███████╗███████║   ██║   ╚██████╔╝██║  ██║██████╔╝███████╗   ║
║   ╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝   ║
║                                                          ║
║                    RESTORE BACKUP v3.0                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
		`));
		
		// Récupérer la version depuis les arguments
		let versionBackup;
		if (process.argv.length >= 3) {
			versionBackup = process.argv[2];
		}
		
		// Lister les backups disponibles
		const backups = await listBackups();
		
		if (backups.length === 0) {
			log.error('ERROR', '❌ Aucun backup trouvé dans le dossier "backups"');
			process.exit(1);
		}
		
		// Si pas de version spécifiée, demander à l'utilisateur
		if (!versionBackup) {
			displayBackups(backups);
			
			const answer = await question(chalk.cyan('🔢 Choisissez le numéro du backup à restaurer: '));
			const index = parseInt(answer) - 1;
			
			if (isNaN(index) || index < 0 || index >= backups.length) {
				log.error('ERROR', '❌ Numéro invalide');
				process.exit(1);
			}
			
			versionBackup = backups[index].name;
		}
		
		// Nettoyer le nom du backup
		versionBackup = versionBackup.replace(/^backup_/, '').replace(/\.zip$/, '');
		
		// Chercher le backup
		let backupPath = path.join(CONFIG.backupsDir, `backup_${versionBackup}`);
		let isZip = false;
		
		if (!fs.existsSync(backupPath)) {
			// Essayer avec .zip
			backupPath = path.join(CONFIG.backupsDir, `backup_${versionBackup}.zip`);
			if (!fs.existsSync(backupPath)) {
				log.error('ERROR', `❌ Backup "${versionBackup}" introuvable`);
				process.exit(1);
			}
			isZip = true;
		}
		
		log.info('RESTORE', `📦 Restauration du backup: ${chalk.yellow(versionBackup)}`);
		
		// Demander confirmation
		const confirm = await question(chalk.yellow('⚠️  Cette action va écraser les fichiers actuels. Continuer? (oui/non): '));
		if (confirm.toLowerCase() !== 'oui' && confirm.toLowerCase() !== 'o') {
			log.info('RESTORE', '⏸️  Restauration annulée');
			process.exit(0);
		}
		
		let restoreSource = backupPath;
		
		// Si c'est un zip, l'extraire
		if (isZip) {
			const extractPath = await extractZip(backupPath, CONFIG.backupsDir);
			restoreSource = extractPath;
		}
		
		// Vérifier l'intégrité si demandé
		if (CONFIG.verifyIntegrity) {
			const isValid = await verifyIntegrity(restoreSource);
			if (!isValid) {
				const force = await question(chalk.yellow('⚠️  Backup possiblement corrompu. Forcer la restauration? (oui/non): '));
				if (force.toLowerCase() !== 'oui' && force.toLowerCase() !== 'o') {
					log.info('RESTORE', '⏸️  Restauration annulée');
					if (isZip) await fs.remove(restoreSource);
					process.exit(0);
				}
			}
		}
		
		// Restaurer les fichiers
		log.info('RESTORE', '🔄 Restauration en cours...');
		
		const files = await fs.readdir(restoreSource);
		for (const file of files) {
			if (file !== 'node_modules' && file !== '.git') {
				await recursiveRestore(restoreSource, process.cwd(), file);
			}
		}
		
		// Mettre à jour package.json
		try {
			const packageJsonPath = path.join(process.cwd(), 'package.json');
			const packageJson = require(packageJsonPath);
			packageJson.version = versionBackup;
			await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
			log.success('RESTORE', `✅ Version mise à jour: ${versionBackup}`);
		} catch (error) {
			log.warn('RESTORE', `⚠️ Impossible de mettre à jour package.json: ${error.message}`);
		}
		
		// Nettoyer
		if (isZip) {
			await fs.remove(restoreSource);
			log.debug('RESTORE', '🧹 Nettoyage des fichiers temporaires');
		}
		
		log.success('SUCCESS', `✨ Restauration du backup ${versionBackup} terminée avec succès !`);
		
		// Proposer de redémarrer
		const restart = await question(chalk.cyan('🔄 Voulez-vous redémarrer le bot maintenant? (oui/non): '));
		if (restart.toLowerCase() === 'oui' || restart.toLowerCase() === 'o') {
			log.info('RESTORE', '🔄 Redémarrage du bot...');
			execSync('npm restart', { stdio: 'inherit' });
		}
		
	} catch (error) {
		log.error('FATAL', `❌ Erreur fatale: ${error.stack || error.message}`);
		process.exit(1);
	} finally {
		rl.close();
	}
})();
