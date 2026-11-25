/**
 * PRISM / LUMINA WORKSPACE & INSTAGRAM-STYLE SECURE CHAT
 * Client-Side Controller
 */

(function () {
  'use strict';

  // --- State ---
  let currentUser = null;
  let authToken = localStorage.getItem('prism_auth_token') || null;
  let socket = null;
  let activePartner = null; // { id, username, displayName, avatarColor }
  let currentMessages = [];
  let pendingImageFile = null;
  let typingTimeout = null;

  // --- DOM Elements ---
  const appBody = document.getElementById('appBody');
  const authScreen = document.getElementById('authScreen');
  const mainApp = document.getElementById('mainApp');
  const authAlert = document.getElementById('authAlert');

  // Auth elements
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginIdentifier = document.getElementById('loginIdentifier');
  const loginPassword = document.getElementById('loginPassword');
  const regEmail = document.getElementById('regEmail');
  const regUsername = document.getElementById('regUsername');
  const regDisplayName = document.getElementById('regDisplayName');
  const regPassword = document.getElementById('regPassword');

  // Header / Actions
  const btnPanic = document.getElementById('btnPanic');
  const btnLogout = document.getElementById('btnLogout');
  const btnThemeMenu = document.getElementById('btnThemeMenu');
  const themeMenu = document.getElementById('themeMenu');
  const btnAdminPanel = document.getElementById('btnAdminPanel');
  const adminBadgeDot = document.getElementById('adminBadgeDot');
  const currentUserAvatar = document.getElementById('currentUserAvatar');
  const currentUserName = document.getElementById('currentUserName');
  const currentUserRole = document.getElementById('currentUserRole');

  // Wallpaper
  const wallpaperUpload = document.getElementById('wallpaperUpload');
  const btnResetWallpaper = document.getElementById('btnResetWallpaper');
  const chatWallpaperLayer = document.getElementById('chatWallpaperLayer');

  // Sidebar / Search
  const userSearchInput = document.getElementById('userSearchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const searchResultsDropdown = document.getElementById('searchResultsDropdown');
  const searchResultsList = document.getElementById('searchResultsList');
  const conversationsList = document.getElementById('conversationsList');

  // Chat Main
  const chatMain = document.getElementById('chatMain');
  const btnMobileBack = document.getElementById('btnMobileBack');
  const noChatSelected = document.getElementById('noChatSelected');
  const activeChatWindow = document.getElementById('activeChatWindow');
  const activePartnerAvatar = document.getElementById('activePartnerAvatar');
  const activePartnerName = document.getElementById('activePartnerName');
  const activePartnerHandle = document.getElementById('activePartnerHandle');
  const activePartnerStatusLine = document.getElementById('activePartnerStatusLine');
  const messagesContainer = document.getElementById('messagesContainer');
  const messagesList = document.getElementById('messagesList');
  const typingIndicator = document.getElementById('typingIndicator');
  const typingUserText = document.getElementById('typingUserText');

  // Input & Tools
  const chatForm = document.getElementById('chatForm');
  const messageTextInput = document.getElementById('messageTextInput');
  const btnSendMessage = document.getElementById('btnSendMessage');
  const btnToggleEmoji = document.getElementById('btnToggleEmoji');
  const emojiPickerPopover = document.getElementById('emojiPickerPopover');
  const btnCloseEmoji = document.getElementById('btnCloseEmoji');
  const emojiGrid = document.getElementById('emojiGrid');
  const emojiSearchInput = document.getElementById('emojiSearchInput');
  const btnToggleSticker = document.getElementById('btnToggleSticker');
  const stickerDrawerPopover = document.getElementById('stickerDrawerPopover');
  const btnCloseSticker = document.getElementById('btnCloseSticker');
  const stickerGrid = document.getElementById('stickerGrid');
  const customStickerFileInput = document.getElementById('customStickerFileInput');
  const stickerVaultCount = document.getElementById('stickerVaultCount');
  const customStickerActions = document.getElementById('customStickerActions');
  const imageFileInput = document.getElementById('imageFileInput');
  const imagePreviewBar = document.getElementById('imagePreviewBar');
  const previewImageSrc = document.getElementById('previewImageSrc');
  const previewFilename = document.getElementById('previewFilename');
  const btnCancelImageUpload = document.getElementById('btnCancelImageUpload');

  // Admin Modal
  const adminModal = document.getElementById('adminModal');
  const btnCloseAdminModal = document.getElementById('btnCloseAdminModal');
  const adminUserTableBody = document.getElementById('adminUserTableBody');
  const adminUserFilter = document.getElementById('adminUserFilter');
  const btnRefreshAdminUsers = document.getElementById('btnRefreshAdminUsers');
  const adminLiveFeed = document.getElementById('adminLiveFeed');
  const btnClearLiveFeed = document.getElementById('btnClearLiveFeed');
  const adminLiveCount = document.getElementById('adminLiveCount');
  const statTotalUsers = document.getElementById('statTotalUsers');
  const statActiveUsers = document.getElementById('statActiveUsers');
  const statDiscardedUsers = document.getElementById('statDiscardedUsers');
  const statTotalMessages = document.getElementById('statTotalMessages');

  // Lightbox Modal
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImage = document.getElementById('lightboxImage');
  const btnCloseLightbox = document.getElementById('btnCloseLightbox');
  const lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');

  // Audio tone generator for Admin ONLY
  function playAdminChime() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio chime unsupported:', e);
    }
  }

  // ==========================================
  // WHATSAPP & iOS 18 EMOJI DATA
  // ==========================================
  const emojiCategories = {
    smileys: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊', '😇',
      '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑',
      '🤗', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄',
      '😬', '🤥', '🫨', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
      '🥵', '🥶', '🥴', '😵', '😵‍💫', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤',
      '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢',
      '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈',
      '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'
    ],
    hearts: [
      '❤️', '🩷', '🧡', '💛', '💚', '💙', '🩵', '💜', '🤎', '🖤', '🩶', '🤍', '💔',
      '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💋',
      '🫦', '🫀', '👩‍❤️‍💋‍👨', '👩‍❤️‍👨', '👩‍❤️‍💋‍👩', '👨‍❤️‍💋‍👨', '👩‍❤️‍👩', '👨‍❤️‍👨',
      '💐', '🌹', '🥀', '🌷', '🌸', '🌺', '💒', '💍', '💎'
    ],
    people: [
      '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞',
      '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊',
      '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪',
      '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'
    ],
    nature: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷',
      '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆',
      '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜',
      '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙',
      '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🦭', '🐊', '🐆',
      '🐅', '🐃', '🐂', '🐄', '🦌', '🦬', '🦙', '🦮', '🐩', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃'
    ],
    food: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭',
      '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒',
      '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞',
      '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆',
      '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟',
      '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧',
      '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛',
      '🍼', '🫖', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂'
    ],
    travel: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜',
      '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡',
      '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉',
      '🚁', '🛩️', '✈️', '🛫', '🛬', '🪂', '💺', '🛰️', '🚀', '🛸', '⛵', '🚤', '🛥️', '🚢',
      '⚓', '⛽', '🏖️', '🏝️', '🏜️', '🌋', '🏔️', '🏕️', '⛺', '🏠', '🏡', '🏙️', '🌆', '🌇'
    ],
    objects: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🕹️', '💽', '💾', '💿', '📀', '📼',
      '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️',
      '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🪫', '🔌', '💡', '🔦',
      '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️',
      '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️',
      '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '🔮', '🧿'
    ],
    spicy: [
      '💋', '🫦', '👅', '🍑', '🍒', '🍆', '🍌', '🍓', '🔥', '😈', '👿', '🤤', '🥵', '😏',
      '😜', '🤫', '🫣', '⛓️', '🪢', '🪤', '🛏️', '🕯️', '🍾', '🍷', '🍸', '🍫', '🌹', '🥀',
      '🖤', '🔞', '🧲', '🪞', '👠', '👙', '🩱', '💄', '💍', '🎀'
    ]
  };

  // Pre-Curated Couples & Themed Sticker Packs
  const curatedStickerPacks = {
    romance: [
      { id: 'stk_r1', content: '💖', label: 'Heart Spark' },
      { id: 'stk_r2', content: '👩‍❤️‍💋‍👨', label: 'Passionate Kiss' },
      { id: 'stk_r3', content: '💕', label: 'Two Hearts' },
      { id: 'stk_r4', content: '💌', label: 'Love Letter' },
      { id: 'stk_r5', content: '🌹', label: 'Red Rose' },
      { id: 'stk_r6', content: '💍', label: 'Marry Me' },
      { id: 'stk_r7', content: '🫶', label: 'Heart Hands' },
      { id: 'stk_r8', content: '🥺', label: 'Hold Me' },
      { id: 'stk_r9', content: '🥰', label: 'All My Love' },
      { id: 'stk_r10', content: '🫂', label: 'Warm Cuddle' },
      { id: 'stk_r11', content: '💏', label: 'Sweet Couple' },
      { id: 'stk_r12', content: '💋', label: 'Sweet Kiss' }
    ],
    spicy: [
      { id: 'stk_s1', content: '🔥', label: 'Hot & Spicy' },
      { id: 'stk_s2', content: '😈', label: 'Naughty Devil' },
      { id: 'stk_s3', content: '🍑', label: 'Juicy Peach' },
      { id: 'stk_s4', content: '🍒', label: 'Sweet Cherries' },
      { id: 'stk_s5', content: '🫦', label: 'Biting Lip' },
      { id: 'stk_s6', content: '🥵', label: 'Too Hot' },
      { id: 'stk_s7', content: '⛓️', label: 'Handcuffs' },
      { id: 'stk_s8', content: '🔞', label: '18+ Only' },
      { id: 'stk_s9', content: '🍷', label: 'Sensual Wine' },
      { id: 'stk_s10', content: '🍓', label: 'Dipped Strawberry' },
      { id: 'stk_s11', content: '👠', label: 'High Heels' },
      { id: 'stk_s12', content: '🤤', label: 'Obsessed With You' }
    ],
    classics: [
      { id: 'stk_c1', content: '💯', label: 'Keep it 100' },
      { id: 'stk_c2', content: '🥳', label: 'Party Time' },
      { id: 'stk_c3', content: '✨', label: 'Magic Sparks' },
      { id: 'stk_c4', content: '🚀', label: 'To The Moon' },
      { id: 'stk_c5', content: '👑', label: 'Crown Royalty' },
      { id: 'stk_c6', content: '😂', label: 'Dying Laughing' },
      { id: 'stk_c7', content: '🍕', label: 'Pizza Craving' },
      { id: 'stk_c8', content: '🐱', label: 'Cute Kitten' },
      { id: 'stk_c9', content: '🌈', label: 'Rainbow Vibes' },
      { id: 'stk_c10', content: '🕶️', label: 'Cool Cat' },
      { id: 'stk_c11', content: '💥', label: 'Boom Power' },
      { id: 'stk_c12', content: '💎', label: 'Pure Diamond' }
    ]
  };

  // ==========================================
  // INDEXEDDB VAULT FOR INFINITE CUSTOM STICKERS
  // ==========================================
  const IDB_NAME = 'PrismStickerVault';
  const IDB_STORE = 'custom_stickers';
  let stickerDB = null;

  function openStickerDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) return resolve(null);
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = (e) => {
        stickerDB = e.target.result;
        resolve(stickerDB);
      };
      req.onerror = () => resolve(null);
    });
  }

  function getCustomStickers() {
    return new Promise((resolve) => {
      if (!stickerDB) return resolve([]);
      try {
        const tx = stickerDB.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  function saveCustomSticker(dataUrl, name = 'sticker') {
    return new Promise((resolve, reject) => {
      if (!stickerDB) return reject(new Error('IndexedDB unavailable'));
      try {
        const tx = stickerDB.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.add({ dataUrl, name, createdAt: Date.now() });
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e);
      } catch (e) {
        reject(e);
      }
    });
  }

  function deleteCustomSticker(id) {
    return new Promise((resolve) => {
      if (!stickerDB) return resolve();
      try {
        const tx = stickerDB.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  // ==========================================
  // INITIALIZATION & LIFECYCLE
  // ==========================================
  initThemes();
  initEmojis();
  initStickers();
  checkAuth();

  // 1. Theme and Custom Wallpaper System
  function initThemes() {
    const savedTheme = localStorage.getItem('prism_theme') || 'theme-sunset';
    setTheme(savedTheme);

    const savedWallpaper = localStorage.getItem('prism_custom_wallpaper');
    if (savedWallpaper) {
      applyCustomWallpaper(savedWallpaper);
    }

    // Theme chip selectors
    document.querySelectorAll('.theme-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        setTheme(theme);
        themeMenu.classList.add('hidden');
      });
    });

    btnThemeMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      themeMenu.classList.toggle('hidden');
    });

    const btnHeaderThemeQuick = document.getElementById('btnHeaderThemeQuick');
    if (btnHeaderThemeQuick) {
      btnHeaderThemeQuick.addEventListener('click', (e) => {
        e.stopPropagation();
        themeMenu.classList.toggle('hidden');
      });
    }

    document.addEventListener('click', (e) => {
      if (!themeMenu.contains(e.target) && e.target !== btnThemeMenu) {
        themeMenu.classList.add('hidden');
      }
      if (!emojiPickerPopover.contains(e.target) && e.target !== btnToggleEmoji) {
        emojiPickerPopover.classList.add('hidden');
      }
      if (!stickerDrawerPopover.contains(e.target) && e.target !== btnToggleSticker) {
        stickerDrawerPopover.classList.add('hidden');
      }
      if (!searchResultsDropdown.contains(e.target) && e.target !== userSearchInput) {
        searchResultsDropdown.classList.add('hidden');
      }
    });

    // Custom Wallpaper Upload from local drive
    wallpaperUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please choose a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        try {
          localStorage.setItem('prism_custom_wallpaper', dataUrl);
          applyCustomWallpaper(dataUrl);
          themeMenu.classList.add('hidden');
        } catch (err) {
          alert('Image size exceeds browser local storage limits. Try a slightly smaller image.');
        }
      };
      reader.readAsDataURL(file);
    });

    btnResetWallpaper.addEventListener('click', () => {
      localStorage.removeItem('prism_custom_wallpaper');
      chatWallpaperLayer.style.backgroundImage = '';
      chatWallpaperLayer.classList.remove('active');
      btnResetWallpaper.classList.add('hidden');
    });
  }

  function setTheme(themeClass) {
    document.querySelectorAll('.theme-chip').forEach(b => b.classList.remove('active'));
    const target = document.querySelector(`.theme-chip[data-theme="${themeClass}"]`);
    if (target) target.classList.add('active');

    appBody.className = themeClass;
    localStorage.setItem('prism_theme', themeClass);
  }

  function applyCustomWallpaper(dataUrl) {
    chatWallpaperLayer.style.backgroundImage = `url("${dataUrl}")`;
    chatWallpaperLayer.classList.add('active');
    btnResetWallpaper.classList.remove('hidden');
  }

  // 2. Initialize Emoji Picker (WhatsApp & iOS 18 Style)
  function initEmojis() {
    renderEmojiCategory('smileys');

    document.querySelectorAll('.emoji-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (emojiSearchInput) emojiSearchInput.value = '';
        renderEmojiCategory(btn.dataset.category);
      });
    });

    // Real-time emoji search (WhatsApp style)
    if (emojiSearchInput) {
      emojiSearchInput.addEventListener('input', () => {
        const query = emojiSearchInput.value.trim().toLowerCase();
        if (!query) {
          const activeTab = document.querySelector('.emoji-cat-btn.active');
          renderEmojiCategory(activeTab ? activeTab.dataset.category : 'smileys');
          return;
        }

        const matches = [];
        Object.values(emojiCategories).flat().forEach(emoji => {
          if (!matches.includes(emoji)) {
            matches.push(emoji);
          }
        });
        renderEmojiList(matches.slice(0, 80));
      });
    }

    btnToggleEmoji.addEventListener('click', (e) => {
      e.stopPropagation();
      stickerDrawerPopover.classList.add('hidden');
      emojiPickerPopover.classList.toggle('hidden');
      if (!emojiPickerPopover.classList.contains('hidden') && emojiSearchInput) {
        emojiSearchInput.focus();
      }
    });

    btnCloseEmoji.addEventListener('click', () => {
      emojiPickerPopover.classList.add('hidden');
    });
  }

  function renderEmojiCategory(category) {
    const list = emojiCategories[category] || emojiCategories.smileys;
    renderEmojiList(list);
  }

  function renderEmojiList(list) {
    emojiGrid.innerHTML = '';
    list.forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-btn';
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        messageTextInput.value += emoji;
        messageTextInput.focus();
      });
      emojiGrid.appendChild(btn);
    });
  }

  // 3. Initialize WhatsApp Infinite Sticker Vault
  let activeStickerPack = 'custom';

  async function initStickers() {
    await openStickerDB();
    renderStickerPack(activeStickerPack);

    // Tab switching for Sticker Vault
    document.querySelectorAll('.sticker-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sticker-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeStickerPack = btn.dataset.pack;
        renderStickerPack(activeStickerPack);
      });
    });

    // Add Custom Sticker (Unlimited / WhatsApp style)
    if (customStickerFileInput) {
      customStickerFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          alert('Please select an image file (PNG, GIF, JPG, WEBP).');
          return;
        }

        const reader = new FileReader();
        reader.onload = async (evt) => {
          const dataUrl = evt.target.result;
          await saveCustomSticker(dataUrl, file.name);
          customStickerFileInput.value = '';
          if (activeStickerPack === 'custom') {
            renderStickerPack('custom');
          }
        };
        reader.readAsDataURL(file);
      });
    }

    btnToggleSticker.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPickerPopover.classList.add('hidden');
      stickerDrawerPopover.classList.toggle('hidden');
      if (!stickerDrawerPopover.classList.contains('hidden')) {
        renderStickerPack(activeStickerPack);
      }
    });

    btnCloseSticker.addEventListener('click', () => {
      stickerDrawerPopover.classList.add('hidden');
    });
  }

  async function renderStickerPack(packName) {
    stickerGrid.innerHTML = '';

    if (packName === 'custom') {
      if (customStickerActions) customStickerActions.classList.remove('hidden');
      const customStickers = await getCustomStickers();
      if (stickerVaultCount) stickerVaultCount.textContent = `${customStickers.length} custom stickers`;

      if (customStickers.length === 0) {
        stickerGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 24px 10px; color: var(--text-secondary); font-size: 12px;">
            <div style="font-size: 32px; margin-bottom: 6px;">📂</div>
            <strong>Your Sticker Vault is empty</strong><br>
            Tap "Add Custom Sticker" above to import any photo, meme, or GIF from your device!
          </div>
        `;
        return;
      }

      customStickers.forEach(stk => {
        const el = document.createElement('div');
        el.className = 'sticker-vault-item';
        el.innerHTML = `
          <img src="${stk.dataUrl}" alt="${escapeHtml(stk.name)}">
          <button type="button" class="btn-delete-sticker" title="Delete from vault">&times;</button>
        `;

        el.addEventListener('click', (e) => {
          if (e.target.classList.contains('btn-delete-sticker')) {
            e.stopPropagation();
            deleteCustomSticker(stk.id).then(() => renderStickerPack('custom'));
            return;
          }
          sendStickerMessage(stk.dataUrl);
          stickerDrawerPopover.classList.add('hidden');
        });

        stickerGrid.appendChild(el);
      });
    } else {
      if (customStickerActions) customStickerActions.classList.add('hidden');
      const pack = curatedStickerPacks[packName] || curatedStickerPacks.romance;
      pack.forEach(stk => {
        const el = document.createElement('div');
        el.className = 'sticker-vault-item';
        el.title = stk.label;
        el.innerHTML = `<span class="sticker-emoji-text">${stk.content}</span>`;
        el.addEventListener('click', () => {
          sendStickerMessage(stk.content);
          stickerDrawerPopover.classList.add('hidden');
        });
        stickerGrid.appendChild(el);
      });
    }
  }

  // ==========================================
  // PANIC BUTTON IMPLEMENTATION (Top Left)
  // ==========================================
  btnPanic.addEventListener('click', triggerPanicExit);

  // Keyboard shortcut: Quick Double Escape triggers panic button
  let lastEscTime = 0;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const now = Date.now();
      if (now - lastEscTime < 600) {
        triggerPanicExit();
      }
      lastEscTime = now;
    }
  });

  function triggerPanicExit() {
    // 1. Wipe all local credentials, tokens, message caches immediately
    localStorage.removeItem('prism_auth_token');
    localStorage.removeItem('prism_user');
    sessionStorage.clear();

    // 2. Disconnect socket instantly
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    // 3. Inform server async without waiting
    fetch('/api/panic', { method: 'POST' }).catch(() => {});

    // 4. Clear active in-memory DOM variables
    currentUser = null;
    activePartner = null;
    currentMessages = [];

    // 5. Instantly redirect or replace window with harmless innocent screen
    // Zero trace of chat in DOM or back history!
    window.location.replace('/');
  }

  // ==========================================
  // AUTHENTICATION & DISGUISED WORKSPACE FLOW
  // ==========================================

  // Switch between Sign In and Create Account
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    hideAlert();
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    hideAlert();
  });

  function showAlert(message, type = 'error') {
    authAlert.textContent = message;
    authAlert.className = `auth-alert ${type}`;
    authAlert.classList.remove('hidden');
  }

  function hideAlert() {
    authAlert.classList.add('hidden');
  }

  // Form Submit: Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const identifier = loginIdentifier.value.trim();
    const password = loginPassword.value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('prism_auth_token', authToken);
      localStorage.setItem('prism_user', JSON.stringify(currentUser));

      enterAppMode();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  // Form Submit: Register
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = regEmail.value.trim();
    const username = regUsername.value.trim().toLowerCase();
    const displayName = regDisplayName.value.trim();
    const password = regPassword.value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, displayName, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('prism_auth_token', authToken);
      localStorage.setItem('prism_user', JSON.stringify(currentUser));

      enterAppMode();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  // Check persistent session on load
  async function checkAuth() {
    if (!authToken) {
      showAuthScreen();
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        localStorage.setItem('prism_user', JSON.stringify(currentUser));
        enterAppMode();
      } else {
        localStorage.removeItem('prism_auth_token');
        showAuthScreen();
      }
    } catch (err) {
      showAuthScreen();
    }
  }

  function showAuthScreen() {
    if (chatMain) chatMain.classList.remove('mobile-active');
    authScreen.classList.remove('hidden');
    mainApp.classList.add('hidden');
    if (socket) socket.disconnect();
  }

  function enterAppMode() {
    authScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');

    // Populate user profile info in header
    currentUserAvatar.textContent = (currentUser.displayName || currentUser.username).slice(0, 2).toUpperCase();
    currentUserAvatar.style.backgroundColor = currentUser.avatarColor || '#6366f1';
    currentUserName.textContent = `@${currentUser.username}`;
    currentUserRole.textContent = currentUser.role === 'admin' ? 'Master Admin' : 'Active User';

    // Show or hide Admin panel button
    if (currentUser.role === 'admin') {
      btnAdminPanel.classList.remove('hidden');
    } else {
      btnAdminPanel.classList.add('hidden');
    }

    // Connect real-time socket
    connectSocket();

    // Load recent conversations
    loadConversations();
  }

  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('prism_auth_token');
    localStorage.removeItem('prism_user');
    authToken = null;
    currentUser = null;
    showAuthScreen();
  });

  // ==========================================
  // REAL-TIME SOCKET.IO ENGINE
  // ==========================================
  function connectSocket() {
    if (socket) socket.disconnect();

    socket = io({
      auth: { token: authToken }
    });

    socket.on('connect', () => {
      console.log('✅ Real-time secured communication socket connected.');
    });

    // 1. Inbound Direct Message
    socket.on('chat:message', (msg) => {
      // Check if message belongs to active conversation
      if (activePartner && (msg.senderUsername === activePartner.username || msg.recipientUsername === activePartner.username)) {
        appendMessage(msg);
        scrollToBottom();

        // If from partner, mark read
        if (msg.senderUsername === activePartner.username) {
          socket.emit('chat:read', { partnerUsername: activePartner.username });
        }
      }

      // Refresh conversations list in sidebar
      loadConversations();
    });

    // 2. Reaction Update (Double-tap heart)
    socket.on('chat:reaction_updated', (updatedMsg) => {
      if (activePartner && (updatedMsg.senderUsername === activePartner.username || updatedMsg.recipientUsername === activePartner.username)) {
        const msgEl = document.getElementById(`msg-${updatedMsg.id}`);
        if (msgEl) {
          updateReactionBadge(msgEl, updatedMsg);
        }
      }
    });

    // 3. Typing Indicators
    socket.on('chat:user_typing', ({ username, isTyping }) => {
      if (activePartner && activePartner.username === username) {
        if (isTyping) {
          typingUserText.textContent = `@${username} is typing...`;
          typingIndicator.classList.remove('hidden');
          scrollToBottom();
        } else {
          typingIndicator.classList.add('hidden');
        }
      }
    });

    // 4. Partner marked messages as read
    socket.on('chat:marked_read', ({ byUsername }) => {
      if (activePartner && activePartner.username === byUsername) {
        document.querySelectorAll('.msg-status').forEach(s => s.textContent = 'Read');
      }
    });

    // 5. EXCLUSIVE ADMIN NOTIFICATION:
    // Only the admin receives alerts!
    socket.on('admin:notification', (event) => {
      if (currentUser && currentUser.role === 'admin') {
        adminBadgeDot.classList.remove('hidden');
        playAdminChime();
        addAdminFeedItem(event);
      }
    });

    // 6. Account revoked/discarded by Administrator
    socket.on('account:discarded', (data) => {
      alert(`NOTICE: ${data.message || 'Your account access has been revoked by the system administrator.'}`);
      triggerPanicExit();
    });
  }

  // ==========================================
  // SEARCH USERS BY UNIQUE USERNAME (Asked at Signup)
  // ==========================================
  let searchDebounce = null;
  userSearchInput.addEventListener('input', () => {
    const query = userSearchInput.value.trim();
    if (query.length > 0) {
      btnClearSearch.classList.remove('hidden');
    } else {
      btnClearSearch.classList.add('hidden');
      searchResultsDropdown.classList.add('hidden');
      return;
    }

    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      performUserSearch(query);
    }, 250);
  });

  btnClearSearch.addEventListener('click', () => {
    userSearchInput.value = '';
    btnClearSearch.classList.add('hidden');
    searchResultsDropdown.classList.add('hidden');
  });

  async function performUserSearch(query) {
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      renderSearchResults(data.users || []);
    } catch (err) {
      console.error('Search error:', err);
    }
  }

  function renderSearchResults(users) {
    searchResultsList.innerHTML = '';
    if (users.length === 0) {
      searchResultsList.innerHTML = '<div style="padding:12px; font-size:12px; color:#94a3b8; text-align:center;">No users found with that handle</div>';
    } else {
      users.forEach(u => {
        const item = document.createElement('div');
        item.className = 'search-user-item';
        item.innerHTML = `
          <div class="avatar-ring-sm">
            <div class="avatar-sm" style="background:${u.avatarColor || '#6366f1'}">${(u.displayName || u.username).slice(0, 2).toUpperCase()}</div>
          </div>
          <div>
            <div style="font-size:13px; font-weight:700; color:#fff;">@${u.username}</div>
            <div style="font-size:11px; color:#94a3b8;">${u.displayName || ''}</div>
          </div>
        `;
        item.addEventListener('click', () => {
          searchResultsDropdown.classList.add('hidden');
          userSearchInput.value = '';
          btnClearSearch.classList.add('hidden');
          openConversationWithUser(u);
        });
        searchResultsList.appendChild(item);
      });
    }
    searchResultsDropdown.classList.remove('hidden');
  }

  // ==========================================
  // CONVERSATIONS LIST & DIRECT CHAT MANAGEMENT
  // ==========================================
  async function loadConversations() {
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      renderConversations(data.conversations || []);
    } catch (err) {
      console.error('Load convos error:', err);
    }
  }

  function renderConversations(convos) {
    conversationsList.innerHTML = '';

    if (convos.length === 0) {
      conversationsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💬</div>
          <p class="empty-title">No conversations yet</p>
          <p class="empty-text">Search for any unique @username above to start texting.</p>
        </div>
      `;
      return;
    }

    convos.forEach(c => {
      const isActive = activePartner && activePartner.username === c.partnerUsername;
      const el = document.createElement('div');
      el.className = `convo-item ${isActive ? 'active' : ''}`;
      
      const timeStr = formatTimestamp(c.lastTimestamp);

      el.innerHTML = `
        <div class="avatar-ring-sm">
          <div class="avatar-sm" style="background:${c.partnerAvatarColor || '#8b5cf6'}">
            ${(c.partnerDisplayName || c.partnerUsername).slice(0, 2).toUpperCase()}
          </div>
        </div>
        <div class="convo-details">
          <div class="convo-top">
            <span class="convo-name">@${c.partnerUsername}</span>
            <span class="convo-time">${timeStr}</span>
          </div>
          <div class="convo-bottom">
            <span class="convo-snippet">${escapeHtml(c.lastMessage)}</span>
            ${c.unread ? '<span class="unread-dot"></span>' : ''}
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        openConversationWithUser({
          id: c.partnerId,
          username: c.partnerUsername,
          displayName: c.partnerDisplayName,
          avatarColor: c.partnerAvatarColor
        });
      });

      conversationsList.appendChild(el);
    });
  }

  async function openConversationWithUser(partner) {
    activePartner = partner;

    // Show mobile chat screen on mobile devices
    if (chatMain) {
      chatMain.classList.add('mobile-active');
    }

    // Update active chat header
    activePartnerAvatar.textContent = (partner.displayName || partner.username).slice(0, 2).toUpperCase();
    activePartnerAvatar.style.backgroundColor = partner.avatarColor || '#ec4899';
    activePartnerName.textContent = partner.displayName || partner.username;
    activePartnerHandle.textContent = `@${partner.username}`;

    noChatSelected.classList.add('hidden');
    activeChatWindow.classList.remove('hidden');

    // Fetch message history for strictly isolated conversation
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(partner.username)}/messages`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      currentMessages = data.messages || [];
      renderMessages();
      scrollToBottom();
      messageTextInput.focus();
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    }

    // Refresh sidebar highlighting
    loadConversations();
  }

  // Mobile Back Button to return to conversations list
  if (btnMobileBack) {
    btnMobileBack.addEventListener('click', () => {
      if (chatMain) {
        chatMain.classList.remove('mobile-active');
      }
      activePartner = null;
      document.querySelectorAll('.convo-item').forEach(c => c.classList.remove('active'));
    });
  }

  function renderMessages() {
    messagesList.innerHTML = '';
    currentMessages.forEach(msg => {
      appendMessage(msg);
    });
  }

  function appendMessage(msg) {
    const isSent = msg.senderId === currentUser.id || msg.senderUsername === currentUser.username;
    const msgWrapper = document.createElement('div');
    msgWrapper.className = `msg-wrapper ${isSent ? 'sent' : 'received'}`;
    msgWrapper.id = `msg-${msg.id}`;

    let contentHtml = '';
    let bubbleClass = 'msg-bubble';

    if (msg.type === 'image') {
      bubbleClass += ' is-image';
      contentHtml = `<img src="${msg.mediaUrl || msg.content}" alt="Sent photo" loading="lazy">`;
    } else if (msg.type === 'sticker') {
      bubbleClass += ' is-sticker';
      const isImg = msg.content && (msg.content.startsWith('data:image') || msg.content.startsWith('http') || msg.content.startsWith('/'));
      if (isImg) {
        contentHtml = `<img src="${msg.content}" class="sticker-img-display" alt="Sticker" loading="lazy">`;
      } else {
        contentHtml = `<span class="sticker-display">${msg.content}</span>`;
      }
    } else {
      contentHtml = escapeHtml(msg.content);
    }

    const timeStr = formatTime(msg.timestamp);

    msgWrapper.innerHTML = `
      <div class="${bubbleClass}">
        ${contentHtml}
      </div>
      <div class="msg-meta">
        <span>${timeStr}</span>
        ${isSent ? `<span class="msg-status">${msg.read ? 'Read' : 'Delivered'}</span>` : ''}
      </div>
    `;

    // Click on photo opens full lightbox
    if (msg.type === 'image') {
      const img = msgWrapper.querySelector('img');
      if (img) {
        img.addEventListener('click', () => {
          openLightbox(img.src);
        });
      }
    }

    // Double-tap or double-click to heart (❤️) Instagram style!
    const bubble = msgWrapper.querySelector('.msg-bubble');
    bubble.addEventListener('dblclick', () => {
      toggleReaction(msg.id, '❤️');
    });

    // Append reaction badge if present
    if (msg.reaction) {
      updateReactionBadge(msgWrapper, msg);
    }

    messagesList.appendChild(msgWrapper);
  }

  function updateReactionBadge(msgWrapper, msg) {
    let badge = msgWrapper.querySelector('.msg-reaction-badge');
    if (msg.reaction) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'msg-reaction-badge';
        msgWrapper.appendChild(badge);
      }
      badge.textContent = msg.reaction;
      badge.onclick = (e) => {
        e.stopPropagation();
        toggleReaction(msg.id, msg.reaction);
      };
    } else if (badge) {
      badge.remove();
    }
  }

  function toggleReaction(messageId, reaction) {
    if (socket) {
      socket.emit('chat:react', { messageId, reaction });
    }
  }

  // ==========================================
  // SEND MESSAGE HANDLERS
  // ==========================================
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage();
  });

  messageTextInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      notifyTyping();
    }
  });

  function notifyTyping() {
    if (!socket || !activePartner) return;
    socket.emit('chat:typing', { recipientUsername: activePartner.username, isTyping: true });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('chat:typing', { recipientUsername: activePartner.username, isTyping: false });
    }, 1200);
  }

  async function sendMessage() {
    if (!activePartner) return;

    // Check if there is an image to send
    if (pendingImageFile) {
      await sendImageMessage();
      return;
    }

    const text = messageTextInput.value.trim();
    if (!text) return;

    messageTextInput.value = '';
    messageTextInput.style.height = 'auto';

    socket.emit('chat:send', {
      recipientUsername: activePartner.username,
      content: text,
      type: 'text'
    }, (response) => {
      if (response && response.error) {
        alert(response.error);
      }
    });

    scrollToBottom();
    setTimeout(() => {
      messageTextInput.focus();
      scrollToBottom();
    }, 60);
  }

  // Handle mobile visual viewport changes (e.g. keyboard showing/hiding)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (activePartner) {
        scrollToBottom();
      }
    });
  }

  function sendStickerMessage(stickerEmoji) {
    if (!activePartner) return;

    socket.emit('chat:send', {
      recipientUsername: activePartner.username,
      content: stickerEmoji,
      type: 'sticker'
    });
  }

  // Image Upload Handling
  imageFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only images (JPG, PNG, GIF, WEBP) are supported.');
      return;
    }

    pendingImageFile = file;
    previewFilename.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (event) => {
      previewImageSrc.src = event.target.result;
      imagePreviewBar.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  btnCancelImageUpload.addEventListener('click', () => {
    pendingImageFile = null;
    imageFileInput.value = '';
    imagePreviewBar.classList.add('hidden');
  });

  async function sendImageMessage() {
    if (!pendingImageFile || !activePartner) return;

    const formData = new FormData();
    formData.append('image', pendingImageFile);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload photo');
      }

      // Send image message via socket
      socket.emit('chat:send', {
        recipientUsername: activePartner.username,
        content: data.url,
        mediaUrl: data.url,
        type: 'image'
      });

      // Clear pending
      pendingImageFile = null;
      imageFileInput.value = '';
      imagePreviewBar.classList.add('hidden');
    } catch (err) {
      alert(err.message);
    }
  }

  // ==========================================
  // LIGHTBOX VIEWER
  // ==========================================
  function openLightbox(url) {
    lightboxImage.src = url;
    lightboxDownloadBtn.href = url;
    lightboxModal.classList.remove('hidden');
  }

  btnCloseLightbox.addEventListener('click', () => {
    lightboxModal.classList.add('hidden');
  });

  lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) {
      lightboxModal.classList.add('hidden');
    }
  });

  // ==========================================
  // ADMIN SUPERVISOR DASHBOARD (Full Control)
  // ==========================================
  btnAdminPanel.addEventListener('click', () => {
    adminBadgeDot.classList.add('hidden');
    openAdminModal();
  });

  btnCloseAdminModal.addEventListener('click', () => {
    adminModal.classList.add('hidden');
  });

  // Tab switching in Admin
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  btnRefreshAdminUsers.addEventListener('click', fetchAdminUsers);

  btnClearLiveFeed.addEventListener('click', () => {
    adminLiveFeed.innerHTML = '<div class="feed-empty">Feed cleared. Waiting for new real-time activity...</div>';
    adminLiveCount.textContent = '0';
  });

  async function openAdminModal() {
    adminModal.classList.remove('hidden');
    await Promise.all([fetchAdminStats(), fetchAdminUsers(), fetchAdminFeed()]);
  }

  async function fetchAdminStats() {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const stats = await res.json();
        statTotalUsers.textContent = stats.totalUsers;
        statActiveUsers.textContent = stats.activeUsers;
        statDiscardedUsers.textContent = stats.discardedUsers;
        statTotalMessages.textContent = stats.totalMessages;
      }
    } catch (err) {
      console.error('Stats error:', err);
    }
  }

  async function fetchAdminUsers() {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        renderAdminUserTable(data.users || []);
      }
    } catch (err) {
      console.error('Fetch admin users error:', err);
    }
  }

  function renderAdminUserTable(users) {
    adminUserTableBody.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      const isDiscarded = u.status === 'discarded';
      const isAdmin = u.role === 'admin';

      tr.innerHTML = `
        <td>
          <div class="user-td-cell">
            <div class="avatar-sm" style="background:${u.avatarColor || '#6366f1'}">${(u.displayName || u.username).slice(0, 2).toUpperCase()}</div>
            <div>
              <div style="font-weight:700; color:#fff;">${escapeHtml(u.displayName || u.username)}</div>
              ${isAdmin ? '<span style="font-size:10px; color:#f43f5e; font-weight:700;">ADMIN</span>' : ''}
            </div>
          </div>
        </td>
        <td><span style="font-family:var(--font-mono); font-size:12px;">${escapeHtml(u.email)}</span></td>
        <td><strong style="color:#818cf8;">@${escapeHtml(u.username)}</strong></td>
        <td>
          <span class="status-tag ${isDiscarded ? 'discarded' : 'active'}">
            ${isDiscarded ? 'Discarded / Banned' : 'Active'}
          </span>
        </td>
        <td><span style="font-size:11px; color:#94a3b8;">${formatDate(u.createdAt)}</span></td>
        <td><span style="font-size:11px; font-family:var(--font-mono);">${u.totalSent} sent / ${u.totalReceived} recv</span></td>
        <td style="text-align: right;">
          ${isAdmin ? '<span style="font-size:11px; color:#94a3b8;">Protected</span>' : (
            isDiscarded ? 
            `<button class="btn-restore-user" data-id="${u.id}">Restore</button>` :
            `<button class="btn-discard-user" data-id="${u.id}">Discard User</button>`
          )}
        </td>
      `;

      const discardBtn = tr.querySelector('.btn-discard-user');
      if (discardBtn) {
        discardBtn.addEventListener('click', () => discardUser(u.id, u.username));
      }

      const restoreBtn = tr.querySelector('.btn-restore-user');
      if (restoreBtn) {
        restoreBtn.addEventListener('click', () => restoreUser(u.id, u.username));
      }

      adminUserTableBody.appendChild(tr);
    });
  }

  // Filter in admin table
  adminUserFilter.addEventListener('input', () => {
    const term = adminUserFilter.value.toLowerCase();
    document.querySelectorAll('#adminUserTableBody tr').forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? '' : 'none';
    });
  });

  async function discardUser(userId, username) {
    if (!confirm(`Are you sure you want to DISCARD user @${username}? This immediately terminates their access.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}/discard`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchAdminStats();
      fetchAdminUsers();
    } catch (err) {
      alert(err.message);
    }
  }

  async function restoreUser(userId, username) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchAdminStats();
      fetchAdminUsers();
    } catch (err) {
      alert(err.message);
    }
  }

  async function fetchAdminFeed() {
    try {
      const res = await fetch('/api/admin/feed', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        adminLiveFeed.innerHTML = '';
        (data.recentMessages || []).forEach(m => {
          addAdminFeedItem({
            type: 'TEXT_MESSAGE_SENT',
            text: `@${m.senderUsername} ➔ @${m.recipientUsername}: ${m.type === 'text' ? m.content : `[${m.type}]`}`,
            timestamp: m.timestamp
          });
        });
      }
    } catch (err) {
      console.error('Fetch feed error:', err);
    }
  }

  function addAdminFeedItem(event) {
    const empty = adminLiveFeed.querySelector('.feed-empty');
    if (empty) empty.remove();

    const item = document.createElement('div');
    item.className = 'feed-item';

    let icon = '💬';
    if (event.type === 'USER_REGISTERED') icon = '👤';
    if (event.type === 'USER_LOGIN') icon = '🔑';
    if (event.type === 'USER_DISCARDED') icon = '🚫';

    item.innerHTML = `
      <div class="feed-item-icon">${icon}</div>
      <div class="feed-item-content">
        <div class="feed-item-text">${escapeHtml(event.text || '')}</div>
        <div class="feed-item-time">${formatTime(event.timestamp || new Date().toISOString())}</div>
      </div>
    `;

    adminLiveFeed.prepend(item);
    const count = parseInt(adminLiveCount.textContent || '0', 10) + 1;
    adminLiveCount.textContent = count;
  }

  // ==========================================
  // HELPERS
  // ==========================================
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTimestamp(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);

    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function formatTime(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

})();
