/**
 * MASTERBOT V3 - Preview Modal
 * Affiche un aperçu des éléments dans une modale Bootstrap
 * 
 * Fonctionnalités :
 * - Prévisualisation d'images
 * - Prévisualisation de code
 * - Prévisualisation de composants
 * - Support des vidéos
 * - Fermeture automatique
 */

$(document).ready(function() {
	
	// Modal pour prévisualisation générale
	$(document).on("click", ".preview-modal", function() {
		const $this = $(this);
		const title = $this.data('title') || 'Aperçu MASTERBOT';
		const size = $this.data('size') || 'modal-xl'; // modal-sm, modal-md, modal-lg, modal-xl
		const hasFooter = $this.data('footer') === true;
		
		createModal($this[0].outerHTML, title, size, hasFooter);
	});
	
	// Modal spécial pour images
	$(document).on("click", ".preview-image", function() {
		const $this = $(this);
		const imgSrc = $this.data('src') || $this.attr('src');
		const title = $this.data('title') || 'Aperçu image';
		
		const imgHtml = `<img src="${imgSrc}" class="img-fluid rounded" alt="${title}">`;
		createModal(imgHtml, title, 'modal-xl', false);
	});
	
	// Modal pour vidéos
	$(document).on("click", ".preview-video", function() {
		const $this = $(this);
		const videoSrc = $this.data('src') || $this.attr('src');
		const title = $this.data('title') || 'Aperçu vidéo';
		
		const videoHtml = `
			<video controls class="w-100 rounded">
				<source src="${videoSrc}" type="video/mp4">
				Votre navigateur ne supporte pas la lecture vidéo.
			</video>
		`;
		createModal(videoHtml, title, 'modal-xl', false);
	});
	
	// Modal pour code
	$(document).on("click", ".preview-code", function() {
		const $this = $(this);
		const codeContent = $this.data('code') || $this.text();
		const language = $this.data('language') || 'javascript';
		const title = $this.data('title') || 'Aperçu code';
		
		const codeHtml = `
			<pre class="bg-dark text-light p-3 rounded"><code class="language-${language}">${escapeHtml(codeContent)}</code></pre>
		`;
		createModal(codeHtml, title, 'modal-lg', false);
	});
	
	// Modal pour composant MASTERBOT
	$(document).on("click", ".preview-component", function() {
		const $this = $(this);
		const componentId = $this.data('component');
		const componentHtml = $(`#${componentId}`).html();
		const title = $this.data('title') || 'Aperçu composant';
		
		createModal(componentHtml, title, 'modal-xl', false);
	});
	
	// Modal pour lien externe (iframe)
	$(document).on("click", ".preview-url", function() {
		const $this = $(this);
		const url = $this.data('url') || $this.attr('href');
		const title = $this.data('title') || 'Aperçu';
		
		const iframeHtml = `
			<iframe src="${url}" class="w-100" style="height: 70vh; border: none;" title="${title}"></iframe>
		`;
		createModal(iframeHtml, title, 'modal-xl', false);
		
		return false; // Empêche le lien de s'ouvrir
	});
	
});

/**
 * Crée et affiche une modale
 * @param {string} content - Contenu HTML
 * @param {string} title - Titre de la modale
 * @param {string} size - Taille (modal-sm, modal-md, modal-lg, modal-xl)
 * @param {boolean} hasFooter - Afficher le footer
 */
function createModal(content, title, size = 'modal-xl', hasFooter = false) {
	// Vérifier si une modale existe déjà
	if ($('#masterbot-preview-modal').length) {
		$('#masterbot-preview-modal').modal('hide');
		setTimeout(() => {
			createModalContent(content, title, size, hasFooter);
		}, 300);
	} else {
		createModalContent(content, title, size, hasFooter);
	}
}

function createModalContent(content, title, size, hasFooter) {
	const modalId = 'masterbot-preview-modal';
	
	const footerHtml = hasFooter ? `
		<div class="modal-footer">
			<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
			<button type="button" class="btn btn-master" id="modal-copy-btn">Copier</button>
		</div>
	` : '';
	
	const modalHtml = `
	<div class="modal fade" tabindex="-1" id="${modalId}" aria-labelledby="previewModalLabel" aria-hidden="true">
		<div class="modal-dialog modal-dialog-centered ${size}">
			<div class="modal-content">
				<div class="modal-header bg-master-gradient">
					<h5 class="modal-title text-white" id="previewModalLabel">
						<i class="fas fa-eye me-2"></i>${escapeHtml(title)}
					</h5>
					<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body p-4">
					${content}
				</div>
				${footerHtml}
			</div>
		</div>
	</div>
	`;
	
	$('body').append(modalHtml);
	
	const $modal = $(`#${modalId}`);
	
	// Initialiser Bootstrap modal
	const modal = new bootstrap.Modal($modal[0]);
	modal.show();
	
	// Gérer la fermeture
	$modal.on('hidden.bs.modal', function() {
		$modal.remove();
	});
	
	// Bouton copier si présent
	$modal.on('shown.bs.modal', function() {
		$('#modal-copy-btn').on('click', function() {
			const textToCopy = $(this).closest('.modal-content').find('.modal-body').text();
			copyToClipboard(textToCopy);
		});
	});
}

/**
 * Copie le texte dans le presse-papier
 */
function copyToClipboard(text) {
	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(text).then(() => {
			showToast('✅ Copié dans le presse-papier !', 'success');
		}).catch(() => {
			fallbackCopy(text);
		});
	} else {
		fallbackCopy(text);
	}
}

function fallbackCopy(text) {
	const textarea = document.createElement('textarea');
	textarea.value = text;
	document.body.appendChild(textarea);
	textarea.select();
	document.execCommand('copy');
	document.body.removeChild(textarea);
	showToast('✅ Copié dans le presse-papier !', 'success');
}

/**
 * Affiche un toast de notification
 */
function showToast(message, type = 'success') {
	if (typeof $.createToast === 'function') {
		$.createToast({ message, type });
	} else {
		console.log(`[${type}] ${message}`);
	}
}

/**
 * Échappe les caractères HTML
 */
function escapeHtml(text) {
	if (!text) return '';
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// Styles supplémentaires pour MASTERBOT
const style = document.createElement('style');
style.textContent = `
	.bg-master-gradient {
		background: linear-gradient(135deg, #ff69b4, #ff1493);
	}
	.btn-master {
		background: linear-gradient(135deg, #ff69b4, #ff1493);
		border: none;
		color: white;
	}
	.btn-master:hover {
		background: linear-gradient(135deg, #ff1493, #ff69b4);
		color: white;
	}
`;
document.head.appendChild(style);

console.log('✅ MASTERBOT: preview-modal.js chargé');
