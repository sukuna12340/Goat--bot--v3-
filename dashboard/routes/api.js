/**
 * MASTERBOT V3 - API Routes
 * Routes pour la gestion des fichiers et des données du dashboard
 * Version avec sécurité renforcée et messages en français
 */

const stream = require("stream");
const express = require("express");
const path = require("path");
const mimeDB = require("mime-db");
const router = express.Router();

// Messages d'erreur multilingues
const messages = {
	fr: {
		fileIdRequired: "ID du fichier requis",
		threadIdRequired: "ID du groupe requis",
		locationRequired: "Emplacement requis",
		locationIllegal: "Emplacement non autorisé",
		threadNotFound: "Groupe introuvable",
		fileNotFound: "Fichier non trouvé dans cet emplacement",
		permissionDenied: "Vous n'avez pas la permission",
		noFiles: "Aucun fichier téléchargé",
		tooManyFiles: "Vous ne pouvez télécharger que 20 fichiers à la fois",
		fileTooLarge: "Fichier trop volumineux",
		serverError: "Erreur serveur, veuillez réessayer",
		unauthorized: "Non autorisé",
		typeIllegal: "Type non autorisé",
		commandNameRequired: "Nom de la commande requis"
	},
	en: {
		fileIdRequired: "File ID required",
		threadIdRequired: "Thread ID required",
		locationRequired: "Location required",
		locationIllegal: "Location not allowed",
		threadNotFound: "Thread not found",
		fileNotFound: "File not found in this location",
		permissionDenied: "You don't have permission",
		noFiles: "No files uploaded",
		tooManyFiles: "You can only upload 20 files at a time",
		fileTooLarge: "File too large",
		serverError: "Server error, please try again",
		unauthorized: "Unauthorized",
		typeIllegal: "Type not allowed",
		commandNameRequired: "Command name required"
	}
};

function getLang() {
	const lang = global.GoatBot?.config?.language || 'fr';
	return messages[lang] || messages.fr;
}

module.exports = function ({ 
	isAuthenticated, 
	isVeryfiUserIDFacebook, 
	checkHasAndInThread, 
	threadsData, 
	drive, 
	checkAuthConfigDashboardOfThread, 
	usersData, 
	createLimiter, 
	middlewareCheckAuthConfigDashboardOfThread, 
	isVideoFile 
}) {
	const apiLimiter = createLimiter(1000 * 60 * 5, 10);

	/**
	 * DELETE /api/delete/:slug
	 * Supprime des fichiers du dashboard
	 */
	router
		.post("/delete/:slug", [isAuthenticated, isVeryfiUserIDFacebook, checkHasAndInThread, middlewareCheckAuthConfigDashboardOfThread, apiLimiter], async function (req, res) {
			const lang = getLang();
			const { fileIDs, threadID, location } = req.body;
			
			if (!fileIDs || !fileIDs.length) {
				return res.status(400).send({
					status: "error",
					error: "FILE_ID_NOT_FOUND",
					message: lang.fileIdRequired
				});
			}
			
			if (!threadID) {
				return res.status(400).send({
					status: "error",
					error: "THREAD_ID_NOT_FOUND",
					message: lang.threadIdRequired
				});
			}
			
			if (!location) {
				return res.status(400).send({
					status: "error",
					error: "LOCATION_NOT_FOUND",
					message: lang.locationRequired
				});
			}
			
			if (!["data.welcomeAttachment", "data.leaveAttachment"].includes(location)) {
				return res.status(400).send({
					status: "error",
					error: "LOCATION_ILLEGAL",
					message: lang.locationIllegal
				});
			}

			const threadData = await threadsData.get(threadID);
			if (!threadData) {
				return res.status(404).send({
					status: "error",
					error: "THREAD_NOT_FOUND",
					message: lang.threadNotFound
				});
			}

			let dataOfLocation = await threadsData.get(threadID, location);
			const fileIDsDeleted = [];

			const pendingDelete = fileIDs.map(async fileID => {
				try {
					const index = dataOfLocation.indexOf(fileID);
					if (index === -1) {
						throw {
							error: "FILE_ID_NOT_FOUND",
							message: `${lang.fileNotFound}: ${fileID}`
						};
					}
					await drive.deleteFile(fileID);
					fileIDsDeleted.push(fileID);
					return { id: fileID, status: "success" };
				} catch (err) {
					throw {
						id: fileID,
						error: err.error || "DELETE_ERROR",
						message: err.message || lang.serverError
					};
				}
			});

			const successPromise = await Promise.allSettled(pendingDelete);
			dataOfLocation = dataOfLocation.filter(fileID => !fileIDsDeleted.includes(fileID));

			const success = successPromise
				.filter(item => item.status === "fulfilled")
				.map(({ value }) => value.id);
				
			const failed = successPromise
				.filter(item => item.status === "rejected")
				.map(({ reason }) => ({
					id: reason.id,
					error: reason.error,
					message: reason.message
				}));

			await threadsData.set(threadID, dataOfLocation, location);

			res.type("json").send(JSON.stringify({
				status: "success",
				success,
				failed
			}));
		});

	/**
	 * POST /api/upload/:type
	 * Upload de fichiers (bienvenue/départ)
	 */
	router
		.post(
			"/upload/:type",
			[isAuthenticated, isVeryfiUserIDFacebook, checkHasAndInThread, apiLimiter],
			async function (req, res) {
				const lang = getLang();
				const { threadID, commandName } = req.body;
				const { type } = req.params;
				const userID = req.user.facebookUserID;

				if (!threadID) {
					return res.status(400).json({
						status: "error",
						error: "THREAD_ID_NOT_FOUND",
						message: lang.threadIdRequired
					});
				}

				if (!commandName) {
					return res.status(400).json({
						status: "error",
						error: "COMMAND_NAME_NOT_FOUND",
						message: lang.commandNameRequired
					});
				}

				if (!["welcomeAttachment", "leaveAttachment"].includes(type)) {
					return res.status(400).send({
						status: "error",
						error: "TYPE_ILLEGAL",
						message: lang.typeIllegal
					});
				}

				if (!checkAuthConfigDashboardOfThread(threadID, userID)) {
					return res.status(403).json({
						status: "error",
						error: "PERMISSION_DENIED",
						message: lang.permissionDenied
					});
				}

				let files = req.files;
				if (!files) {
					return res.status(400).json({
						status: "error",
						error: "NO_FILES",
						message: lang.noFiles
					});
				}

				let dataOfLocation = await threadsData.get(threadID, `data.${type}`, []);
				files = Object.values(files);
				
				if (files.length > 20) {
					return res.status(400).json({
						status: "error",
						error: "TOO_MANY_FILES",
						message: lang.tooManyFiles
					});
				}

				if (dataOfLocation.length + files.length > 20) {
					return res.status(400).json({
						status: "error",
						error: "STORAGE_LIMIT_EXCEEDED",
						message: `${lang.tooManyFiles} (${dataOfLocation.length}/20 fichiers existants)`
					});
				}

				let i = 0;
				const pendingUpload = files.reduce((arr, file) => {
					const maxSize = isVideoFile(file.mimetype) ? 83 * 1024 * 1024 : 25 * 1024 * 1024;
					
					if (file.size > maxSize) {
						arr.push({
							count: i++,
							rootName: file.name,
							file: Promise.reject({
								error: "FILE_TOO_LARGE",
								message: lang.fileTooLarge
							})
						});
						return arr;
					}

					const bufferStream = new stream.PassThrough();
					bufferStream.end(file.data);
					const ext = path.extname(file.name).split(".")[1] || mimeDB[file.mimetype]?.extensions?.[0] || "unknown";
					const newFileName = `${commandName}_${threadID}_${userID}_${Date.now()}.${ext}`;
					
					arr.push({
						count: i++,
						rootName: file.name,
						file: drive.uploadFile(newFileName, bufferStream),
						newFileName
					});
					return arr;
				}, []);

				const success = [], failed = [];

				for (const item of pendingUpload) {
					try {
						const file = await item.file;
						success.push({
							id: file.id,
							mimeType: file.mimeType,
							webContentLink: file.webContentLink,
							webViewLink: file.webViewLink,
							iconLink: file.iconLink,
							thumbnailLink: file.thumbnailLink,
							createdTime: file.createdTime,
							fileExtension: file.fileExtension,
							size: file.size,
							imageMediaMetadata: file.imageMediaMetadata || null,
							fullFileExtension: file.fullFileExtension,
							urlDownload: drive.getUrlDownload(file.id),
							rootName: item.rootName,
							count: item.count,
							newFileName: item.newFileName
						});
					} catch (err) {
						failed.push({
							error: err.error || "UPLOAD_ERROR",
							message: err.message || lang.serverError,
							rootName: item.rootName,
							count: item.count
						});
					}
				}

				const fileIDs = success.map(file => file.id);
				try {
					dataOfLocation = [...dataOfLocation, ...fileIDs];
					await threadsData.set(threadID, dataOfLocation, `data.${type}`);
				} catch (err) {
					console.error("Erreur sauvegarde:", err);
				}

				res.type("json").send(JSON.stringify({
					status: "success",
					success,
					failed
				}));
			}
		);

	/**
	 * POST /api/thread/setData/:slug
	 * Met à jour les données du thread
	 */
	router
		.post("/thread/setData/:slug", [isAuthenticated, isVeryfiUserIDFacebook, checkHasAndInThread, apiLimiter], async function (req, res) {
			const lang = getLang();
			const { slug } = req.params;
			const { threadID, type } = req.body;
			
			if (!checkAuthConfigDashboardOfThread(threadID, req.user.facebookUserID)) {
				return res.status(403).json({
					status: "error",
					error: "PERMISSION_DENIED",
					message: lang.permissionDenied
				});
			}
			
			const threadData = await threadsData.get(threadID);
			
			try {
				switch (slug) {
					case "welcomeAttachment":
					case "leaveAttachment": {
						const { attachmentIDs } = req.body;
						if (!threadData.data[slug]) threadData.data[slug] = [];
						if (type === "add") {
							threadData.data[slug].push(...attachmentIDs);
						} else if (type === "delete") {
							threadData.data[slug] = threadData.data[slug].filter(item => !attachmentIDs.includes(item));
						}
						break;
					}
					case "welcomeMessage":
					case "leaveMessage": {
						const { message } = req.body;
						if (type === "update") {
							threadData.data[slug] = message;
						} else {
							delete threadData.data[slug];
						}
						break;
					}
					case "settings": {
						const { updateData } = req.body;
						for (const key in updateData) {
							threadData.settings[key] = updateData[key] === "true" || updateData[key] === true;
						}
						break;
					}
					default:
						return res.status(400).json({
							status: "error",
							error: "INVALID_SLUG",
							message: "Action non reconnue"
						});
				}
			} catch (err) {
				console.error("Erreur mise à jour:", err);
				return res.status(500).json({
					status: "error",
					error: "UPDATE_ERROR",
					message: lang.serverError
				});
			}

			try {
				await threadsData.set(threadID, threadData);
				res.json({
					status: "success",
					message: "Données mises à jour avec succès"
				});
			} catch (e) {
				console.error("Erreur sauvegarde:", e);
				res.status(500).json({
					status: "error",
					error: "SAVE_ERROR",
					message: lang.serverError
				});
			}
		});

	/**
	 * GET /api/getUserData
	 * Récupère les données d'un utilisateur
	 */
	router
		.get("/getUserData", [isAuthenticated, isVeryfiUserIDFacebook], async (req, res) => {
			const lang = getLang();
			const targetUID = req.query.userID || req.user.facebookUserID;
			
			// Vérifier les permissions si on demande un autre utilisateur
			if (req.query.userID && req.query.userID !== req.user.facebookUserID) {
				const isAdmin = global.GoatBot?.config?.adminBot?.includes(req.user.facebookUserID);
				if (!isAdmin) {
					return res.status(403).json({
						status: "error",
						error: "UNAUTHORIZED",
						message: lang.unauthorized
					});
				}
			}

			try {
				const userData = await usersData.get(targetUID);
				return res.status(200).json({
					status: "success",
					data: userData
				});
			} catch (e) {
				console.error("Erreur getUserData:", e);
				return res.status(500).json({
					status: "error",
					error: "DATABASE_ERROR",
					message: e.message || lang.serverError
				});
			}
		});

	/**
	 * GET /api/getThreads
	 * Récupère les threads d'un utilisateur
	 */
	router
		.get("/getThreads", [isAuthenticated, isVeryfiUserIDFacebook], async (req, res) => {
			const lang = getLang();
			const userID = req.user.facebookUserID;
			
			try {
				let allThreads = await threadsData.getAll();
				allThreads = allThreads.filter(t => t.members?.some(m => m.userID == userID));
				
				return res.status(200).json({
					status: "success",
					data: allThreads,
					count: allThreads.length
				});
			} catch (e) {
				console.error("Erreur getThreads:", e);
				return res.status(500).json({
					status: "error",
					error: "DATABASE_ERROR",
					message: e.message || lang.serverError
				});
			}
		});

	return router;
};
