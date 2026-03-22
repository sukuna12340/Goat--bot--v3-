/**
 * MASTERBOT V3 - Phoenix Framework
 * Framework JavaScript pour le dashboard MASTERBOT
 * Adapté avec les couleurs MASTERBOT (rose)
 */

(function(global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('bootstrap')) : 
	typeof define === 'function' && define.amd ? define(['bootstrap'], factory) : 
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self,
	global.phoenix = factory(global.bootstrap));
})(this, (function(bootstrap) {
	'use strict';

	// ==================== UTILITAIRES ====================
	
	const docReady = e => {
		"loading" === document.readyState ? document.addEventListener("DOMContentLoaded", e) : setTimeout(e, 1);
	};
	
	const toggleColor = (e, t) => "light" === window.config?.config?.phoenixTheme ? e : t;
	const resize = e => window.addEventListener("resize", e);
	const isIterableArray = e => Array.isArray(e) && !!e.length;
	
	const camelize = e => {
		const t = e.replace(/[-_\s.]+(.)?/g, ((e, t) => t ? t.toUpperCase() : ""));
		return `${t.substr(0, 1).toLowerCase()}${t.substr(1)}`;
	};
	
	const getData = (e, t) => {
		try {
			return JSON.parse(e.dataset[camelize(t)]);
		} catch (o) {
			return e.dataset[camelize(t)];
		}
	};
	
	const hexToRgb = e => {
		let t;
		t = 0 === e.indexOf("#") ? e.substring(1) : e;
		const o = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(t.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, ((e, t, o, r) => t + t + o + o + r + r)));
		return o ? [parseInt(o[1], 16), parseInt(o[2], 16), parseInt(o[3], 16)] : null;
	};
	
	const rgbaColor = (e = "#ff69b4", t = 0.5) => `rgba(${hexToRgb(e)}, ${t})`;
	
	const getColor = (e, t = document.documentElement) => getComputedStyle(t).getPropertyValue(`--phoenix-${e}`).trim();
	
	const hasClass = (e, t) => e.classList.value.includes(t);
	const addClass = (e, t) => e.classList.add(t);
	
	const getOffset = e => {
		const t = e.getBoundingClientRect();
		const o = window.pageXOffset || document.documentElement.scrollLeft;
		const r = window.pageYOffset || document.documentElement.scrollTop;
		return { top: t.top + r, left: t.left + o };
	};
	
	const isScrolledIntoView = e => {
		let t = e.offsetTop, o = e.offsetLeft;
		const r = e.offsetWidth, s = e.offsetHeight;
		for (; e.offsetParent; ) {
			t += (e = e.offsetParent).offsetTop;
			o += e.offsetLeft;
		}
		return {
			all: t >= window.pageYOffset && o >= window.pageXOffset && t + s <= window.pageYOffset + window.innerHeight && o + r <= window.pageXOffset + window.innerWidth,
			partial: t < window.pageYOffset + window.innerHeight && o < window.pageXOffset + window.innerWidth && t + s > window.pageYOffset && o + r > window.pageXOffset
		};
	};
	
	const breakpoints = { xs: 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1540 };
	
	const getBreakpoint = e => {
		const t = e && e.classList.value;
		let o;
		return t && (o = breakpoints[t.split(" ").filter(e => e.includes("navbar-expand-")).pop().split("-").pop()]), o;
	};
	
	const setCookie = (e, t, o) => {
		const r = new Date();
		r.setTime(r.getTime() + o);
		document.cookie = e + "=" + t + ";expires=" + r.toUTCString();
	};
	
	const getCookie = e => {
		var t = document.cookie.match("(^|;) ?" + e + "=([^;]*)(;|$)");
		return t ? t[2] : t;
	};
	
	const settings = {
		tinymce: { theme: "oxide" },
		chart: { borderColor: "rgba(255, 105, 180, 0.8)" } // MASTERBOT rose
	};
	
	const newChart = (e, t) => {
		const o = e.getContext("2d");
		return new window.Chart(o, t);
	};
	
	const getItemFromStore = (e, t, o = localStorage) => {
		try {
			return JSON.parse(o.getItem(e)) || t;
		} catch {
			return o.getItem(e) || t;
		}
	};
	
	const setItemToStore = (e, t, o = localStorage) => o.setItem(e, t);
	const getStoreSpace = (e = localStorage) => parseFloat((escape(encodeURIComponent(JSON.stringify(e))).length / 1048576).toFixed(2));
	
	const getDates = (e, t, o = 864e5) => {
		const r = (t - e) / o;
		return Array.from({ length: r + 1 }, ((t, r) => new Date(e.valueOf() + o * r)));
	};
	
	const getPastDates = e => {
		let t;
		switch (e) {
			case "week": t = 7; break;
			case "month": t = 30; break;
			case "year": t = 365; break;
			default: t = e;
		}
		const o = new Date();
		const r = o;
		const s = new Date((new Date).setDate(o.getDate() - (t - 1)));
		return getDates(s, r);
	};
	
	const getRandomNumber = (e, t) => Math.floor(Math.random() * (t - e) + e);
	
	// ==================== EXPORTS ====================
	
	const utils = {
		docReady, toggleColor, resize, isIterableArray, camelize, getData,
		hasClass, addClass, hexToRgb, rgbaColor, getColor, breakpoints,
		getOffset, isScrolledIntoView, getBreakpoint, setCookie, getCookie,
		newChart, settings, getItemFromStore, setItemToStore, getStoreSpace,
		getDates, getPastDates, getRandomNumber
	};
	
	// ==================== COMPOSANTS ====================
	
	const docComponentInit = () => {
		const e = document.querySelectorAll("[data-component-card]");
		const o = document.getElementById("icon-copied-toast");
		if (o) {
			const t = new bootstrap.Toast(o);
			e.forEach(e => {
				const c = e.querySelector(".copy-code-btn");
				const n = e.querySelector(".code-to-copy");
				const d = e.querySelector(".preview-btn");
				const r = e.querySelector(".code-collapse");
				if (r) {
					const l = bootstrap.Collapse.getOrCreateInstance(r, { toggle: false });
					d?.addEventListener("click", () => l.toggle());
					c?.addEventListener("click", () => {
						const e = document.createElement("textarea");
						e.value = n?.innerHTML || "";
						document.body.appendChild(e);
						e.select();
						document.execCommand("copy");
						document.body.removeChild(e);
						if (o.querySelector(".toast-body")) {
							o.querySelector(".toast-body").innerHTML = "<code class='text-500'>✅ Code copié !</code>";
							t.show();
						}
					});
				}
			});
		}
	};
	
	// ==================== INITIALISATION ====================
	
	docReady(() => {
		console.log('👑 MASTERBOT V3 - Phoenix Framework chargé');
		docComponentInit();
	});
	
	// ==================== EXPORTS GLOBAUX ====================
	
	return {
		utils,
		docReady,
		docComponentInit,
		...utils
	};
}));

console.log('✅ MASTERBOT: Phoenix.js chargé avec succès');
