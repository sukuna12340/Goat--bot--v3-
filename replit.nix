{ pkgs }: {
  deps = [
    # 👑 MASTERBOT V3 - Dépendances système
    
    # Node.js 18+ (recommandé pour MASTERBOT)
    pkgs.nodejs_18
    
    # Outils de développement
    pkgs.nodePackages.typescript-language-server
    pkgs.nodePackages.nodemon
    pkgs.nodePackages.pm2
    pkgs.yarn
    
    # Bibliothèques système essentielles
    pkgs.libuuid
    pkgs.libpng
    pkgs.libjpeg
    pkgs.giflib
    pkgs.librsvg
    pkgs.pixman
    pkgs.cairo
    pkgs.pango
    pkgs.freetype
    pkgs.fontconfig
    pkgs.openssl
    pkgs.openssl.dev
    
    # Pour canvas (génération d'images)
    pkgs.pkg-config
    pkgs.libGL
    pkgs.libGLU
    
    # Pour sharp (traitement d'images)
    pkgs.vips
    pkgs.vips-dev
    
    # Pour sqlite3 (base de données)
    pkgs.sqlite
    pkgs.sqlite-interactive
    
    # Pour mongoose (MongoDB)
    pkgs.cyrus_sasl
    
    # Pour youtube-dl (téléchargement vidéos)
    pkgs.yt-dlp
    pkgs.ffmpeg
    
    # Pour l'audio
    pkgs.alsa-lib
    pkgs.libpulseaudio
    
    # Pour la compilation native
    pkgs.gcc
    pkgs.gnumake
    pkgs.python3
    pkgs.python3Packages.pip
    
    # Utilitaires système
    pkgs.git
    pkgs.curl
    pkgs.wget
    pkgs.unzip
    pkgs.zip
    pkgs.jq
    pkgs.tree
    
    # Pour les tests
    pkgs.replitPackages.jest
  ];
  
  env = {
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.libuuid
      pkgs.libpng
      pkgs.libjpeg
      pkgs.giflib
      pkgs.librsvg
      pkgs.pixman
      pkgs.cairo
      pkgs.pango
      pkgs.freetype
      pkgs.fontconfig
      pkgs.openssl
      pkgs.vips
      pkgs.libGL
      pkgs.libGLU
      pkgs.alsa-lib
      pkgs.libpulseaudio
    ];
    
    # Configuration des polices
    FONTCONFIG_PATH = "${pkgs.fontconfig}/etc/fonts";
    
    # Pour Canvas
    PKG_CONFIG_PATH = "${pkgs.cairo}/lib/pkgconfig:${pkgs.pango}/lib/pkgconfig:${pkgs.libpng}/lib/pkgconfig";
    
    # Pour Sharp
    SHARP_IGNORE_GLOBAL_VIPS = "false";
    
    # Optimisations Replit
    NODE_ENV = "production";
    npm_config_cache = "/home/runner/.npm";
    
    # Timezone
    TZ = "Europe/Paris";
    
    # Configuration MongoDB (optionnel)
    MONGODB_URI = "";
    
    # Configuration OpenAI (sera chargée depuis .env)
    OPENAI_API_KEY = "";
    
    # Configuration Google
    GOOGLE_APPLICATION_CREDENTIALS = "";
  };
  
  # Scripts de démarrage
  shellHook = ''
    echo "👑 MASTERBOT V3 - Environnement prêt !"
    echo "📦 Node.js version: $(node --version)"
    echo "📦 npm version: $(npm --version)"
    echo ""
    echo "🚀 Pour démarrer le bot: npm start"
    echo "📊 Pour lancer le dashboard: npm run dashboard"
    echo "🔧 Mode développement: npm run dev"
  '';
}
