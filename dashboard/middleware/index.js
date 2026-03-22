/**
 * MASTERBOT V3 - Routes Dashboard
 * Middlewares d'authentification et de permissions pour le dashboard
 * Version multilingue avec couleurs MASTERBOT
 */

const { threadsData } = global.db;

// Fonction utilitaire
function isPostMethod(req) {
	return req.method === "POST";
}

// Messages multilingues
const messages = {
	fr: {
		notLoggedIn: "Vous devez être connecté",
		loginRequired: "Vous devez vous connecter pour accéder à cette page",
		permissionDenied: "Permission refusée",
		verifyFacebook: "Vous devez vérifier votre identifiant Facebook",
		threadNotFound: "Groupe introuvable",
		notMember: "Vous n'êtes pas membre de ce groupe",
		noPermission: "Vous n'avez pas la permission de modifier ce groupe",
		adminOnly: "Seuls les administrateurs du bot peuvent effectuer cette action",
		errorOccurred: "Une erreur est survenue",
		redirecting: "Redirection en cours..."
	},
	en: {
		notLoggedIn: "You must be logged in",
		loginRequired: "Please log in to access this page",
		permissionDenied: "Permission denied",
		verifyFacebook: "You must verify your Facebook ID",
		threadNotFound: "Thread not found",
		notMember: "You are not a member of this group",
		noPermission: "You don't have permission to edit this group",
		adminOnly: "Only bot administrators can perform this action",
		errorOccurred: "An error occurred",
		redirecting: "Redirecting..."
	}
};

// Récupérer la langue depuis la config
function getLang() {
	const lang = global.GoatBot?.config?.language || 'fr';
	return messages[lang] || messages.fr;
}

/**
 * Middleware d'authentification
 * Vérifie si l'utilisateur est connecté
 */
function isAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}

	const lang = getLang();
	
	if (isPostMethod(req)) {
		return res.status(401).send({
			status: "error",
			error: "PERMISSION_DENIED",
			message: lang.notLoggedIn
		});
	}

	req.flash("errors", { msg: lang.loginRequired });
	res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
}

/**
 * Middleware pour utilisateurs non authentifiés
 */
function unAuthenticated(req, res, next) {
	if (!req.isAuthenticated()) {
		return next();
	}

	const lang = getLang();
	
	if (isPostMethod(req)) {
		return res.status(401).send({
			status: "error",
			error: "ALREADY_AUTHENTICATED",
			message: lang.errorOccurred
		});
	}

	res.redirect("/dashboard");
}

/**
 * Vérifie si l'utilisateur a vérifié son ID Facebook
 */
function isVerifiedFacebookUser(req, res, next) {
	if (req.user?.facebookUserID) {
		return next();
	}

	const lang = getLang();
	
	if (isPostMethod(req)) {
		return res.status(401).send({
			status: "error",
			error: "FACEBOOK_NOT_VERIFIED",
			message: lang.verifyFacebook
		});
	}

	req.flash("errors", { msg: lang.verifyFacebook });
	res.redirect(`/verifyfbid?redirect=${encodeURIComponent(req.originalUrl)}`);
}

/**
 * Vérifie si le compte est en attente de vérification
 */
function isWaitVerifyAccount(req, res, next) {
	if (req.session?.waitVerifyAccount) {
		return next();
	}

	const lang = getLang();
	
	if (isPostMethod(req)) {
		return res.status(401).send({
			status: "error",
			error: "ACCOUNT_NOT_VERIFIED",
			message: lang.errorOccurred
		});
	}

	res.redirect("/register");
}

/**
 * Vérifie si l'utilisateur est membre du groupe
 */
async function checkHasAndInThread(req, res, next) {
	const userID = req.user?.facebookUserID;
	if (!userID) {
		return res.redirect("/login");
	}
	
	const threadID = isPostMethod(req) ? req.body.threadID : req.params.threadID;
	
	if (!threadID) {
		if (isPostMethod(req)) {
			return res.status(400).send({
				status: "error",
				error: "MISSING_THREAD_ID",
				message: "Thread ID manquant"
			});
		}
		req.flash("errors", { msg: "Thread ID manquant" });
		return res.redirect("/dashboard");
	}
	
	try {
		const threadData = await threadsData.get(threadID);
		
		if (!threadData) {
			const lang = getLang();
			if (isPostMethod(req)) {
				return res.status(404).send({
					status: "error",
					error: "THREAD_NOT_FOUND",
					message: lang.threadNotFound
				});
			}
			req.flash("errors", { msg: lang.threadNotFound });
			return res.redirect("/dashboard");
		}
		
		const findMember = threadData.members?.find(m => m.userID == userID && m.inGroup === true);
		
		if (!findMember) {
			const lang = getLang();
			if (isPostMethod(req)) {
				return res.status(403).send({
					status: "error",
					error: "NOT_MEMBER",
					message: lang.notMember
				});
			}
			req.flash("errors", { msg: lang.notMember });
			return res.redirect("/dashboard");
		}
		
		req.threadData = threadData;
		next();
		
	} catch (error) {
		console.error("❌ Erreur checkHasAndInThread:", error);
		const lang = getLang();
		if (isPostMethod(req)) {
			return res.status(500).send({
				status: "error",
				error: "SERVER_ERROR",
				message: lang.errorOccurred
			});
		}
		req.flash("errors", { msg: lang.errorOccurred });
		res.redirect("/dashboard");
	}
}

/**
 * Middleware pour vérifier les permissions de modification du dashboard
 */
function middlewareCheckAuthConfigDashboardOfThread(req, res, next) {
	const threadID = isPostMethod(req) ? req.body.threadID : req.params.threadID;
	const userID = req.user?.facebookUserID;
	
	if (!threadID || !userID) {
		if (isPostMethod(req)) {
			return res.status(400).send({
				status: "error",
				error: "MISSING_PARAMS",
				message: "Paramètres manquants"
			});
		}
		req.flash("errors", { msg: "Paramètres manquants" });
		return res.redirect("/dashboard");
	}
	
	// Vérifier les permissions (fonction externe)
	const checkAuth = require('../config/dashboardAuth');
	if (checkAuth(threadID, userID)) {
		return next();
	}
	
	const lang = getLang();
	
	if (isPostMethod(req)) {
		return res.status(403).send({
			status: "error",
			error: "PERMISSION_DENIED",
			message: lang.noPermission
		});
	}
	
	req.flash("errors", { msg: lang.noPermission });
	return res.redirect("/dashboard");
}

/**
 * Vérifie si l'utilisateur est administrateur du bot
 */
async function isAdmin(req, res, next) {
	const userID = req.user?.facebookUserID;
	const adminBot = global.GoatBot?.config?.adminBot || [];
	
	if (!userID || !adminBot.includes(userID)) {
		const lang = getLang();
		
		if (isPostMethod(req)) {
			return res.status(403).send({
				status: "error",
				error: "ADMIN_ONLY",
				message: lang.adminOnly
			});
		}
		
		req.flash("errors", { msg: lang.adminOnly });
		return res.redirect("/dashboard");
	}
	
	next();
}

/**
 * Middleware pour vérifier les permissions avancées
 */
function checkPermission(requiredLevel = 0) {
	return async function(req, res, next) {
		const userID = req.user?.facebookUserID;
		const adminBot = global.GoatBot?.config?.adminBot || [];
		
		// Niveau 0: tous les utilisateurs connectés
		if (requiredLevel === 0) {
			if (req.isAuthenticated()) return next();
			return res.redirect("/login");
		}
		
		// Niveau 1: admin du bot
		if (requiredLevel === 1) {
			if (adminBot.includes(userID)) return next();
			const lang = getLang();
			req.flash("errors", { msg: lang.adminOnly });
			return res.redirect("/dashboard");
		}
		
		next();
	};
}

// Exports
module.exports = function (checkAuthConfigDashboardOfThread) {
	return {
		isAuthenticated,
		unAuthenticated,
		isVeryfiUserIDFacebook: isVerifiedFacebookUser,
		isWaitVerifyAccount,
		checkHasAndInThread,
		middlewareCheckAuthConfigDashboardOfThread,
		isAdmin,
		checkPermission
	};
};
