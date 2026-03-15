<div align="center">
  <img src="https://i.ibb.co/Jwtyz83V/image.jpg" width="800px">
  <h1>👑 MASTERBOT V3 - DOCUMENTATION OFFICIELLE</h1>
  <p><i>Le guide ultime pour maîtriser le bot le plus puissant de Messenger</i></p>
  
  <p>
    <img src="https://img.shields.io/badge/Version-3.0.0--MASTER-ff69b4?style=for-the-badge">
    <img src="https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge">
    <img src="https://img.shields.io/badge/Database-MongoDB%20%7C%20MySQL%20%7C%20JSON-blue?style=for-the-badge">
  </p>
</div>

---

## 📑 **TABLE DES MATIÈRES**
- [🛠️ Fonctions Intégrées](#-fonctions-intégrées)
- [🧠 Prérequis](#-prérequis)
- [⚠️ Notes Importantes](#️-notes-importantes)
- [💾 Base de Données](#-base-de-données)
  - [👤 Utilisateurs (Users)](#-utilisateurs-users)
  - [💬 Groupes (Threads)](#-groupes-threads)
  - [📊 Tableaux de Bord (Dashboard)](#-tableaux-de-bord-dashboard)
- [📦 Créer une Nouvelle Commande](#-créer-une-nouvelle-commande)
  - [📁 Structure d'une Commande](#-structure-dune-commande)
  - [🎯 Exemple Complet](#-exemple-complet)
- [🤖 Intelligence Artificielle](#-intelligence-artificielle)
  - [🧠 Configuration de l'IA](#-configuration-de-lia)
  - [🎭 Personnalités Disponibles](#-personnalités-disponibles)
- [🛡️ Anti-Ban](#️-anti-ban)
- [📊 Dashboard](#-dashboard)
- [🔌 API Externes](#-api-externes)
- [🚀 Mise à Jour](#-mise-à-jour)
- [❓ FAQ](#-faq)

---

## 🛠️ **Fonctions Intégrées**

MASTERBOT V3 dispose d'une multitude de fonctions utilitaires prêtes à l'emploi :

| Fonction | Description | Exemple |
|----------|-------------|---------|
| **🌍 translate** | Traduction automatique | `await utils.translate("Hello", "fr")` |
| **⏱️ convertTime** | Conversion de temps | `utils.convertTime(3600)` |
| **📝 jsonStringifyColor** | JSON coloré pour debug | `utils.jsonStringifyColor(obj)` |
| **🔢 randomString** | Génération aléatoire | `utils.randomString(10)` |
| **🔍 findUid** | Trouver UID Facebook | `await utils.findUid("profileUrl")` |
| **📎 getStreamFromURL** | Télécharger depuis URL | `await utils.getStreamFromURL(url)` |
| **📁 Google Drive** | Upload, delete, getFile | `await utils.drive.upload(file)` |
| **🖼️ getStreamFromAttachment** | Extraire pièces jointes | `utils.getStreamFromAttachment(attachments)` |
| **👤 getAvatarUrl** | URL de l'avatar | `await utils.getAvatarUrl(uid)` |
| **📊 getTime** | Horodatage formaté | `utils.getTime("HH:MM:SS")` |
| **🎨 randomColor** | Couleur aléatoire | `utils.randomColor()` |
| **📏 getExtFromMimeType** | Extension de fichier | `utils.getExtFromMimeType("image/png")` |

> **💡 Astuce** : Voir le fichier [`utils.js`](https://github.com/masterbot/utils.js) pour toutes les fonctions disponibles.

---

## 🧠 **Prérequis**

### **🖥️ Logiciels Requis**
- [Node.js](https://nodejs.org/) **18.x ou supérieur**
- [Git](https://git-scm.com/) pour cloner le repository
- Éditeur de code (VSCode, Sublime Text, Atom, etc.)
- Navigateur moderne (Chrome, Firefox, Kiwi Browser)

### **📚 Connaissances Nécessaires**
| Niveau | Compétences |
|--------|-------------|
| **Débutant** | Bases de JavaScript (variables, fonctions, boucles) |
| **Intermédiaire** | Async/await, Promises, JSON, API REST |
| **Avancé** | Node.js, Express, MongoDB, React (pour dashboard) |

### **📖 Ressources d'Apprentissage**
- [JavaScript MDN](https://developer.mozilla.org/fr/docs/Web/JavaScript)
- [Node.js Documentation](https://nodejs.org/fr/docs/)
- [Facebook Chat API](https://github.com/ntkhang03/fb-chat-api/blob/master/DOCS.md)
- [MongoDB Manual](https://docs.mongodb.com/)

---

## ⚠️ **Notes Importantes**

### **🚫 Règles de Conduite**
Tout contenu lié à :
- 🔞 **18+ / Pornographie**
- 🤬 **Vulgarité / Insultes**
- 🏛️ **Politique / Trahison**
- 📵 **Spam / Harcèlement**

→ Entraînera un **BAN PERMANENT** du bot et de l'utilisateur.

### **🔒 Sécurité**
- Ne **jamais partager** votre fichier `account.dev.txt`
- Ne **jamais commiter** votre fichier `.env` sur GitHub
- Utilisez un **compte Facebook dédié** (pas votre compte personnel)
- Activez l'**authentification à deux facteurs**

---

## 💾 **Base de Données**

### **📊 Types de Base de Données Supportés**
Configurez dans `config.dev.json` :

```json
{
  "database": {
    "type": "mongodb", // "mongodb", "mysql", "json", "sqlite"
    "uri": "mongodb://localhost:27017/masterbot"
  }
}
