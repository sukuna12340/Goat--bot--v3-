/**
 * MASTERBOT V3 - Change Password Route
 * Gestion du changement de mot de passe pour le dashboard
 * Version avec validation renforcée et messages en français
 */

const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();

// Messages en français
const messages = {
	fr: {
		captchaInvalid: "Veuillez valider le captcha",
		oldPasswordIncorrect: "Ancien mot de passe incorrect",
		passwordMismatch: "Les mots de passe ne correspondent pas",
		passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères",
		passwordTooWeak: "Le mot de passe est trop faible. Utilisez au moins une majuscule, un chiffre et un caractère spécial",
		success: "Mot de passe modifié avec succès !",
		serverError: "Erreur serveur, veuillez réessayer"
	},
	en: {
		captchaInvalid: "Please verify the captcha",
		oldPasswordIncorrect: "Old password is incorrect",
		passwordMismatch: "Passwords do not match",
		passwordTooShort: "Password must be at least 6 characters",
		passwordTooWeak: "Password is too weak. Use at least one uppercase letter, one number and one special character",
		success: "Password changed successfully!",
		serverError: "Server error, please try again"
	}
};

function getLang() {
	const lang = global.GoatBot?.config?.language || 'fr';
	return messages[lang] || messages.fr;
}

/**
 * Vérifie la force du mot de passe
 * @param {string} password - Mot de passe à vérifier
 * @returns {object} - { isValid: boolean, message: string }
 */
function checkPasswordStrength(password) {
	if (password.length < 6) {
		return { isValid: false, reason: "tooShort" };
	}
	
	// Vérifier la complexité (optionnel - peut être désactivé)
	const hasUpperCase = /[A-Z]/.test(password);
	const hasLowerCase = /[a-z]/.test(password);
	const hasNumbers = /\d/.test(password);
	const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
	
	if (hasUpperCase && hasLowerCase && (hasNumbers || hasSpecialChar)) {
		return { isValid: true, reason: null };
	}
	
	// Si au moins 8 caractères, on accepte même sans complexité
	if (password.length >= 8) {
		return { isValid: true, reason: null };
	}
	
	return { isValid: false, reason: "tooWeak" };
}

module.exports = function ({ isAuthenticated, isVerifyRecaptcha, dashBoardData }) {
	
	// Page de changement de mot de passe
	router
		.get("/", isAuthenticated, async (req, res) => {
			try {
				res.render("change-password", {
					title: "Changer mon mot de passe - MASTERBOT",
					user: req.user,
					messages: req.flash()
				});
			} catch (error) {
				console.error("Erreur affichage change-password:", error);
				res.status(500).send("Erreur serveur");
			}
		});
	
	// Traitement du changement de mot de passe
	router
		.post("/", isAuthenticated, async (req, res) => {
			const lang = getLang();
			
			try {
				// Vérification du captcha
				if (!await isVerifyRecaptcha(req.body["g-recaptcha-response"])) {
					return res.status(400).json({
						status: "error",
						error: "CAPTCHA_INVALID",
						message: lang.captchaInvalid
					});
				}
				
				const { oldPassword, password, password_confirmation } = req.body;
				
				// Vérification du mot de passe existant
				if (!oldPassword) {
					return res.status(400).json({
						status: "error",
						error: "OLD_PASSWORD_REQUIRED",
						message: "L'ancien mot de passe est requis"
					});
				}
				
				// Vérifier si l'ancien mot de passe est correct
				const isMatch = await bcrypt.compare(oldPassword, req.user.password);
				if (!isMatch) {
					return res.status(400).json({
						status: "error",
						error: "OLD_PASSWORD_INCORRECT",
						message: lang.oldPasswordIncorrect
					});
				}
				
				// Vérifier que le nouveau mot de passe est différent
				if (oldPassword === password) {
					return res.status(400).json({
						status: "error",
						error: "SAME_PASSWORD",
						message: "Le nouveau mot de passe doit être différent de l'ancien"
					});
				}
				
				// Vérifier la confirmation
				if (password !== password_confirmation) {
					return res.status(400).json({
						status: "error",
						error: "PASSWORD_MISMATCH",
						message: lang.passwordMismatch
					});
				}
				
				// Vérifier la longueur
				if (password.length < 6) {
					return res.status(400).json({
						status: "error",
						error: "PASSWORD_TOO_SHORT",
						message: lang.passwordTooShort
					});
				}
				
				// Vérifier la force du mot de passe (optionnel)
				const strengthCheck = checkPasswordStrength(password);
				if (!strengthCheck.isValid) {
					return res.status(400).json({
						status: "error",
						error: "PASSWORD_TOO_WEAK",
						message: lang.passwordTooWeak
					});
				}
				
				// Hasher le nouveau mot de passe
				const hashPassword = bcrypt.hashSync(password, 12); // Salt rounds 12 pour plus de sécurité
				
				// Mettre à jour dans la base de données
				await dashBoardData.set(req.user.email, { password: hashPassword });
				
				// Flash message de succès
				req.flash("success", {
					msg: lang.success
				});
				
				// Réponse JSON pour AJAX ou redirection
				if (req.xhr || req.headers.accept?.includes('application/json')) {
					return res.json({
						status: "success",
						message: lang.success
					});
				}
				
				// Redirection pour formulaire classique
				return res.redirect("/dashboard");
				
			} catch (error) {
				console.error("Erreur changement mot de passe:", error);
				
				const lang = getLang();
				return res.status(500).json({
					status: "error",
					error: "SERVER_ERROR",
					message: lang.serverError
				});
			}
		});

	return router;
};
