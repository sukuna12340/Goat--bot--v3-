/**
 * 🛠️ MASTERBOT V3 - FONCTIONS UTILITAIRES ULTRA
 * Version allégée pour GitHub
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");
const https = require("https");
const agent = new https.Agent({ rejectUnauthorized: false });
const moment = require("moment-timezone");
const mimeDB = require("mime-db");
const _ = require("lodash");
const { google } = require("googleapis");
const log = require("./logger/log.js");

// ==================== CONFIGURATION ====================
const { config } = global.MasterBot || global.GoatBot;
const { gmailAccount } = config.credentials || {};
const { clientId, clientSecret, refreshToken } = gmailAccount || {};

// Vérification des identifiants Google
if (!clientId && process.env.NODE_ENV !== 'test') {
	log.warn("CREDENTIALS", "⚠️ Identifiants Gmail manquants (optionnel)");
}

// ==================== GOOGLE DRIVE ====================
let driveApi = null;
if (clientId && clientSecret && refreshToken) {
	try {
		const oauth2ClientForGGDrive = new google.auth.OAuth2(clientId, clientSecret, "https://developers.google.com/oauthplayground");
		oauth2ClientForGGDrive.setCredentials({ refresh_token: refreshToken });
		driveApi = google.drive({ version: 'v3', auth: oauth2ClientForGGDrive });
	} catch (e) {
		log.warn("DRIVE", "⚠️ Google Drive non initialisé");
	}
}

// ==================== CONSTANTES ====================
const wordChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹ'.split('');
const regCheckURL = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

// ==================== CLASS CUSTOM ERROR ====================
class CustomError extends Error {
	constructor(obj) {
		if (typeof obj === 'string') obj = { message: obj };
		if (typeof obj !== 'object' || obj === null) throw new TypeError('Object required');
		obj.message ? super(obj.message) : super();
		Object.assign(this, obj);
	}
}

// ==================== FONCTIONS DE BASE ====================

/**
 * Convertit un temps en millisecondes en format lisible
 */
function convertTime(miliSeconds, replace = { s: 's', m: 'm', h: 'h', d: 'd', M: 'M', y: 'y' }, notShowZero = false) {
	const second = Math.floor(miliSeconds / 1000 % 60);
	const minute = Math.floor(miliSeconds / 1000 / 60 % 60);
	const hour = Math.floor(miliSeconds / 1000 / 60 / 60 % 24);
	const day = Math.floor(miliSeconds / 1000 / 60 / 60 / 24 % 30);
	const month = Math.floor(miliSeconds / 1000 / 60 / 60 / 24 / 30 % 12);
	const year = Math.floor(miliSeconds / 1000 / 60 / 60 / 24 / 30 / 12);
	
	let result = '';
	const parts = [
		{ val: year, char: replace.y },
		{ val: month, char: replace.M },
		{ val: day, char: replace.d },
		{ val: hour, char: replace.h },
		{ val: minute, char: replace.m },
		{ val: second, char: replace.s }
	];
	
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].val || result || i === parts.length - 1) {
			result += (parts[i].val || (result ? '0' : '0')) + parts[i].char;
		}
	}
	
	if (notShowZero) result = result.replace(/00\w+/g, '');
	return result;
}

/**
 * Formate un nombre selon la locale
 */
function formatNumber(number) {
	if (isNaN(number)) throw new Error('Le premier argument doit être un nombre');
	return Number(number).toLocaleString(config.language || 'fr-FR');
}

/**
 * Obtient l'extension à partir du type de pièce jointe
 */
function getExtFromAttachmentType(type) {
	const map = { photo: 'png', animated_image: 'gif', video: 'mp4', audio: 'mp3' };
	return map[type] || 'txt';
}

/**
 * Obtient l'extension à partir du type MIME
 */
function getExtFromMimeType(mimeType = '') {
	return mimeDB[mimeType] ? (mimeDB[mimeType].extensions || [])[0] || 'unknow' : 'unknow';
}

/**
 * Obtient l'extension à partir d'une URL
 */
function getExtFromUrl(url = '') {
	if (!url || typeof url !== 'string') throw new Error('URL invalide');
	const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
	return match ? match[1] : 'noext';
}

/**
 * Obtient le préfixe pour un thread
 */
function getPrefix(threadID) {
	if (!threadID) return config.prefix || '!';
	const threadData = global.db?.allThreadData?.find(t => t.threadID == threadID);
	return threadData?.data?.prefix || config.prefix || '!';
}

/**
 * Obtient la date formatée
 */
function getTime(timestamps, format) {
	if (!format && typeof timestamps === 'string') {
		format = timestamps;
		timestamps = undefined;
	}
	return moment(timestamps).tz(config.timeZone || 'Europe/Paris').format(format || 'HH:mm DD/MM/YYYY');
}

/**
 * Retourne le type d'une variable
 */
function getType(value) {
	return Object.prototype.toString.call(value).slice(8, -1);
}

/**
 * Vérifie si une valeur est un nombre
 */
function isNumber(value) {
	return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Génère une chaîne aléatoire
 */
function randomString(max = 10, onlyOnce = false, possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
	let text = '';
	for (let i = 0; i < max; i++) {
		let random = Math.floor(Math.random() * possible.length);
		if (onlyOnce) {
			while (text.includes(possible[random]))
				random = Math.floor(Math.random() * possible.length);
		}
		text += possible[random];
	}
	return text;
}

/**
 * Génère un nombre aléatoire
 */
function randomNumber(min, max) {
	if (max === undefined) { max = min; min = 0; }
	if (isNaN(min) || isNaN(max)) throw new Error('Les arguments doivent être des nombres');
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Supprime le chemin du dossier courant
 */
function removeHomeDir(fullPath) {
	if (!fullPath || typeof fullPath !== 'string') throw new Error('Le chemin doit être une chaîne');
	return fullPath.replace(process.cwd(), '');
}

/**
 * Sépare un tableau en pages
 */
function splitPage(arr, limit) {
	const allPage = _.chunk(arr, limit);
	return { totalPage: allPage.length, allPage };
}

// ==================== FONCTIONS API ====================

/**
 * Traduction via Google Translate
 */
async function translateAPI(text, lang) {
	try {
		const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`);
		return res.data[0][0][0];
	} catch (err) {
		throw new CustomError(err.response?.data || err.message);
	}
}

/**
 * Traduction intelligente avec préservation des balises
 */
async function translate(text, lang = 'en') {
	if (typeof text !== 'string') throw new Error('Le texte doit être une chaîne');
	
	// Version simplifiée sans parsing complexe
	try {
		return await translateAPI(text, lang);
	} catch (err) {
		return text;
	}
}

/**
 * Télécharge un fichier depuis une URL
 */
async function downloadFile(url = '', destPath = '') {
	if (!url || typeof url !== 'string') throw new Error('URL invalide');
	if (!destPath || typeof destPath !== 'string') throw new Error('Chemin de destination invalide');
	
	try {
		const response = await axios.get(url, { responseType: 'arraybuffer' });
		fs.writeFileSync(destPath, Buffer.from(response.data));
		return destPath;
	} catch (err) {
		throw new CustomError(err.response?.data || err.message);
	}
}

/**
 * Trouve l'UID Facebook à partir d'un lien
 */
async function findUid(link) {
	try {
		// Méthode 1: SEO Magnifier
		const response = await axios.post('https://seomagnifier.com/fbid', 
			new URLSearchParams({ facebook: '1', sitelink: link }),
			{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
		);
		
		const id = response.data;
		if (!isNaN(id)) return id;
		
		// Méthode 2: Meta tag
		const html = await axios.get(link);
		const $ = cheerio.load(html.data);
		const meta = $('meta[property="al:android:url"]').attr('content');
		if (meta) {
			const number = meta.split('/').pop();
			if (!isNaN(number)) return number;
		}
		
		throw new Error('UID non trouvé');
	} catch (error) {
		throw new Error('Impossible de trouver l\'UID');
	}
}

/**
 * Obtient un stream à partir d'une URL
 */
async function getStreamFromURL(url = '', pathName = '', options = {}) {
	try {
		if (!url || typeof url !== 'string') throw new Error('URL invalide');
		
		const response = await axios({ url, method: 'GET', responseType: 'stream', ...options });
		
		if (!pathName) {
			const ext = getExtFromMimeType(response.headers['content-type']) || 'noext';
			pathName = `${randomString(10)}.${ext}`;
		}
		
		response.data.path = pathName;
		return response.data;
	} catch (err) {
		throw err;
	}
}

/**
 * Obtient des streams à partir de pièces jointes
 */
async function getStreamsFromAttachment(attachments) {
	const streams = [];
	for (const attachment of attachments) {
		try {
			const url = attachment.url;
			const ext = getExtFromUrl(url);
			const fileName = `${randomString(10)}.${ext}`;
			const response = await axios({ url, method: 'GET', responseType: 'stream' });
			response.data.path = fileName;
			streams.push(response.data);
		} catch (e) {
			log.debug('STREAM', `Erreur sur pièce jointe: ${e.message}`);
		}
	}
	return streams;
}

/**
 * Raccourcit une URL avec TinyURL
 */
async function shortenURL(url) {
	try {
		const result = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
		return result.data;
	} catch (err) {
		return url;
	}
}

/**
 * Upload une image sur ImgBB
 */
async function uploadImgbb(file) {
	try {
		if (!file) throw new Error('Fichier requis');
		
		// Obtenir le token
		const page = await axios.get('https://imgbb.com');
		const auth_token = page.data.match(/auth_token="([^"]+)"/)[1];
		const timestamp = Date.now();
		
		// Upload
		const res = await axios({
			method: 'POST',
			url: 'https://imgbb.com/json',
			headers: { 'Content-Type': 'multipart/form-data' },
			data: {
				source: file,
				type: regCheckURL.test(file) ? 'url' : 'file',
				action: 'upload',
				timestamp,
				auth_token
			}
		});
		
		return res.data.image?.url || null;
	} catch (err) {
		log.debug('IMG_UPLOAD', `Erreur upload: ${err.message}`);
		return null;
	}
}

// ==================== GOOGLE DRIVE ====================

const drive = {
	parentID: null,
	
	async upload(file, fileName, parentId = null) {
		if (!driveApi) throw new Error('Google Drive non configuré');
		
		const media = { body: file };
		const resource = { name: fileName, parents: [parentId || this.parentID] };
		
		const response = await driveApi.files.create({ resource, media, fields: 'id,webViewLink' });
		return response.data;
	},
	
	async delete(fileId) {
		if (!driveApi) throw new Error('Google Drive non configuré');
		return await driveApi.files.delete({ fileId });
	},
	
	async getFile(fileId) {
		if (!driveApi) throw new Error('Google Drive non configuré');
		const response = await driveApi.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
		return response.data;
	},
	
	async checkAndCreateParentFolder(folderName) {
		if (!driveApi) return null;
		
		const response = await driveApi.files.list({
			q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
			fields: 'files(id)'
		});
		
		if (response.data.files.length > 0) {
			return response.data.files[0].id;
		}
		
		const folder = await driveApi.files.create({
			resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder' },
			fields: 'id'
		});
		
		return folder.data.id;
	}
};

// ==================== MESSAGE HELPER ====================

function message(api, event) {
	async function sendError(err) {
		const msg = err.stack ? err.stack : (err.message || JSON.stringify(err));
		return await api.sendMessage(`❌ Erreur: ${msg.substring(0, 1000)}`, event.threadID);
	}
	
	return {
		send: async (form, cb) => {
			try { return await api.sendMessage(form, event.threadID, cb); } 
			catch (e) { throw e; }
		},
		reply: async (form, cb) => {
			try { return await api.sendMessage(form, event.threadID, cb, event.messageID); } 
			catch (e) { throw e; }
		},
		unsend: async (msgID, cb) => await api.unsendMessage(msgID, cb),
		reaction: async (emoji, msgID, cb) => await api.setMessageReaction(emoji, msgID, cb, true),
		error: async (err) => await sendError(err),
		err: async (err) => await sendError(err)
	};
}

// ==================== EXPORTS ====================

module.exports = {
	// Classes
	CustomError,
	
	// Fonctions de base
	convertTime,
	formatNumber,
	getExtFromAttachmentType,
	getExtFromMimeType,
	getExtFromUrl,
	getPrefix,
	getTime,
	getType,
	isNumber,
	randomString,
	randomNumber,
	removeHomeDir,
	splitPage,
	
	// API
	translateAPI,
	translate,
	downloadFile,
	findUid,
	getStreamFromURL,
	getStreamsFromAttachment,
	shortenURL,
	uploadImgbb,
	
	// Google Drive
	drive,
	
	// Message helper
	message,
	
	// Utilitaires supplémentaires
	regCheckURL,
	axios,
	fs,
	path,
	moment
};
