/**
 * MASTERBOT V3 - Toast Notification System
 * Système de notifications élégant pour le dashboard MASTERBOT
 * 
 * Fonctionnalités :
 * - Notifications success, error, warning, info
 * - Barre de progression animée
 * - Durée personnalisable
 * - Fermeture manuelle
 * - File d'attente des notifications
 */

(function($) {
	'use strict';
	
	// File d'attente des notifications
	let toastQueue = [];
	let isShowingToast = false;
	
	// Créer le conteneur s'il n'existe pas
	function ensureToastContainer() {
		let parentToast = document.getElementById("toast");
		if (!parentToast) {
			parentToast = document.createElement("div");
			parentToast.id = "toast";
			parentToast.style.cssText = `
				position: fixed;
				top: 20px;
				right: 20px;
				z-index: 999999;
				display: flex;
				flex-direction: column;
				gap: 10px;
			`;
			document.body.appendChild(parentToast);
		}
		return parentToast;
	}
	
	// Afficher le prochain toast dans la file
	function showNextToast() {
		if (isShowingToast || toastQueue.length === 0) return;
		
		isShowingToast = true;
		const options = toastQueue.shift();
		
		const parentToast = ensureToastContainer();
		const div = document.createElement("div");
		
		// Définir les couleurs MASTERBOT
		const icons = {
			success: {
				icon: "fas fa-check-circle",
				color: "#00d68f",
				bgColor: "rgba(0, 214, 143, 0.1)"
			},
			info: {
				icon: "fas fa-info-circle",
				color: "#ff69b4",
				bgColor: "rgba(255, 105, 180, 0.1)"
			},
			warning: {
				icon: "fas fa-exclamation-triangle",
				color: "#ff9f43",
				bgColor: "rgba(255, 159, 67, 0.1)"
			},
			error: {
				icon: "fas fa-times-circle",
				color: "#ff5b5b",
				bgColor: "rgba(255, 91, 91, 0.1)"
			},
			danger: {
				icon: "fas fa-skull-crossbones",
				color: "#dc3545",
				bgColor: "rgba(220, 53, 69, 0.1)"
			}
		};
		
		let type = options.type || "success";
		if (type === "danger") type = "error";
		
		const iconInfo = icons[type] || icons.success;
		const duration = options.duration || 3000;
		const title = options.title || "";
		const message = options.message || "";
		const delay = (duration / 1000).toFixed(2);
		
		// Ajouter les styles
		div.classList.add("toast");
		div.style.cssText = `
			border-left: 4px solid ${iconInfo.color};
			background: ${iconInfo.bgColor};
			border-radius: 12px;
			padding: 16px 20px;
			margin-bottom: 10px;
			min-width: 300px;
			max-width: 400px;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			animation: slideInRight 0.3s ease forwards;
			position: relative;
			overflow: hidden;
		`;
		
		const className = 'progress_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
		
		div.innerHTML = `
			<div class="toast-content" style="display: flex; align-items: center; gap: 12px;">
				<i class="${iconInfo.icon}" style="font-size: 24px; color: ${iconInfo.color};"></i>
				<div class="message" style="flex: 1;">
					${title ? `<span class="text text-1" style="font-weight: 600; color: ${iconInfo.color}; display: block; margin-bottom: 4px;">${escapeHtml(title)}</span>` : ''}
					<span class="text text-2" style="color: #666; font-size: 14px;">${escapeHtml(message)}</span>
				</div>
				<i class="fas fa-times close" style="cursor: pointer; color: #999; font-size: 14px; padding: 5px;"></i>
			</div>
			<div class="progress-bar ${className}" style="
				position: absolute;
				bottom: 0;
				left: 0;
				height: 3px;
				background: ${iconInfo.color};
				width: 100%;
				animation: shrinkWidth ${delay}s linear forwards;
			"></div>
		`;
		
		// Bouton de fermeture
		const closeBtn = div.querySelector('.close');
		let timeoutId;
		
		function removeToast() {
			clearTimeout(timeoutId);
			div.style.animation = "slideOutRight 0.3s ease forwards";
			setTimeout(() => {
				if (div.parentNode) parentToast.removeChild(div);
				isShowingToast = false;
				showNextToast();
			}, 300);
		}
		
		closeBtn.addEventListener("click", removeToast);
		
		// Auto-suppression
		timeoutId = setTimeout(removeToast, duration);
		
		parentToast.appendChild(div);
		
		// Ajouter les animations CSS si pas déjà présentes
		if (!document.getElementById('masterbot-toast-styles')) {
			const style = document.createElement('style');
			style.id = 'masterbot-toast-styles';
			style.textContent = `
				@keyframes slideInRight {
					from {
						opacity: 0;
						transform: translateX(100%);
					}
					to {
						opacity: 1;
						transform: translateX(0);
					}
				}
				@keyframes slideOutRight {
					from {
						opacity: 1;
						transform: translateX(0);
					}
					to {
						opacity: 0;
						transform: translateX(100%);
					}
				}
				@keyframes shrinkWidth {
					from {
						width: 100%;
					}
					to {
						width: 0%;
					}
				}
			`;
			document.head.appendChild(style);
		}
	}
	
	// Fonction d'échappement HTML
	function escapeHtml(text) {
		if (!text) return '';
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
	
	// Créer la méthode toast
	$.createToast = function(options) {
		if (typeof options === 'string') {
			options = { message: options };
		}
		
		const defaultOptions = {
			title: "",
			message: "",
			type: "success",
			duration: 3000
		};
		
		const finalOptions = { ...defaultOptions, ...options };
		
		// Ajouter à la file d'attente
		toastQueue.push(finalOptions);
		showNextToast();
	};
	
	// Méthodes rapides
	$.toastSuccess = function(message, title = "Succès") {
		$.createToast({ title, message, type: "success" });
	};
	
	$.toastError = function(message, title = "Erreur") {
		$.createToast({ title, message, type: "error" });
	};
	
	$.toastWarning = function(message, title = "Attention") {
		$.createToast({ title, message, type: "warning" });
	};
	
	$.toastInfo = function(message, title = "Information") {
		$.createToast({ title, message, type: "info" });
	};
	
})(jQuery);

console.log('✅ MASTERBOT: Toast.js chargé');
