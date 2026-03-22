/**
 * MASTERBOT V3 - Highlight Within Textarea
 * Plugin jQuery pour surligner du texte dans les textareas
 * 
 * @author  Will Boyd
 * @github  https://github.com/lonekorean/highlight-within-textarea
 * @version Adapté pour MASTERBOT V3
 */

(function($) {
	'use strict';
	
	let ID = 'hwt';
	
	let HighlightWithinTextarea = function($el, config) {
		this.init($el, config);
	};
	
	HighlightWithinTextarea.prototype = {
		init: function($el, config) {
			this.$el = $el;
			
			// compatibilité avec v1 (déprécié)
			if (this.getType(config) === 'function') {
				config = { highlight: config };
			}
			
			if (this.getType(config) === 'custom') {
				this.highlight = config;
				this.generate();
			} else {
				console.error('MASTERBOT: Configuration valide non fournie');
			}
		},
		
		// retourne les types d'identifiants
		getType: function(instance) {
			let type = typeof instance;
			if (!instance) {
				return 'falsey';
			} else if (Array.isArray(instance)) {
				if (instance.length === 2 && typeof instance[0] === 'number' && typeof instance[1] === 'number') {
					return 'range';
				} else {
					return 'array';
				}
			} else if (type === 'object') {
				if (instance instanceof RegExp) {
					return 'regexp';
				} else if (instance.hasOwnProperty('highlight')) {
					return 'custom';
				}
			} else if (type === 'function' || type === 'string') {
				return type;
			}
			return 'other';
		},
		
		generate: function() {
			this.$el
				.addClass(ID + '-input ' + ID + '-content')
				.on('input.' + ID, this.handleInput.bind(this))
				.on('scroll.' + ID, this.handleScroll.bind(this));
			
			this.$highlights = $('<div>', { class: ID + '-highlights ' + ID + '-content' });
			this.$backdrop = $('<div>', { class: ID + '-backdrop' }).append(this.$highlights);
			this.$container = $('<div>', { class: ID + '-container' })
				.insertAfter(this.$el)
				.append(this.$backdrop, this.$el)
				.on('scroll', this.blockContainerScroll.bind(this));
			
			this.browser = this.detectBrowser();
			switch (this.browser) {
				case 'firefox':
					this.fixFirefox();
					break;
				case 'ios':
					this.fixIOS();
					break;
			}
			
			this.isGenerated = true;
			this.handleInput();
		},
		
		detectBrowser: function() {
			let ua = window.navigator.userAgent.toLowerCase();
			if (ua.indexOf('firefox') !== -1) return 'firefox';
			else if (!!ua.match(/msie|trident\/7|edge/)) return 'ie';
			else if (!!ua.match(/ipad|iphone|ipod/) && ua.indexOf('windows phone') === -1) return 'ios';
			else return 'other';
		},
		
		fixFirefox: function() {
			let padding = this.$highlights.css([
				'padding-top', 'padding-right', 'padding-bottom', 'padding-left'
			]);
			let border = this.$highlights.css([
				'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'
			]);
			this.$highlights.css({ padding: '0', 'border-width': '0' });
			this.$backdrop
				.css({
					'margin-top': '+=' + padding['padding-top'],
					'margin-right': '+=' + padding['padding-right'],
					'margin-bottom': '+=' + padding['padding-bottom'],
					'margin-left': '+=' + padding['padding-left'],
				})
				.css({
					'margin-top': '+=' + border['border-top-width'],
					'margin-right': '+=' + border['border-right-width'],
					'margin-bottom': '+=' + border['border-bottom-width'],
					'margin-left': '+=' + border['border-left-width'],
				});
		},
		
		fixIOS: function() {
			this.$highlights.css({
				'padding-left': '+=3px',
				'padding-right': '+=3px'
			});
		},
		
		handleInput: function() {
			let input = this.$el.val();
			let ranges = this.getRanges(input, this.highlight);
			let unstaggeredRanges = this.removeStaggeredRanges(ranges);
			let boundaries = this.getBoundaries(unstaggeredRanges);
			this.renderMarks(boundaries);
		},
		
		getRanges: function(input, highlight) {
			let type = this.getType(highlight);
			switch (type) {
				case 'array': return this.getArrayRanges(input, highlight);
				case 'function': return this.getFunctionRanges(input, highlight);
				case 'regexp': return this.getRegExpRanges(input, highlight);
				case 'string': return this.getStringRanges(input, highlight);
				case 'range': return this.getRangeRanges(input, highlight);
				case 'custom': return this.getCustomRanges(input, highlight);
				default:
					if (!highlight) return [];
					console.error('MASTERBOT: Type de surlignage non reconnu');
					return [];
			}
		},
		
		getArrayRanges: function(input, arr) {
			let ranges = arr.map(this.getRanges.bind(this, input));
			return Array.prototype.concat.apply([], ranges);
		},
		
		getFunctionRanges: function(input, func) {
			return this.getRanges(input, func(input));
		},
		
		getRegExpRanges: function(input, regex) {
			let ranges = [];
			let match;
			while ((match = regex.exec(input)) !== null) {
				ranges.push([match.index, match.index + match[0].length]);
				if (!regex.global) break;
			}
			return ranges;
		},
		
		getStringRanges: function(input, str) {
			let ranges = [];
			let inputLower = input.toLowerCase();
			let strLower = str.toLowerCase();
			let index = 0;
			while ((index = inputLower.indexOf(strLower, index)) !== -1) {
				ranges.push([index, index + strLower.length]);
				index += strLower.length;
			}
			return ranges;
		},
		
		getRangeRanges: function(input, range) {
			return [range];
		},
		
		getCustomRanges: function(input, custom) {
			let ranges = this.getRanges(input, custom.highlight);
			if (custom.className) {
				ranges.forEach(function(range) {
					if (range.className) {
						range.className = custom.className + ' ' + range.className;
					} else {
						range.className = custom.className;
					}
				});
			}
			return ranges;
		},
		
		removeStaggeredRanges: function(ranges) {
			let unstaggeredRanges = [];
			ranges.forEach(function(range) {
				let isStaggered = unstaggeredRanges.some(function(unstaggeredRange) {
					let isStartInside = range[0] > unstaggeredRange[0] && range[0] < unstaggeredRange[1];
					let isStopInside = range[1] > unstaggeredRange[0] && range[1] < unstaggeredRange[1];
					return isStartInside !== isStopInside;
				});
				if (!isStaggered) unstaggeredRanges.push(range);
			});
			return unstaggeredRanges;
		},
		
		getBoundaries: function(ranges) {
			let boundaries = [];
			ranges.forEach(function(range) {
				boundaries.push({ type: 'start', index: range[0], className: range.className });
				boundaries.push({ type: 'stop', index: range[1] });
			});
			this.sortBoundaries(boundaries);
			return boundaries;
		},
		
		sortBoundaries: function(boundaries) {
			boundaries.sort(function(a, b) {
				if (a.index !== b.index) return b.index - a.index;
				else if (a.type === 'stop' && b.type === 'start') return 1;
				else if (a.type === 'start' && b.type === 'stop') return -1;
				else return 0;
			});
		},
		
		renderMarks: function(boundaries) {
			let input = this.$el.val();
			boundaries.forEach(function(boundary, index) {
				let markup;
				if (boundary.type === 'start') {
					markup = '{{hwt-mark-start|' + index + '}}';
				} else {
					markup = '{{hwt-mark-stop}}';
				}
				input = input.slice(0, boundary.index) + markup + input.slice(boundary.index);
			});
			
			input = input.replace(/\n(\{\{hwt-mark-stop\}\})?$/, '\n\n$1');
			input = input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
			
			if (this.browser === 'ie') {
				input = input.replace(/ /g, ' <wbr>');
			}
			
			input = input.replace(/\{\{hwt-mark-start\|(\d+)\}\}/g, function(match, submatch) {
				let className = boundaries[+submatch].className;
				return className ? '<mark class="' + className + '">' : '<mark>';
			});
			
			input = input.replace(/\{\{hwt-mark-stop\}\}/g, '</mark>');
			this.$highlights.html(input);
		},
		
		handleScroll: function() {
			let scrollTop = this.$el.scrollTop();
			this.$backdrop.scrollTop(scrollTop);
			
			let scrollLeft = this.$el.scrollLeft();
			this.$backdrop.css('transform', scrollLeft > 0 ? 'translateX(' + -scrollLeft + 'px)' : '');
		},
		
		blockContainerScroll: function() {
			this.$container.scrollLeft(0);
		},
		
		destroy: function() {
			this.$backdrop.remove();
			this.$el
				.unwrap()
				.removeClass(ID + '-text ' + ID + '-input')
				.off(ID)
				.removeData(ID);
		},
	};
	
	// Enregistrement du plugin jQuery
	$.fn.highlightWithinTextarea = function(options) {
		return this.each(function() {
			let $this = $(this);
			let plugin = $this.data(ID);
			
			if (typeof options === 'string') {
				if (plugin) {
					switch (options) {
						case 'update':
							plugin.handleInput();
							break;
						case 'destroy':
							plugin.destroy();
							break;
						default:
							console.error('MASTERBOT: Méthode non reconnue: ' + options);
					}
				} else {
					console.error('MASTERBOT: Plugin non initialisé');
				}
			} else {
				if (plugin) plugin.destroy();
				plugin = new HighlightWithinTextarea($this, options);
				if (plugin.isGenerated) $this.data(ID, plugin);
			}
		});
	};
	
	// Initialisation auto pour éléments avec data-hwt
	$(document).ready(function() {
		$('[data-hwt]').each(function() {
			let $el = $(this);
			let options = $el.data('hwt');
			if (typeof options === 'string') {
				try {
					options = JSON.parse(options);
				} catch(e) {
					options = { highlight: options };
				}
			}
			$el.highlightWithinTextarea(options);
		});
	});
	
})(jQuery);

console.log('✅ MASTERBOT: highlight-within-textarea chargé');
