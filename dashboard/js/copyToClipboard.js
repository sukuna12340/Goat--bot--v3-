/**
 * MASTERBOT V3 - Copy to Clipboard
 * Fonction de copie moderne avec fallback
 */

$(document).ready(function () {
	
	// Copie avec data-copy
	$(document).on('click', '.copyToClipboard', function () {
		var copyText = $(this).attr('data-copy');
		
		if (!copyText) {
			// Si pas de data-copy, essayer le texte de l'élément
			copyText = $(this).text().trim();
		}
		
		copyToClipboard(copyText, $(this));
	});
	
	// Copie depuis un élément cible
	$(document).on('click', '.copyToClipboard-target', function () {
		var targetId = $(this).attr('data-target');
		var copyText = $(targetId).val() || $(targetId).text();
		copyToClipboard(copyText, $(this));
	});
	
	// Copie depuis un input/textarea (sur clic)
	$(document).on('click', '.copyable-input', function () {
		$(this).select();
		document.execCommand('copy');
		showToast('📋 Copié !', 'success');
	});
	
});

/**
 * Fonction principale de copie
 * @param {string} text - Texte à copier
 * @param {object} $element - Élément jQuery (optionnel)
 */
function copyToClipboard(text, $element = null) {
	
	// Méthode moderne (Clipboard API)
	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(text).then(function() {
			showToast('✅ Copié dans le presse-papier !', 'success');
			// Animation sur l'élément
			if ($element) {
				$element.addClass('copied-animation');
				setTimeout(function() {
					$element.removeClass('copied-animation');
				}, 300);
			}
		}).catch(function(err) {
			console.error('Erreur de copie: ', err);
			fallbackCopy(text);
		});
	} 
	// Fallback pour anciens navigateurs
	else {
		fallbackCopy(text);
	}
}

/**
 * Méthode de copie alternative (anciens navigateurs)
 * @param {string} text - Texte à copier
 */
function fallbackCopy(text) {
	var $temp = $("<textarea>");
	$("body").append($temp);
	$temp.val(text).select();
	
	try {
		var success = document.execCommand("copy");
		if (success) {
			showToast('✅ Copié dans le presse-papier !', 'success');
		} else {
			showToast('❌ Échec de la copie', 'error');
		}
	} catch (err) {
		console.error('Erreur fallback: ', err);
		showToast('❌ Impossible de copier', 'error');
	}
	
	$temp.remove();
}

/**
 * Affiche une notification toast
 * @param {string} message - Message à afficher
 * @param {string} type - Type: success, error, warning, info
 */
function showToast(message, type = 'success') {
	// Utiliser le système de toast existant si disponible
	if (typeof $.createToast === 'function') {
		$.createToast({
			message: message,
			type: type
		});
	} else {
		// Fallback simple
		console.log(`[${type.toUpperCase()}] ${message}`);
		alert(message);
	}
}

// Exporter la fonction pour usage global
window.copyToClipboard = copyToClipboard;
