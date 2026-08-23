import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  onValue,
  push,
  set,
  update,
  remove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { loadFirebaseConfig } from "./config-loader.js";
import { MUNICIPALITIES } from "./data/municipalities/municipalities.js";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 5;
const CPU_THINK_DELAY_MS = 1000;
const OVER_TARGET_DRAW_RATE = 0.01;
// 「TARGET÷この数」に近い人口ほど引きやすくする。3なら平均3ターン程度でTARGET付近に届く見込み。
const DRAW_REFERENCE_TURNS = 3;
// 参照値からの対数距離に対する減衰の強さ。大きいほど参照値から離れた人口が出にくくなる。
const DRAW_DECAY_RATE = 4;
// 「人口カード構成」表示で、1つの帯の割合がこれを超えたら細分化する。
const DRAW_BAND_SHARE_CAP = 0.25;
const DRAW_BAND_MAX_DEPTH = 5;
// 帯を分割するときに使う「キリのいい」区切り単位（人）。帯の幅に対して十分細かいものを自動選択する。
const DRAW_BAND_LADDER = [10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000, 10000000];
const PLAYER_COLOR_COUNT = 5;
const MAX_BATTLE_COMMENTS = 50;
const BAR_FILL_MS = 2000;
const CPU_ACCURACY_SETS = {
  1: [0.75],
  2: [0.65, 0.5],
  3: [0.65, 0.5, 0.45],
  4: [0.65, 0.5, 0.45, 0.45]
};
const CATEGORY_LABELS = {
  village_town: "5万人未満",
  small_city: "5万〜10万人未満",
  mid_city: "10万〜20万人未満",
  large_city: "20万〜30万人未満",
  major_city: "30万〜70万人未満",
  ordinance_city: "70万人以上"
};
const CATEGORY_SUITS = {
  village_town: "♣",
  small_city: "♦",
  mid_city: "♥",
  large_city: "♠",
  major_city: "✦",
  ordinance_city: "★"
};
const TIER_CLASSES = Object.keys(CATEGORY_LABELS).map((category) => `tier-${category}`);
const CONFETTI_COLORS = ["#d4af37", "#f5da7a", "#37d38f", "#fff6da"];
const SOUND_MUTED_KEY = "populationBlackjackSoundMuted";
const BGM_MASTER_VOLUME = 0.22;
const BGM_STEP_SECONDS = 0.3;
const BGM_LOOKAHEAD_SECONDS = 0.6;
const BGM_BASS_NOTES = [55, 55, 65.41, 49];
const BGM_ARPEGGIO_NOTES = [220, 261.63, 329.63, 392, 196, 246.94, 293.66, 369.99];
const SFX_NOTES = {
  hit: [{ freq: 880, start: 0, duration: 0.12, type: "triangle" }],
  stand: [{ freq: 440, start: 0, duration: 0.18, type: "sine" }],
  bust: [
    { freq: 260, start: 0, duration: 0.2, type: "sawtooth" },
    { freq: 160, start: 0.12, duration: 0.28, type: "sawtooth" }
  ],
  just: [
    { freq: 660, start: 0, duration: 0.14, type: "triangle" },
    { freq: 880, start: 0.1, duration: 0.16, type: "triangle" },
    { freq: 1320, start: 0.2, duration: 0.24, type: "triangle" }
  ],
  win: [
    { freq: 523, start: 0, duration: 0.16, type: "triangle" },
    { freq: 659, start: 0.12, duration: 0.16, type: "triangle" },
    { freq: 784, start: 0.24, duration: 0.16, type: "triangle" },
    { freq: 1046, start: 0.36, duration: 0.3, type: "triangle" }
  ],
  lose: [
    { freq: 392, start: 0, duration: 0.2, type: "sine" },
    { freq: 311, start: 0.16, duration: 0.32, type: "sine" }
  ],
  draw: [
    { freq: 440, start: 0, duration: 0.16, type: "sine" },
    { freq: 440, start: 0.18, duration: 0.16, type: "sine" }
  ],
  tick: [{ freq: 700, start: 0, duration: 0.05, type: "square", volume: 0.08 }]
};
const TARGETS = [
  {
    id: "ntt-data-employees",
    label: "NTT DATAグループ社員数",
    value: 206900,
    dateLabel: "2026年6月30日時点",
    sourceLabel: "NTT 2026年度 第1四半期決算補足資料",
    difficulty: "標準",
    isDefault: true
  },
  {
    id: "toyosu-station-total",
    label: "豊洲駅 2社合算乗降客数",
    value: 235989,
    dateLabel: "2023年度",
    sourceLabel: "東京メトロ公式 + ゆりかもめ公式",
    difficulty: "標準"
  },
  {
    id: "ntt-group-employees",
    label: "NTTグループ全社員数",
    value: 344196,
    dateLabel: "2026年3月31日時点",
    sourceLabel: "NTT公式 会社概要",
    difficulty: "高め"
  },
  {
    id: "koto-city-population",
    label: "東京都江東区人口",
    value: 544929,
    dateLabel: "2026年8月1日時点",
    sourceLabel: "江東区公式 住民基本台帳人口",
    difficulty: "高め"
  },
  {
    id: "ntt-shareholders",
    label: "NTT株式会社の株主数",
    value: 3386781,
    dateLabel: "2026年6月30日時点",
    sourceLabel: "NTT公式 株式の概要",
    difficulty: "特別",
    isSpecial: true
  },
  {
    id: "ntt-east-residential-lines",
    label: "NTT東日本 加入電話（住宅用）契約数",
    value: 3606000,
    dateLabel: "2026年3月末現在",
    sourceLabel: "NTT東日本 2025年度期末サービス概況等",
    difficulty: "特別",
    isSpecial: true
  }
];
const DEFAULT_TARGET = TARGETS.find((target) => target.isDefault) || TARGETS[0];
const statusLabels = {
  waiting: "待機中",
  active: "プレイ中",
  stand: "STAND",
  bust: "BUST",
  just: "JUST"
};

// weightが大きいほど排出されやすい。他プレイヤーを直接妨害する攻撃系アイテムほどweightを低くしている。
const ITEM_CATALOG = [
  {
    id: "card-swap",
    label: "カード交換",
    description: "表示中の候補市区町村を1回だけ引き直します。",
    rarity: "コモン",
    weight: 25,
    requiresTarget: false
  },
  {
    id: "small-boost",
    label: "微増",
    description: "自分の現在人口に3,000人を加算します。",
    rarity: "コモン",
    weight: 20,
    requiresTarget: false
  },
  {
    id: "target-boost-5pct",
    label: "目標ブースト",
    description: "自分の現在人口にTARGETの5%を加算します。",
    rarity: "アンコモン",
    weight: 15,
    requiresTarget: false
  },
  {
    id: "shield",
    label: "シールド",
    description: "発動後、次に自分がBUSTする場面を1回だけ無効化し、直前の人口でSTAND扱いにします。",
    rarity: "アンコモン",
    weight: 12,
    requiresTarget: false
  },
  {
    id: "steal-10pct",
    label: "人口削減",
    description: "指定した相手の現在人口を10%削ります。",
    rarity: "レア",
    weight: 8,
    requiresTarget: true
  },
  {
    id: "swap-totals",
    label: "総取っ替え",
    description: "自分と指定した相手の現在人口を入れ替えます。",
    rarity: "レア",
    weight: 6,
    requiresTarget: true
  },
  {
    id: "force-plus-10k",
    label: "強制加算1万",
    description: "指定した相手の現在人口に1万人を強制的に加算します。TARGETを超えるとBUSTします。",
    rarity: "レア",
    weight: 6,
    requiresTarget: true
  },
  {
    id: "force-plus-30k",
    label: "強制加算3万",
    description: "指定した相手の現在人口に3万人を強制的に加算します。TARGETを超えるとBUSTします。",
    rarity: "ウルトラレア",
    weight: 3,
    requiresTarget: true
  },
  {
    id: "reset-all",
    label: "総リセット",
    description: "進行中の全員の現在人口・HIT回数・履歴を0に戻します（自分も対象です）。",
    rarity: "ウルトラレア",
    weight: 2,
    requiresTarget: false
  }
];

const els = {
  setupView: document.querySelector("#setupView"),
  setupModeView: document.querySelector("#setupModeView"),
  createRoomForm: document.querySelector("#createRoomForm"),
  joinRoomForm: document.querySelector("#joinRoomForm"),
  cpuRoomForm: document.querySelector("#cpuRoomForm"),
  selectCreateModeButton: document.querySelector("#selectCreateModeButton"),
  selectJoinModeButton: document.querySelector("#selectJoinModeButton"),
  selectCpuModeButton: document.querySelector("#selectCpuModeButton"),
  backFromCreateButton: document.querySelector("#backFromCreateButton"),
  backFromJoinButton: document.querySelector("#backFromJoinButton"),
  backFromCpuButton: document.querySelector("#backFromCpuButton"),
  gameView: document.querySelector("#gameView"),
  roomPanel: document.querySelector(".room-panel"),
  playerNameInput: document.querySelector("#playerNameInput"),
  joinPlayerNameInput: document.querySelector("#joinPlayerNameInput"),
  cpuPlayerNameInput: document.querySelector("#cpuPlayerNameInput"),
  roomIdInput: document.querySelector("#roomIdInput"),
  cpuCountSelect: document.querySelector("#cpuCountSelect"),
  createRoomButton: document.querySelector("#createRoomButton"),
  joinRoomButton: document.querySelector("#joinRoomButton"),
  startCpuRoomButton: document.querySelector("#startCpuRoomButton"),
  setupMessage: document.querySelector("#setupMessage"),
  createTargetSelect: document.querySelector("#createTargetSelect"),
  cpuTargetSelect: document.querySelector("#cpuTargetSelect"),
  createHideTargetCheckbox: document.querySelector("#createHideTargetCheckbox"),
  cpuHideTargetCheckbox: document.querySelector("#cpuHideTargetCheckbox"),
  createItemModeCheckbox: document.querySelector("#createItemModeCheckbox"),
  cpuItemModeCheckbox: document.querySelector("#cpuItemModeCheckbox"),
  targetRoulette: document.querySelector("#targetRoulette"),
  rouletteWindow: document.querySelector("#rouletteWindow"),
  roomCodeLabel: document.querySelector("#roomCodeLabel"),
  roomCode: document.querySelector("#roomCode"),
  copyRoomCodeButton: document.querySelector("#copyRoomCodeButton"),
  roomState: document.querySelector("#roomState"),
  turnLabel: document.querySelector("#turnLabel"),
  capacityLabel: document.querySelector("#capacityLabel"),
  turnBanner: document.querySelector("#turnBanner"),
  startGameButton: document.querySelector("#startGameButton"),
  readyButton: document.querySelector("#readyButton"),
  readyStatusText: document.querySelector("#readyStatusText"),
  goHomeButton: document.querySelector("#goHomeButton"),
  totalLabel: document.querySelector("#totalLabel"),
  hitCountLabel: document.querySelector("#hitCountLabel"),
  myTotal: document.querySelector("#myTotal"),
  myHitCount: document.querySelector("#myHitCount"),
  targetProgress: document.querySelector("#targetProgress"),
  targetProgressFill: document.querySelector("#targetProgressFill"),
  targetProgressLabel: document.querySelector("#targetProgressLabel"),
  candidateBox: document.querySelector("#candidateBox"),
  confettiLayer: document.querySelector("#confettiLayer"),
  burstFlash: document.querySelector("#burstFlash"),
  candidateName: document.querySelector("#candidateName"),
  candidatePrefecture: document.querySelector("#candidatePrefecture"),
  candidatePopulation: document.querySelector("#candidatePopulation"),
  hitButton: document.querySelector("#hitButton"),
  standButton: document.querySelector("#standButton"),
  myStatus: document.querySelector("#myStatus"),
  myHistoryList: document.querySelector("#myHistoryList"),
  drawProfileText: document.querySelector("#drawProfileText"),
  gameStartIntro: document.querySelector("#gameStartIntro"),
  gameStartIntroRule: document.querySelector("#gameStartIntroRule"),
  gameStartIntroProfile: document.querySelector("#gameStartIntroProfile"),
  gameStartIntroStatus: document.querySelector("#gameStartIntroStatus"),
  gameStartIntroConfirmationList: document.querySelector("#gameStartIntroConfirmationList"),
  gameStartIntroOkButton: document.querySelector("#gameStartIntroOkButton"),
  playersList: document.querySelector("#playersList"),
  itemPanel: document.querySelector("#itemPanel"),
  itemName: document.querySelector("#itemName"),
  itemDescription: document.querySelector("#itemDescription"),
  useItemButton: document.querySelector("#useItemButton"),
  itemTargetPicker: document.querySelector("#itemTargetPicker"),
  itemTargetList: document.querySelector("#itemTargetList"),
  cancelItemTargetButton: document.querySelector("#cancelItemTargetButton"),
  battleCommentsList: document.querySelector("#battleCommentsList"),
  battleCommentInput: document.querySelector("#battleCommentInput"),
  battleCommentSendButton: document.querySelector("#battleCommentSendButton"),
  resultPanel: document.querySelector("#resultPanel"),
  resultTitle: document.querySelector("#resultTitle"),
  resultDetail: document.querySelector("#resultDetail"),
  resultRanking: document.querySelector("#resultRanking"),
  rematchButton: document.querySelector("#rematchButton"),
  rematchWaitingNote: document.querySelector("#rematchWaitingNote"),
  leaveRoomButton: document.querySelector("#leaveRoomButton"),
  shareResultButton: document.querySelector("#shareResultButton"),
  soundToggleButton: document.querySelector("#soundToggleButton"),
  shareView: document.querySelector("#shareView"),
  shareResultTitle: document.querySelector("#shareResultTitle"),
  shareResultTarget: document.querySelector("#shareResultTarget"),
  shareResultDetail: document.querySelector("#shareResultDetail"),
  shareResultRanking: document.querySelector("#shareResultRanking"),
  shareResultMessage: document.querySelector("#shareResultMessage"),
  sharePlayButton: document.querySelector("#sharePlayButton")
};

let db = null;
let appReady = false;
let currentRoomId = "";
let currentPlayerId = sessionStorage.getItem("populationBlackjackPlayerId") || crypto.randomUUID();
let unsubscribeRoom = null;
let cpuActionTimer = null;
let cpuActionKey = "";
let rouletteTimer = null;
let lastProfileRoomKey = "";
let lastResultKey = "";
let actionPending = false;
let gameStartIntroHideTimer = null;
let gameStartIntroVisible = false;
let lastProgressPlayerId = "";
let audioCtx = null;
let bgmGain = null;
let bgmScheduler = null;
let bgmNextStepAt = 0;
let bgmStep = 0;
let currentRoomStatus = "waiting";
let currentRoomCanPlay = false;
let commentPending = false;
let soundMuted = localStorage.getItem(SOUND_MUTED_KEY) === "1";
let shareResultTimeoutId = null;
const sharedResultId = new URLSearchParams(window.location.search).get("share");
const SHARE_RESULT_BUTTON_LABEL = els.shareResultButton?.textContent || "共有リンクをコピー";

sessionStorage.setItem("populationBlackjackPlayerId", currentPlayerId);
populateTargetSelects();
disableSetup(true);
updateSoundToggleButton();
if (sharedResultId) showShareView();
initializeFirebase();

els.selectCreateModeButton.addEventListener("click", () => showSetupMode("create"));
els.selectJoinModeButton.addEventListener("click", () => showSetupMode("join"));
els.selectCpuModeButton.addEventListener("click", () => showSetupMode("cpu"));
els.backFromCreateButton.addEventListener("click", () => showSetupMode("choice"));
els.backFromJoinButton.addEventListener("click", () => showSetupMode("choice"));
els.backFromCpuButton.addEventListener("click", () => showSetupMode("choice"));
els.createRoomButton.addEventListener("click", createRoom);
els.joinRoomButton.addEventListener("click", joinRoom);
els.startCpuRoomButton.addEventListener("click", startCpuRoom);
els.startGameButton.addEventListener("click", startGame);
els.readyButton.addEventListener("click", toggleReady);
els.gameStartIntroOkButton.addEventListener("click", confirmGameStart);
els.goHomeButton.addEventListener("click", goHome);
els.copyRoomCodeButton.addEventListener("click", copyRoomCode);
els.hitButton.addEventListener("click", hit);
els.standButton.addEventListener("click", stand);
els.useItemButton.addEventListener("click", () => {
  const itemDef = getItemDefinition(els.useItemButton.dataset.itemId);
  if (!itemDef) return;
  if (itemDef.requiresTarget) {
    els.itemTargetPicker.classList.remove("hidden");
  } else {
    useItem(null);
  }
});
els.cancelItemTargetButton.addEventListener("click", () => {
  els.itemTargetPicker.classList.add("hidden");
});
els.itemTargetList.addEventListener("click", (event) => {
  const row = event.target.closest(".item-target-row");
  if (!row) return;
  els.itemTargetPicker.classList.add("hidden");
  useItem(row.dataset.playerId);
});
els.rematchButton.addEventListener("click", rematchRoom);
els.leaveRoomButton.addEventListener("click", () => window.location.reload());
els.shareResultButton.addEventListener("click", copyShareLink);
els.sharePlayButton.addEventListener("click", () => {
  window.location.href = window.location.pathname;
});
els.soundToggleButton.addEventListener("click", toggleSound);
document.addEventListener("pointerdown", unlockAudio, { once: true });
els.battleCommentSendButton.addEventListener("click", sendBattleComment);
els.battleCommentInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.isComposing) return;
  event.preventDefault();
  sendBattleComment();
});

async function sendBattleComment() {
  const text = els.battleCommentInput.value.trim();
  if (!text || !db || !currentRoomId || commentPending) return;

  commentPending = true;
  els.battleCommentSendButton.disabled = true;

  try {
    const room = await getCurrentRoom();
    const me = room?.players?.[currentPlayerId];
    if (!me) return;

    const commentRef = push(ref(db, `rooms/${currentRoomId}/comments`));
    await set(commentRef, {
      playerId: currentPlayerId,
      text: text.slice(0, 80),
      createdAt: serverTimestamp()
    });

    els.battleCommentInput.value = "";
    els.battleCommentInput.focus();
  } catch (error) {
    els.myStatus.textContent = `コメント送信に失敗しました: ${error.message}`;
  } finally {
    commentPending = false;
    els.battleCommentSendButton.disabled = false;
  }
}

function renderBattleComments(room) {
  els.battleCommentsList.replaceChildren();

  const comments = Object.entries(room.comments || {})
    .map(([id, comment]) => ({ id, ...comment }))
    .filter((comment) => typeof comment.text === "string" && comment.text.trim())
    .sort((a, b) => {
      const aTime = Number.isFinite(a.createdAt) ? a.createdAt : 0;
      const bTime = Number.isFinite(b.createdAt) ? b.createdAt : 0;
      return aTime === bTime ? a.id.localeCompare(b.id) : aTime - bTime;
    })
    .slice(-MAX_BATTLE_COMMENTS);

  if (comments.length === 0) {
    const empty = document.createElement("p");
    empty.className = "battle-comments-empty";
    empty.textContent = "まだコメントはありません";
    els.battleCommentsList.append(empty);
    return;
  }

  for (const comment of comments) {
    const isMine = comment.playerId === currentPlayerId;
    const item = document.createElement("div");
    item.className = `battle-comment-item${isMine ? " mine" : ""}`;

    const meta = document.createElement("div");
    meta.className = "battle-comment-meta";

    const author = document.createElement("span");
    author.textContent = isMine
      ? "あなた"
      : room.players?.[comment.playerId]?.name || "参加者";

    const time = document.createElement("time");
    time.textContent = Number.isFinite(comment.createdAt)
      ? new Date(comment.createdAt).toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit"
        })
      : "送信中";

    const body = document.createElement("p");
    body.textContent = comment.text;

    meta.append(author, time);
    item.append(meta, body);
    els.battleCommentsList.append(item);
  }

  els.battleCommentsList.scrollTop = els.battleCommentsList.scrollHeight;
}

async function initializeFirebase() {
  try {
    const firebaseConfig = await loadFirebaseConfig();
    assertFirebaseConfig(firebaseConfig);
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    appReady = true;
    setSetupMessage("");
    disableSetup(false);
    if (sharedResultId) await loadSharedResult(sharedResultId);
  } catch (error) {
    setSetupMessage(error.message);
    disableSetup(true);
    if (sharedResultId) showShareError(error.message);
  }
}

async function createRoom() {
  if (!appReady) return;

  if (els.createTargetSelect.value === "random") {
    disableSetup(true);
    const target = await runTargetRoulette();
    disableSetup(false);
    await createRoomWithTarget(target);
    return;
  }

  await createRoomWithTarget(getSelectedTarget(els.createTargetSelect.value));
}

async function createRoomWithTarget(target) {
  await runSetupAction(async () => {
    const roomId = makeRoomId();
    const playerName = getPlayerName(els.playerNameInput, "Player 1");
    const player = makePlayer(playerName, "waiting", { type: "human" });

    await set(ref(db, `rooms/${roomId}`), {
      roomId,
      roomMode: "online",
      ...makeRoomTargetPayload(target),
      hideTarget: els.createHideTargetCheckbox.checked,
      itemMode: els.createItemModeCheckbox.checked,
      status: "waiting",
      maxPlayers: MAX_PLAYERS,
      turnIndex: null,
      turnAdvancing: false,
      playerOrder: [],
      startedPlayerIds: [],
      hostPlayerId: currentPlayerId,
      createdAt: serverTimestamp(),
      players: {
        [currentPlayerId]: player
      }
    });

    enterRoom(roomId);
  });
}

async function startCpuRoom() {
  if (!appReady) return;

  if (els.cpuTargetSelect.value !== "random") {
    await createCpuRoom(getSelectedTarget(els.cpuTargetSelect.value));
    return;
  }

  disableSetup(true);
  const target = await runTargetRoulette();
  disableSetup(false);
  await createCpuRoom(target);
}

async function createCpuRoom(selectedTarget = null) {
  if (!appReady) return;

  await runSetupAction(async () => {
    const roomId = makeRoomId();
    const target = selectedTarget || getSelectedCpuTarget();
    const cpuCount = getCpuCount();
    const cpuProfiles = makeCpuProfiles(cpuCount);
    const cpuPlayerIds = cpuProfiles.map((_, index) => `cpu_${index + 1}`);
    const playerOrder = [currentPlayerId, ...cpuPlayerIds];
    const itemMode = els.cpuItemModeCheckbox.checked;
    const players = {
      [currentPlayerId]: makePlayer(getCpuPlayerName(), "active", {
        type: "human",
        item: itemMode ? assignRandomItem() : null
      })
    };

    for (const [index, cpuId] of cpuPlayerIds.entries()) {
      const profile = cpuProfiles[index];
      players[cpuId] = makePlayer(`CPU ${index + 1}`, "active", {
        type: "cpu",
        difficulty: profile.difficulty,
        accuracy: profile.accuracy
      });
    }

    players[playerOrder[0]].candidate = pickCandidate(players[playerOrder[0]].drawn || {}, target.value, 0, 0);

    await set(ref(db, `rooms/${roomId}`), {
      roomId,
      roomMode: "cpu",
      ...makeRoomTargetPayload(target),
      hideTarget: els.cpuHideTargetCheckbox.checked,
      itemMode,
      status: "playing",
      startConfirmationRequired: true,
      startConfirmations: null,
      maxPlayers: MAX_PLAYERS,
      turnIndex: 0,
      turnAdvancing: false,
      playerOrder,
      startedPlayerIds: playerOrder,
      hostPlayerId: currentPlayerId,
      createdAt: serverTimestamp(),
      startedAt: serverTimestamp(),
      players
    });

    enterRoom(roomId);
  });
}

async function joinRoom() {
  if (!appReady) return;

  await runSetupAction(async () => {
    const roomId = normalizeRoomId(els.roomIdInput.value);
    if (!roomId) {
      setSetupMessage("参加する部屋IDを入力してください。");
      return;
    }

    const roomSnapshot = await get(ref(db, `rooms/${roomId}`));
    if (!roomSnapshot.exists()) {
      setSetupMessage("部屋が見つかりません。部屋IDを確認してください。");
      return;
    }

    const room = roomSnapshot.val();
    const players = room.players || {};
    const playerIds = Object.keys(players);
    if (room.status !== "waiting" && !players[currentPlayerId]) {
      setSetupMessage("この部屋はすでにゲーム開始済みです。");
      return;
    }
    if (players[currentPlayerId] && room.status !== "waiting") {
      enterRoom(roomId);
      return;
    }
    if (!players[currentPlayerId] && playerIds.length >= MAX_PLAYERS) {
      setSetupMessage(`この部屋はすでに${MAX_PLAYERS}人そろっています。`);
      return;
    }

    const defaultName = `Player ${Math.min(playerIds.length + 1, MAX_PLAYERS)}`;
    await update(ref(db, `rooms/${roomId}/players/${currentPlayerId}`), makePlayer(getPlayerName(els.joinPlayerNameInput, defaultName), "waiting", { type: "human" }));
    enterRoom(roomId);
  });
}

function enterRoom(roomId) {
  currentRoomId = roomId;
  els.roomCode.textContent = roomId;
  els.roomIdInput.value = roomId;
  document.body.classList.add("in-room");
  els.setupView.classList.add("hidden");
  els.gameView.classList.remove("hidden");
  setSetupMessage("");

  if (unsubscribeRoom) unsubscribeRoom();
  unsubscribeRoom = onValue(ref(db, `rooms/${roomId}`), (snapshot) => {
    if (!snapshot.exists()) {
      window.location.reload();
      return;
    }
    renderRoom(snapshot.val());
  });
}

async function startGame() {
  await runGameAction(async () => {
    const room = await getCurrentRoom();
    if (!room || room.hostPlayerId !== currentPlayerId) return;

    const players = room.players || {};
    const playerOrder = getPlayerOrder({ ...room, players });
    if (playerOrder.length < MIN_PLAYERS) {
      els.myStatus.textContent = `${MIN_PLAYERS}人以上そろうと開始できます。`;
      return;
    }
    if (!playerOrder.every((playerId) => players[playerId]?.ready)) {
      els.myStatus.textContent = "全員が「準備OK」を押すと開始できます。";
      return;
    }

    const updates = {
      status: "playing",
      startConfirmationRequired: true,
      startConfirmations: null,
      startedAt: serverTimestamp(),
      turnIndex: 0,
      playerOrder,
      startedPlayerIds: playerOrder
    };
    for (const playerId of playerOrder) {
      updates[`players/${playerId}/status`] = "active";
      if (room.itemMode && players[playerId]?.type === "human") {
        updates[`players/${playerId}/item`] = assignRandomItem();
      }
    }
    updates[`players/${playerOrder[0]}/candidate`] = pickCandidate(players[playerOrder[0]].drawn || {}, getRoomTarget(room).value, 0, 0);

    await update(ref(db, `rooms/${currentRoomId}`), updates);
  });
}

async function goHome() {
  const roomId = currentRoomId;
  if (!roomId) {
    window.location.reload();
    return;
  }

  els.goHomeButton.disabled = true;
  try {
    const room = await getCurrentRoom();
    if (room && room.hostPlayerId === currentPlayerId) {
      await remove(ref(db, `rooms/${roomId}`));
    } else {
      await remove(ref(db, `rooms/${roomId}/players/${currentPlayerId}`));
    }
  } finally {
    window.location.reload();
  }
}

let copyRoomCodeTimeoutId = null;

async function copyRoomCode() {
  if (!currentRoomId || !navigator.clipboard) return;

  try {
    await navigator.clipboard.writeText(currentRoomId);
  } catch (error) {
    return;
  }

  els.copyRoomCodeButton.classList.add("copied");
  els.copyRoomCodeButton.querySelector(".icon-copy").classList.add("hidden");
  els.copyRoomCodeButton.querySelector(".icon-check").classList.remove("hidden");

  if (copyRoomCodeTimeoutId) clearTimeout(copyRoomCodeTimeoutId);
  copyRoomCodeTimeoutId = setTimeout(() => {
    els.copyRoomCodeButton.classList.remove("copied");
    els.copyRoomCodeButton.querySelector(".icon-copy").classList.remove("hidden");
    els.copyRoomCodeButton.querySelector(".icon-check").classList.add("hidden");
  }, 1500);
}

async function copyShareLink() {
  const shareId = els.resultPanel.dataset.shareId;
  if (!shareId || !navigator.clipboard) return;

  const url = `${window.location.origin}${window.location.pathname}?share=${encodeURIComponent(shareId)}`;

  try {
    await navigator.clipboard.writeText(url);
  } catch (error) {
    return;
  }

  els.shareResultButton.textContent = "コピーしました！";

  if (shareResultTimeoutId) clearTimeout(shareResultTimeoutId);
  shareResultTimeoutId = setTimeout(() => {
    els.shareResultButton.textContent = SHARE_RESULT_BUTTON_LABEL;
  }, 1500);
}

async function hit() {
  if (actionPending) return;
  actionPending = true;
  try {
    await runGameAction(async () => {
      const room = await getCurrentRoom();
      if (!room || !canTakeTurn(room, currentPlayerId)) return;

      await applyPlayerAction(room, currentPlayerId, "hit");
    });
  } finally {
    actionPending = false;
  }
}

async function stand() {
  if (actionPending) return;
  actionPending = true;
  try {
    await runGameAction(async () => {
      const room = await getCurrentRoom();
      if (!room || !canTakeTurn(room, currentPlayerId)) return;

      await applyPlayerAction(room, currentPlayerId, "stand");
    });
  } finally {
    actionPending = false;
  }
}

async function useItem(targetPlayerId) {
  if (actionPending) return;
  actionPending = true;
  try {
    await runGameAction(async () => {
      const room = await getCurrentRoom();
      if (!room || !canTakeTurn(room, currentPlayerId)) return;

      await applyItemAction(room, currentPlayerId, targetPlayerId || null);
    });
  } finally {
    actionPending = false;
  }
}

async function rematchRoom() {
  await runGameAction(async () => {
    const room = await getCurrentRoom();
    if (!room || room.status !== "finished" || room.hostPlayerId !== currentPlayerId) return;

    const target = getRoomTarget(room);
    const playerOrder = getPlayerOrder(room);
    const updates = {
      status: "playing",
      startConfirmationRequired: true,
      startConfirmations: null,
      result: null,
      turnIndex: 0,
      turnAdvancing: false,
      playerOrder,
      startedPlayerIds: playerOrder,
      startedAt: serverTimestamp(),
      finishedAt: null
    };

    playerOrder.forEach((playerId, index) => {
      const player = room.players?.[playerId];
      Object.assign(updates, prefixPlayerUpdate(playerId, {
        total: 0,
        hitCount: 0,
        status: "active",
        drawn: {},
        history: [],
        lastRevealed: null,
        lastAction: null,
        shieldActive: false,
        item: room.itemMode && player?.type === "human" ? assignRandomItem() : null,
        candidate: index === 0 ? pickCandidate({}, target.value, 0, 0) : null
      }));
    });

    await update(ref(db, `rooms/${currentRoomId}`), updates);
  });
}

async function applyPlayerAction(room, playerId, action) {
  const player = room.players?.[playerId];
  if (!player || !canPlay(player) || getCurrentTurnPlayerId(room) !== playerId || room.turnAdvancing) return;

  const payload = action === "hit" ? buildHitPayload(room, player) : buildStandPayload();
  const nextPlayers = { ...(room.players || {}), [playerId]: { ...player, ...payload } };
  const revealUpdates = prefixPlayerUpdate(playerId, payload);
  revealUpdates.turnAdvancing = true;

  await update(ref(db, `rooms/${currentRoomId}`), revealUpdates);
  triggerImmediateEffect(action);

  // Let the population bar visibly crawl up to (or past) the target before
  // the bust/just effect fires, instead of flashing the result instantly.
  if (action === "hit") await wait(BAR_FILL_MS);
  triggerOutcomeEffect(payload.status);

  const progressUpdates = buildRoomProgressUpdates({ ...room, players: nextPlayers }, playerId);
  progressUpdates.turnAdvancing = false;
  const shareSnapshot = progressUpdates.shareSnapshot;
  delete progressUpdates.shareSnapshot;

  await wait(getPostEffectDelay(action, payload.status));
  await update(ref(db, `rooms/${currentRoomId}`), progressUpdates);
  if (shareSnapshot) {
    await set(ref(db, `results/${progressUpdates.shareId}`), shareSnapshot);
  }
}

async function applyItemAction(room, playerId, targetPlayerId) {
  const player = room.players?.[playerId];
  if (!player || !canPlay(player) || getCurrentTurnPlayerId(room) !== playerId || room.turnAdvancing) return;
  if (!player.item || player.item.used) return;

  const effectUpdates = buildItemEffectUpdates(room, playerId, targetPlayerId);
  if (!effectUpdates) return;

  effectUpdates.turnAdvancing = true;
  await update(ref(db, `rooms/${currentRoomId}`), effectUpdates);
  playSfx("tick");
  await wait(BAR_FILL_MS);

  const freshRoom = await getCurrentRoom();
  if (!freshRoom) return;

  const progressUpdates = buildRoomProgressUpdates(freshRoom, playerId);
  progressUpdates.turnAdvancing = false;
  const shareSnapshot = progressUpdates.shareSnapshot;
  delete progressUpdates.shareSnapshot;

  await wait(400);
  await update(ref(db, `rooms/${currentRoomId}`), progressUpdates);
  if (shareSnapshot) {
    await set(ref(db, `results/${progressUpdates.shareId}`), shareSnapshot);
  }
}

// アイテムIDごとに効果を計算し、players/{id}/... 形式のフラットな更新オブジェクトを返す。
// 複数プレイヤーにまたがる効果（対象への攻撃、全員リセット）もこの1オブジェクトにまとめて
// 1回のupdate()で送る。
function buildItemEffectUpdates(room, playerId, targetPlayerId) {
  const player = room.players?.[playerId];
  if (!player || !player.item || player.item.used) return null;

  const itemDef = getItemDefinition(player.item.id);
  if (!itemDef) return null;

  const targetPlayer = targetPlayerId ? room.players?.[targetPlayerId] : null;
  if (itemDef.requiresTarget && (!targetPlayerId || !targetPlayer || targetPlayerId === playerId)) return null;

  const target = getRoomTarget(room).value;
  const updates = {};
  updates[`players/${playerId}/item`] = { id: itemDef.id, used: true };

  switch (itemDef.id) {
    case "card-swap": {
      updates[`players/${playerId}/candidate`] = pickCandidate(player.drawn || {}, target, player.total || 0, player.hitCount || 0);
      break;
    }
    case "small-boost": {
      applyPlayerFieldUpdates(updates, playerId, resolveTotalChange(room, player, (player.total || 0) + 3000));
      break;
    }
    case "target-boost-5pct": {
      applyPlayerFieldUpdates(updates, playerId, resolveTotalChange(room, player, (player.total || 0) + Math.round(target * 0.05)));
      break;
    }
    case "shield": {
      updates[`players/${playerId}/shieldActive`] = true;
      break;
    }
    case "steal-10pct": {
      const amount = Math.round((targetPlayer.total || 0) * 0.1);
      applyPlayerFieldUpdates(updates, targetPlayerId, resolveTotalChange(room, targetPlayer, (targetPlayer.total || 0) - amount));
      break;
    }
    case "swap-totals": {
      applyPlayerFieldUpdates(updates, playerId, resolveTotalChange(room, player, targetPlayer.total || 0));
      applyPlayerFieldUpdates(updates, targetPlayerId, resolveTotalChange(room, targetPlayer, player.total || 0));
      break;
    }
    case "force-plus-10k": {
      applyPlayerFieldUpdates(updates, targetPlayerId, resolveTotalChange(room, targetPlayer, (targetPlayer.total || 0) + 10000));
      break;
    }
    case "force-plus-30k": {
      applyPlayerFieldUpdates(updates, targetPlayerId, resolveTotalChange(room, targetPlayer, (targetPlayer.total || 0) + 30000));
      break;
    }
    case "reset-all": {
      for (const id of getStartedPlayerIds(room)) {
        const activePlayer = room.players?.[id];
        if (!activePlayer || activePlayer.status !== "active") continue;
        updates[`players/${id}/total`] = 0;
        updates[`players/${id}/hitCount`] = 0;
        updates[`players/${id}/drawn`] = {};
        updates[`players/${id}/history`] = [];
        updates[`players/${id}/lastRevealed`] = null;
      }
      break;
    }
    default:
      return null;
  }

  updates[`players/${playerId}/lastAction`] = targetPlayer
    ? { type: "item", itemId: itemDef.id, itemLabel: itemDef.label, targetName: targetPlayer.name || "参加者" }
    : { type: "item", itemId: itemDef.id, itemLabel: itemDef.label };

  return updates;
}

// アイテムで人口が変化した結果、BUST/JUSTになるかを判定する。シールド発動中なら
// BUSTを1回だけ無効化し、発動前の人口に据え置く。すでに終了しているプレイヤーの
// 状態は上書きしない（bustした人を蒸し返さない）が、active/standのプレイヤーは
// 攻撃アイテムで新たにbust/justへ転じうる。
function resolveTotalChange(room, player, nextTotal) {
  const target = getRoomTarget(room).value;
  const clampedTotal = Math.max(0, nextTotal);
  const canTransition = player.status === "active" || player.status === "stand";
  const hasShield = player.item?.id === "shield" && player.shieldActive;

  if (clampedTotal > target && hasShield && canTransition) {
    return { total: player.total || 0, shieldActive: false };
  }

  const result = { total: clampedTotal };
  if (canTransition) {
    if (clampedTotal > target) {
      result.status = "bust";
      result.finishedAt = serverTimestamp();
    } else if (clampedTotal === target) {
      result.status = "just";
      result.finishedAt = serverTimestamp();
    }
  }
  return result;
}

function applyPlayerFieldUpdates(updates, playerId, fields) {
  for (const [key, value] of Object.entries(fields)) {
    updates[`players/${playerId}/${key}`] = value;
  }
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getPostEffectDelay(action, status) {
  if (status === "bust") return 1300;
  if (status === "just") return 1400;
  return action === "hit" ? 600 : 900;
}

function buildHitPayload(room, player) {
  const roomTarget = getRoomTarget(room);
  const candidate = player.candidate || pickCandidate(player.drawn || {}, roomTarget.value, player.total || 0, player.hitCount || 0);
  const nextTotal = (player.total || 0) + candidate.population;
  const target = roomTarget.value;

  if (nextTotal > target && player.shieldActive) {
    return {
      status: "stand",
      shieldActive: false,
      candidate: null,
      hitCount: (player.hitCount || 0) + 1,
      lastAction: {
        type: "shield-block",
        municipality: candidate.name,
        prefecture: candidate.prefecture,
        population: candidate.population
      },
      finishedAt: serverTimestamp()
    };
  }

  const drawn = { ...(player.drawn || {}), [candidate.id]: true };
  const status = nextTotal > target ? "bust" : nextTotal === target ? "just" : "active";
  const historyItem = {
    id: candidate.id,
    name: candidate.name,
    prefecture: candidate.prefecture,
    population: candidate.population,
    totalAfter: nextTotal
  };
  const payload = {
    total: nextTotal,
    hitCount: (player.hitCount || 0) + 1,
    status,
    drawn,
    history: [...(player.history || []), historyItem],
    lastRevealed: candidate,
    lastAction: {
      type: "hit",
      municipality: candidate.name,
      prefecture: candidate.prefecture,
      population: candidate.population,
      totalAfter: nextTotal,
      status
    },
    updatedAt: serverTimestamp()
  };

  payload.candidate = null;
  if (status !== "active") {
    payload.finishedAt = serverTimestamp();
  }

  return payload;
}

function buildStandPayload() {
  return {
    status: "stand",
    candidate: null,
    lastAction: {
      type: "stand"
    },
    finishedAt: serverTimestamp()
  };
}

async function finishRoomIfNeeded() {
  const room = await getCurrentRoom();
  if (!room || room.status === "finished") return;

  const playerIds = getStartedPlayerIds(room);
  const players = playerIds.map((id) => [id, room.players?.[id]]).filter(([, player]) => player);
  if (players.length < MIN_PLAYERS || !players.every(([, player]) => isFinished(player.status))) return;

  const result = judge(players, getRoomTarget(room).value);
  const { shareId, snapshot } = buildResultSnapshot(room, result);

  await update(ref(db, `rooms/${currentRoomId}`), {
    status: "finished",
    result,
    shareId,
    finishedAt: serverTimestamp()
  });
  await set(ref(db, `results/${shareId}`), snapshot);
}

function renderRoom(room) {
  currentRoomStatus = room.status || "waiting";
  currentRoomCanPlay = room.status === "playing" && areGameStartConfirmationsComplete(room);
  syncBgm();
  const players = room.players || {};
  const playerIds = getDisplayPlayerIds(room);
  const me = players[currentPlayerId];
  const isHost = room.hostPlayerId === currentPlayerId;
  const turnPlayerId = getCurrentTurnPlayerId(room);
  const turnPlayer = players[turnPlayerId];
  const target = getRoomTarget(room);
  const isMyTurn = canTakeTurn(room, currentPlayerId);
  const isPlaying = room.status === "playing";
  const focusPlayer = isPlaying && turnPlayer ? turnPlayer : me;
  const focusPlayerId = isPlaying && turnPlayer ? turnPlayerId : currentPlayerId;
  const focusLabel = focusPlayerId === currentPlayerId ? "あなた" : focusPlayer?.name || "参加者";

  const hideTarget = isTargetHidden(room);
  const targetDisplay = hideTarget ? "？？？？？？人" : `${formatNumber(target.value)}人`;

  const isStartConfirming = room.status === "playing" && !areGameStartConfirmationsComplete(room);
  els.roomState.textContent = room.status === "finished" ? "終了" : isStartConfirming ? "開始確認中" : room.status === "playing" ? "ゲーム開始" : "待機中";
  els.capacityLabel.textContent = room.status === "waiting" ? `${playerIds.length}人参加中` : `${playerIds.length}人プレイ`;
  els.turnLabel.textContent = isStartConfirming
    ? "全員のOK待ち"
    : room.status === "playing"
      ? (room.turnAdvancing ? "結果確認中" : `${turnPlayer?.name || "不明"}さんの番`)
      : "開始前";
  els.turnBanner.textContent = isStartConfirming
    ? `全員のOK待ち / TARGET ${targetDisplay}`
    : room.status === "playing"
      ? room.turnAdvancing
        ? `${turnPlayer?.name || "不明"}さんの結果を確認中… / TARGET ${targetDisplay}`
        : `${turnPlayer?.name || "不明"}さんのターン / TARGET ${targetDisplay}`
      : `ゲーム開始前 / TARGET ${targetDisplay}`;
  els.roomCodeLabel.textContent = room.status === "waiting" ? "部屋ID" : "共有用 部屋ID";
  els.roomCode.classList.toggle("compact", room.status !== "waiting");
  els.roomPanel.classList.toggle("hidden", room.status !== "waiting");
  els.gameView.classList.toggle("my-turn", isMyTurn);
  els.gameView.classList.toggle("other-turn", isPlaying && !isMyTurn);
  renderDrawProfileNotice(room, target);

  const isWaiting = room.status === "waiting";
  const enoughPlayers = playerIds.length >= MIN_PLAYERS;
  const readyCount = playerIds.filter((id) => players[id]?.ready).length;
  const allReady = playerIds.length > 0 && readyCount === playerIds.length;

  els.startGameButton.classList.toggle("hidden", !(isHost && isWaiting && enoughPlayers));
  els.startGameButton.disabled = !allReady;

  els.readyButton.classList.toggle("hidden", !isWaiting);
  if (isWaiting && me) {
    els.readyButton.textContent = me.ready ? "準備OK済み（取り消す）" : "準備OK";
    els.readyButton.classList.toggle("secondary", !me.ready);
  }

  els.readyStatusText.textContent = !isWaiting
    ? "-"
    : !enoughPlayers
      ? `${MIN_PLAYERS}人以上で開始できます`
      : allReady
        ? "全員の準備が完了しました"
        : `${readyCount} / ${playerIds.length}人がOK`;

  if (room.status !== "finished" && !room.turnAdvancing && playerIds.length >= MIN_PLAYERS && playerIds.every((id) => isFinished(players[id].status))) {
    finishRoomIfNeeded();
  }

  if (!me) return;

  els.totalLabel.textContent = `${focusLabel}の現在人口`;
  els.hitCountLabel.textContent = `${focusLabel}のHIT回数`;
  els.myTotal.textContent = formatNumber(focusPlayer?.total || 0);
  els.myHitCount.textContent = formatNumber(focusPlayer?.hitCount || 0);
  els.myStatus.textContent = buildMyStatus(me, room);

  const candidate = focusPlayer?.candidate;
  const isCandidateMasked = Boolean(candidate && canPlay(focusPlayer) && room.status === "playing");
  if (isCandidateMasked) {
    els.candidateName.textContent = candidate.name;
    els.candidatePrefecture.textContent = `${focusLabel}の候補 / ${candidate.prefecture}`;
    els.candidatePopulation.textContent = focusPlayerId === currentPlayerId ? "人口：?????" : "選択待ち";
  } else if (focusPlayer?.lastRevealed) {
    els.candidateName.textContent = focusPlayer.lastRevealed.name;
    els.candidatePrefecture.textContent = `${focusPlayer.lastRevealed.prefecture} / ${formatNumber(focusPlayer.lastRevealed.population)}人`;
    els.candidatePopulation.textContent = canPlay(focusPlayer) ? "HIT！" : "終了";
  } else {
    els.candidateName.textContent = room.status === "waiting" ? "待機中" : "候補なし";
    els.candidatePrefecture.textContent = playerIds.length < MIN_PLAYERS ? "参加者を待っています" : "ホストがゲームを開始します";
    els.candidatePopulation.textContent = "人口：?????";
  }

  const revealCategory = isCandidateMasked
    ? candidate.category
    : focusPlayer?.lastRevealed
      ? focusPlayer.lastRevealed.category
      : null;
  updateCandidateCard(revealCategory, isCandidateMasked);
  updateTargetProgress(room, focusPlayer, target, focusPlayerId);

  els.hitButton.disabled = !canTakeTurn(room, currentPlayerId);
  els.standButton.disabled = !canTakeTurn(room, currentPlayerId);

  renderHistory(focusPlayer, focusLabel);
  renderItemPanel(room, me);
  renderItemTargetOptions(players, playerIds);
  renderPlayersList(room, players, playerIds);
  renderBattleComments(room);

  renderResult(room, players);
  document.body.classList.toggle("modal-open", (room.status === "finished" && Boolean(room.result)) || gameStartIntroVisible);
  scheduleCpuTurn(room);
}

function renderItemPanel(room, me) {
  if (!els.itemPanel) return;

  const item = me?.item;
  const itemDef = item ? getItemDefinition(item.id) : null;
  const shouldShow = Boolean(room.itemMode && itemDef && !item.used);

  els.itemPanel.classList.toggle("hidden", !shouldShow);
  if (!shouldShow) {
    els.itemTargetPicker.classList.add("hidden");
    return;
  }

  const isMyTurn = canTakeTurn(room, currentPlayerId);
  els.itemName.textContent = `${itemDef.label}（${itemDef.rarity}）`;
  els.itemDescription.textContent = itemDef.description;
  els.useItemButton.disabled = !isMyTurn;
  els.useItemButton.dataset.itemId = itemDef.id;

  if (!isMyTurn) els.itemTargetPicker.classList.add("hidden");
}

function renderItemTargetOptions(players, playerIds) {
  if (!els.itemTargetList) return;
  els.itemTargetList.innerHTML = "";

  for (const playerId of playerIds) {
    if (playerId === currentPlayerId) continue;
    const player = players[playerId];
    if (!player) continue;

    const row = document.createElement("button");
    row.type = "button";
    row.className = "item-target-row";
    row.dataset.playerId = playerId;
    row.textContent = `${player.name || "参加者"}（${formatNumber(player.total || 0)}人 / ${statusLabels[player.status] || "待機中"}）`;
    els.itemTargetList.append(row);
  }
}

function renderResult(room, players) {
  const shouldShow = room.status === "finished" && room.result;
  els.resultPanel.classList.toggle("hidden", !shouldShow);
  els.resultPanel.classList.remove("win", "lose");
  const isHost = room.hostPlayerId === currentPlayerId;
  els.rematchButton.classList.toggle("hidden", !(shouldShow && isHost));
  els.rematchWaitingNote.classList.toggle("hidden", !(shouldShow && !isHost));
  els.resultPanel.dataset.shareId = shouldShow ? room.shareId || "" : "";
  els.shareResultButton.disabled = !shouldShow || !room.shareId;
  if (!shouldShow) {
    lastResultKey = "";
    return;
  }

  const result = room.result;
  const winnerIds = result.winnerPlayerIds || (result.winnerPlayerId && result.winnerPlayerId !== "draw" ? [result.winnerPlayerId] : []);
  let outcome = "draw";

  if (winnerIds.length === 0) {
    els.resultTitle.textContent = "DRAW";
  } else if (winnerIds.includes(currentPlayerId)) {
    els.resultTitle.textContent = "WIN";
    els.resultPanel.classList.add("win");
    outcome = "win";
  } else {
    els.resultTitle.textContent = "LOSE";
    els.resultPanel.classList.add("lose");
    outcome = "lose";
  }

  const reason = result.reason || "TARGETとの差で判定しました。";
  els.resultDetail.textContent = isTargetHidden(room)
    ? `${reason}（TARGETは${formatNumber(getRoomTarget(room).value)}人でした）`
    : reason;
  renderResultRanking(room, players, result, winnerIds);

  const resultKey = `${room.roomId}:${room.finishedAt || result.decidedAt || ""}`;
  if (resultKey !== lastResultKey) {
    lastResultKey = resultKey;
    playSfx(outcome);
    if (outcome === "win") spawnConfetti(els.resultPanel);
  }
}

function renderResultRanking(room, players, result, winnerIds) {
  if (!els.resultRanking) return;
  els.resultRanking.innerHTML = "";
  const target = getRoomTarget(room).value;
  const ids = result.playerIds || getDisplayPlayerIds(room);
  const rows = ids
    .map((id) => ({ id, player: players[id], diff: Math.abs(target - (players[id]?.total || 0)) }))
    .filter((row) => row.player);

  rows.sort((a, b) => {
    const aBust = a.player.status === "bust";
    const bBust = b.player.status === "bust";
    if (aBust !== bBust) return aBust ? 1 : -1;
    return a.diff - b.diff;
  });

  rows.forEach((row, index) => {
    const item = document.createElement("div");
    item.className = "result-row";
    if (row.id === currentPlayerId) item.classList.add("me");
    if (winnerIds.includes(row.id)) item.classList.add("winner");

    const rank = document.createElement("span");
    rank.className = "result-rank";
    rank.textContent = winnerIds.includes(row.id) ? "🏆" : `${index + 1}位`;

    const name = document.createElement("strong");
    name.textContent = row.id === currentPlayerId ? "あなた" : row.player.name || "参加者";

    const detail = document.createElement("span");
    detail.textContent = `${formatNumber(row.player.total || 0)}人（${statusLabels[row.player.status] || "待機中"} / 差${formatNumber(row.diff)}人）`;

    item.append(rank, name, detail);
    els.resultRanking.append(item);
  });
}

function showShareView() {
  els.setupView.classList.add("hidden");
  els.gameView.classList.add("hidden");
  els.shareView.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

async function loadSharedResult(shareId) {
  try {
    const snapshot = await get(ref(db, `results/${shareId}`));
    if (!snapshot.exists()) {
      showShareError("この結果は見つかりませんでした。リンクが正しいかご確認ください。");
      return;
    }
    renderSharedResult(snapshot.val());
  } catch (error) {
    showShareError(`結果の読み込みに失敗しました: ${error.message}`);
  }
}

function showShareError(message) {
  els.shareResultTitle.textContent = "結果を表示できません";
  els.shareResultTarget.textContent = "";
  els.shareResultDetail.textContent = "";
  els.shareResultRanking.innerHTML = "";
  els.shareResultMessage.textContent = message;
  els.shareResultMessage.classList.remove("hidden");
}

function renderSharedResult(data) {
  els.shareResultMessage.classList.add("hidden");
  els.shareResultTitle.textContent = "RESULT";

  const target = data.target || {};
  els.shareResultTarget.textContent = `TARGET：${target.label || "不明"} ${formatNumber(target.value || 0)}人`;
  els.shareResultDetail.textContent = data.reason || "";

  els.shareResultRanking.innerHTML = "";
  const players = Array.isArray(data.players) ? data.players : [];
  players.forEach((player) => {
    const item = document.createElement("div");
    item.className = "result-row";
    if (player.isWinner) item.classList.add("winner");

    const rank = document.createElement("span");
    rank.className = "result-rank";
    rank.textContent = player.isWinner ? "🏆" : `${player.rank}位`;

    const name = document.createElement("strong");
    name.textContent = player.name || "参加者";

    const detail = document.createElement("span");
    detail.textContent = `${formatNumber(player.total || 0)}人（${statusLabels[player.status] || "終了"} / 差${formatNumber(player.diff || 0)}人）`;

    item.append(rank, name, detail);
    els.shareResultRanking.append(item);
  });
}

function renderPlayersList(room, players, playerIds) {
  els.playersList.innerHTML = "";
  const turnPlayerId = getCurrentTurnPlayerId(room);

  for (const playerId of playerIds) {
    const player = players[playerId];
    if (!player) continue;

    const item = document.createElement("div");
    item.className = "player-row";
    if (playerId === currentPlayerId) item.classList.add("me");
    if (playerId === turnPlayerId && room.status === "playing") item.classList.add("current-turn");

    const title = document.createElement("strong");
    const playerBadges = [];
    if (playerId === currentPlayerId) playerBadges.push("あなた");
    if (player.type === "cpu") playerBadges.push("CPU");
    if (playerId === turnPlayerId && room.status === "playing") playerBadges.push("TURN");
    if (room.itemMode && player.item && !player.item.used) playerBadges.push("ITEM");
    if (room.status === "waiting") playerBadges.push(player.ready ? "OK" : "未確認");
    title.textContent = `${player.name || "参加者"}${playerBadges.length > 0 ? `（${playerBadges.join(" / ")}）` : ""}`;

    const meta = document.createElement("span");
    meta.textContent =
      `${formatNumber(player.total || 0)}人 / ` +
      `${statusLabels[player.status] || "待機中"} / ` +
      `HIT ${formatNumber(player.hitCount || 0)}回`;

    const action = document.createElement("span");
    action.className = "last-action";
    action.textContent = buildLastActionText(player);

    item.append(title, meta, action);
    els.playersList.append(item);
  }
}

function renderHistory(player, label) {
  els.myHistoryList.innerHTML = "";
  const history = player?.history || [];
  if (history.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-history";
    empty.textContent = `${label}はまだHITしていません。`;
    els.myHistoryList.append(empty);
    return;
  }

  for (const [index, item] of history.entries()) {
    const row = document.createElement("div");
    row.className = "history-row";

    const title = document.createElement("strong");
    title.textContent = `${index + 1}. ${item.prefecture} ${item.name}`;

    const detail = document.createElement("span");
    detail.textContent = `+${formatNumber(item.population)}人 → ${formatNumber(item.totalAfter)}人`;

    row.append(title, detail);
    els.myHistoryList.append(row);
  }
}

function flashEffectClass(effectClass) {
  els.gameView.classList.remove("action-hit", "action-stand", "action-bust", "action-just");
  void els.gameView.offsetWidth;
  els.gameView.classList.add(effectClass);
  window.setTimeout(() => {
    els.gameView.classList.remove(effectClass);
  }, 1200);
}

function triggerImmediateEffect(action) {
  flashEffectClass(action === "hit" ? "action-hit" : "action-stand");
  playSfx(action === "hit" ? "hit" : "stand");

  if (action === "hit" && els.candidatePopulation) {
    els.candidatePopulation.classList.remove("pop-flash");
    void els.candidatePopulation.offsetWidth;
    els.candidatePopulation.classList.add("pop-flash");
    window.setTimeout(() => {
      els.candidatePopulation.classList.remove("pop-flash");
    }, 500);
  }
}

function triggerOutcomeEffect(status) {
  if (status === "bust") {
    flashEffectClass("action-bust");
    playSfx("bust");
    triggerBustFlash();
  } else if (status === "just") {
    flashEffectClass("action-just");
    playSfx("just");
    spawnConfetti(els.candidateBox);
  }
}

function triggerBustFlash() {
  if (!els.burstFlash) return;
  document.body.classList.remove("bust-shake");
  els.burstFlash.classList.remove("show");
  void els.burstFlash.offsetWidth;
  document.body.classList.add("bust-shake");
  els.burstFlash.classList.add("show");
  window.setTimeout(() => {
    els.burstFlash.classList.remove("show");
    document.body.classList.remove("bust-shake");
  }, 800);
}

function updateCandidateCard(category, masked) {
  if (!els.candidateBox) return;
  els.candidateBox.classList.remove(...TIER_CLASSES);
  if (category && CATEGORY_LABELS[category]) {
    els.candidateBox.classList.add(`tier-${category}`);
    els.candidateBox.dataset.suit = CATEGORY_SUITS[category] || "";
  } else {
    els.candidateBox.dataset.suit = "";
  }
  els.candidateBox.classList.toggle("masked", masked);
}

function updateTargetProgress(room, player, target, playerId) {
  if (!els.targetProgress) return;
  const isPlaying = room.status === "playing";
  els.targetProgress.classList.toggle("hidden", !isPlaying);
  if (!isPlaying) {
    lastProgressPlayerId = "";
    return;
  }

  const targetValue = target?.value || 0;
  const total = player?.total || 0;
  const percent = targetValue > 0 ? Math.min(100, (total / targetValue) * 100) : 0;

  const playerChanged = playerId !== lastProgressPlayerId;
  lastProgressPlayerId = playerId;
  if (playerChanged) els.targetProgressFill.classList.add("no-transition");

  setPlayerColorClass(els.targetProgress, room, playerId);
  els.targetProgressFill.style.width = `${percent}%`;
  els.targetProgressLabel.textContent = isTargetHidden(room) ? "？" : `${Math.round(percent)}%`;
  els.targetProgress.classList.toggle("near", percent >= 85 && player?.status !== "bust");
  els.targetProgress.classList.toggle("over", player?.status === "bust");

  if (playerChanged) {
    void els.targetProgressFill.offsetWidth;
    els.targetProgressFill.classList.remove("no-transition");
  }
}

function setPlayerColorClass(el, room, playerId) {
  const order = getPlayerOrder(room);
  const index = Math.max(0, order.indexOf(playerId));
  for (let i = 0; i < PLAYER_COLOR_COUNT; i += 1) el.classList.remove(`player-${i}`);
  el.classList.add(`player-${index % PLAYER_COLOR_COUNT}`);
}

function isTargetHidden(room) {
  return Boolean(room.hideTarget);
}

function spawnConfetti(anchorEl) {
  if (!anchorEl || !els.confettiLayer) return;
  const rect = anchorEl.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const pieces = [];

  for (let i = 0; i < 18; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 90;
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${centerX}px`;
    piece.style.top = `${centerY}px`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * distance - 30}px`);
    piece.style.setProperty("--rot", `${Math.round(Math.random() * 360 - 180)}deg`);
    piece.style.setProperty("--delay", `${Math.round(Math.random() * 120)}ms`);
    els.confettiLayer.append(piece);
    pieces.push(piece);
  }

  window.setTimeout(() => {
    for (const piece of pieces) piece.remove();
  }, 1150);
}

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function unlockAudio() {
  if (soundMuted) return;
  try {
    const ctx = getAudioContext();
    if (ctx?.state === "suspended") void ctx.resume();
    syncBgm();
  } catch (error) {
    // Web Audioが使えない環境では無音でフォールバックする
  }
}

function scheduleBgmNote(ctx, destination, frequency, start, duration, volume, type = "sine") {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function scheduleBgmStep(ctx, step, start) {
  if (!bgmGain) return;

  if (step % 4 === 0) {
    const bassIndex = Math.floor(step / 4) % BGM_BASS_NOTES.length;
    scheduleBgmNote(ctx, bgmGain, BGM_BASS_NOTES[bassIndex], start, 0.82, 0.22, "sine");
  }

  if (step % 2 === 0) {
    const noteIndex = Math.floor(step / 2) % BGM_ARPEGGIO_NOTES.length;
    scheduleBgmNote(ctx, bgmGain, BGM_ARPEGGIO_NOTES[noteIndex], start, 0.42, 0.055, "triangle");
  }

  if (step === 6 || step === 14) {
    scheduleBgmNote(ctx, bgmGain, 880, start, 0.06, 0.018, "square");
  }
}

function runBgmScheduler() {
  if (!audioCtx || !bgmGain || soundMuted || !shouldPlayBgm()) return;
  while (bgmNextStepAt < audioCtx.currentTime + BGM_LOOKAHEAD_SECONDS) {
    scheduleBgmStep(audioCtx, bgmStep, bgmNextStepAt);
    bgmStep = (bgmStep + 1) % 16;
    bgmNextStepAt += BGM_STEP_SECONDS;
  }
}

function startBgm() {
  if (soundMuted || !shouldPlayBgm() || bgmScheduler) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  bgmGain = ctx.createGain();
  bgmGain.gain.setValueAtTime(BGM_MASTER_VOLUME, ctx.currentTime);
  bgmGain.connect(ctx.destination);
  bgmStep = 0;
  bgmNextStepAt = ctx.currentTime + 0.08;
  runBgmScheduler();
  bgmScheduler = window.setInterval(runBgmScheduler, 120);
}

function stopBgm() {
  if (bgmScheduler) window.clearInterval(bgmScheduler);
  bgmScheduler = null;
  if (bgmGain && audioCtx) {
    bgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
    bgmGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.08);
    const gainToDisconnect = bgmGain;
    window.setTimeout(() => gainToDisconnect.disconnect(), 500);
  }
  bgmGain = null;
}

function syncBgm() {
  if (!soundMuted && shouldPlayBgm()) startBgm();
  else stopBgm();
}

function shouldPlayBgm() {
  const isHomeVisible = !els.setupView.classList.contains("hidden");
  return !sharedResultId && (isHomeVisible || currentRoomCanPlay);
}

function playTone(ctx, { freq, start, duration, type = "sine", volume = 0.16 }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

function playSfx(name) {
  if (soundMuted) return;
  const notes = SFX_NOTES[name];
  if (!notes) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    for (const note of notes) playTone(ctx, note);
  } catch (error) {
    // Web Audioが使えない環境では無音でフォールバックする
  }
}

function toggleSound() {
  soundMuted = !soundMuted;
  localStorage.setItem(SOUND_MUTED_KEY, soundMuted ? "1" : "0");
  updateSoundToggleButton();
  if (!soundMuted) unlockAudio();
  syncBgm();
}

function updateSoundToggleButton() {
  els.soundToggleButton.textContent = soundMuted ? "🔇" : "🔊";
  els.soundToggleButton.setAttribute("aria-pressed", String(!soundMuted));
}

function buildLastActionText(player) {
  const action = player.lastAction;
  if (!action) {
    return player.status === "active" ? "まだ選択していません。" : "開始前";
  }
  if (action.type === "stand") return "直前：STAND";
  if (action.type === "hit") {
    const resultLabel = action.status === "bust" ? "BUST" : action.status === "just" ? "JUST" : "HIT";
    return `直前：${resultLabel} ${action.prefecture} ${action.municipality} +${formatNumber(action.population)}人`;
  }
  if (action.type === "shield-block") return `直前：シールド発動！BUSTを回避（${action.municipality}）`;
  if (action.type === "item") {
    return action.targetName
      ? `直前：アイテム『${action.itemLabel}』を${action.targetName}に使用`
      : `直前：アイテム『${action.itemLabel}』を使用`;
  }
  return "";
}

function scheduleCpuTurn(room) {
  const turnPlayerId = getCurrentTurnPlayerId(room);
  const turnPlayer = room.players?.[turnPlayerId];
  if (room.status !== "playing" || room.turnAdvancing || room.hostPlayerId !== currentPlayerId || turnPlayer?.type !== "cpu") {
    clearCpuAction();
    return;
  }

  const actionKey = `${room.roomId}:${turnPlayerId}:${turnPlayer.hitCount || 0}:${turnPlayer.total || 0}:${turnPlayer.status}`;
  if (cpuActionKey === actionKey) return;

  clearCpuAction();
  cpuActionKey = actionKey;
  cpuActionTimer = window.setTimeout(() => actCpuTurn(turnPlayerId, actionKey), CPU_THINK_DELAY_MS);
}

function clearCpuAction() {
  if (cpuActionTimer) {
    window.clearTimeout(cpuActionTimer);
    cpuActionTimer = null;
  }
  cpuActionKey = "";
}

async function actCpuTurn(cpuPlayerId, actionKey) {
  try {
    const room = await getCurrentRoom();
    const cpuPlayer = room?.players?.[cpuPlayerId];
    if (!room || room.status !== "playing" || room.hostPlayerId !== currentPlayerId || cpuPlayer?.type !== "cpu") return;
    if (getCurrentTurnPlayerId(room) !== cpuPlayerId || !canPlay(cpuPlayer)) return;

    const action = decideCpuAction(room, cpuPlayer);
    await applyPlayerAction(room, cpuPlayerId, action);
  } catch (error) {
    els.myStatus.textContent = formatFirebaseError(error);
  } finally {
    if (cpuActionKey === actionKey) {
      cpuActionTimer = null;
      cpuActionKey = "";
    }
  }
}

function decideCpuAction(room, cpuPlayer) {
  const idealAction = getIdealCpuAction(room, cpuPlayer);
  const accuracy = Number(cpuPlayer.accuracy || 0.5);
  if (Math.random() < accuracy) return idealAction;
  return idealAction === "hit" ? "stand" : "hit";
}

function getIdealCpuAction(room, cpuPlayer) {
  const target = getRoomTarget(room).value;
  const currentTotal = cpuPlayer.total || 0;
  const candidate = cpuPlayer.candidate || pickCandidate(cpuPlayer.drawn || {}, target, currentTotal, cpuPlayer.hitCount || 0);
  const nextTotal = currentTotal + candidate.population;
  const currentDiff = Math.abs(target - currentTotal);
  const nextDiff = Math.abs(target - nextTotal);

  if (nextTotal > target) return "stand";
  if (target - currentTotal <= 10000) return "stand";
  if (nextDiff < currentDiff) return "hit";
  return "stand";
}

function judge(players, target) {
  const normalized = players.map(([id, player]) => ({
    id,
    total: player.total || 0,
    status: player.status,
    diff: Math.abs(target - (player.total || 0)),
    busted: player.status === "bust",
    just: player.status === "just"
  }));
  const justPlayers = normalized.filter((player) => player.just);
  const livePlayers = normalized.filter((player) => !player.busted);
  let winnerPlayerIds = [];
  let reason = "全員BUSTのため引き分けです。";

  if (justPlayers.length > 0) {
    winnerPlayerIds = justPlayers.map((player) => player.id);
    reason = justPlayers.length === 1 ? "JUSTしたプレイヤーの勝利です。" : "複数人がJUSTしたため引き分けです。";
  } else if (livePlayers.length > 0) {
    const bestDiff = Math.min(...livePlayers.map((player) => player.diff));
    winnerPlayerIds = livePlayers.filter((player) => player.diff === bestDiff).map((player) => player.id);
    reason = winnerPlayerIds.length === 1 ? "TARGETとの差が最も小さいプレイヤーの勝利です。" : "TARGETとの差が同じため引き分けです。";
  }

  const winnerPlayerId = winnerPlayerIds.length === 1 ? winnerPlayerIds[0] : "draw";

  return {
    winnerPlayerId,
    winnerPlayerIds: winnerPlayerId === "draw" ? [] : winnerPlayerIds,
    playerIds: normalized.map((player) => player.id),
    reason,
    decidedAt: Date.now()
  };
}

// Independent from rooms/{roomId}: a rematch overwrites the room in place,
// so the shared link must point at a frozen copy keyed by this match's
// roomId + decidedAt, not at the live room state.
function buildResultSnapshot(room, result) {
  const target = getRoomTarget(room);
  const shareId = `${room.roomId}_${result.decidedAt}`;
  const winnerIds = result.winnerPlayerIds || [];
  const playersMap = room.players || {};

  const rows = (result.playerIds || [])
    .map((id) => ({ id, player: playersMap[id] }))
    .filter((row) => row.player)
    .map((row) => ({ ...row, diff: Math.abs(target.value - (row.player.total || 0)) }));

  rows.sort((a, b) => {
    const aBust = a.player.status === "bust";
    const bBust = b.player.status === "bust";
    if (aBust !== bBust) return aBust ? 1 : -1;
    return a.diff - b.diff;
  });

  const players = rows.map((row, index) => ({
    id: row.id,
    name: row.player.name || "参加者",
    type: row.player.type || "human",
    total: row.player.total || 0,
    hitCount: row.player.hitCount || 0,
    status: row.player.status || "active",
    diff: row.diff,
    rank: index + 1,
    isWinner: winnerIds.includes(row.id)
  }));

  return {
    shareId,
    snapshot: {
      shareId,
      roomId: room.roomId,
      createdAt: serverTimestamp(),
      decidedAt: result.decidedAt,
      reason: result.reason,
      target: {
        id: target.id,
        label: target.label,
        value: target.value,
        dateLabel: target.dateLabel,
        sourceLabel: target.sourceLabel,
        difficulty: target.difficulty
      },
      players
    }
  };
}

function buildRoomProgressUpdates(room, actedPlayerId) {
  const playerIds = getStartedPlayerIds(room);
  const players = playerIds.map((id) => [id, room.players?.[id]]).filter(([, player]) => player);

  if (players.length >= MIN_PLAYERS && players.every(([, player]) => isFinished(player.status))) {
    const result = judge(players, getRoomTarget(room).value);
    const { shareId, snapshot } = buildResultSnapshot(room, result);
    return {
      status: "finished",
      result,
      shareId,
      finishedAt: serverTimestamp(),
      shareSnapshot: snapshot
    };
  }

  const nextTurnIndex = getNextTurnIndex(room, actedPlayerId);
  const updates = { turnIndex: nextTurnIndex };

  const playerOrder = getPlayerOrder(room);
  const nextPlayerId = playerOrder[nextTurnIndex];
  const nextPlayer = room.players?.[nextPlayerId];
  if (nextPlayer && canPlay(nextPlayer) && !nextPlayer.candidate) {
    const target = getRoomTarget(room);
    updates[`players/${nextPlayerId}/candidate`] = pickCandidate(nextPlayer.drawn || {}, target.value, nextPlayer.total || 0, nextPlayer.hitCount || 0);
  }

  return updates;
}

function prefixPlayerUpdate(playerId, payload) {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [`players/${playerId}/${key}`, value]));
}

function getNextTurnIndex(room, actedPlayerId) {
  const playerOrder = getPlayerOrder(room);
  if (playerOrder.length === 0) return 0;

  const actedIndex = Math.max(0, playerOrder.indexOf(actedPlayerId));
  for (let offset = 1; offset <= playerOrder.length; offset += 1) {
    const nextIndex = (actedIndex + offset) % playerOrder.length;
    const nextPlayer = room.players?.[playerOrder[nextIndex]];
    if (canPlay(nextPlayer)) return nextIndex;
  }
  return actedIndex;
}

function canTakeTurn(room, playerId) {
  return room?.status === "playing"
    && areGameStartConfirmationsComplete(room)
    && !room.turnAdvancing
    && canPlay(room.players?.[playerId])
    && getCurrentTurnPlayerId(room) === playerId;
}

function getCurrentTurnPlayerId(room) {
  const playerOrder = getPlayerOrder(room);
  if (playerOrder.length === 0 || !Number.isInteger(room.turnIndex)) return "";
  return playerOrder[room.turnIndex] || "";
}

function getStartedPlayerIds(room) {
  if (Array.isArray(room.startedPlayerIds) && room.startedPlayerIds.length > 0) return room.startedPlayerIds;
  if (Array.isArray(room.playerOrder) && room.playerOrder.length > 0) return room.playerOrder;
  return getPlayerOrder(room);
}

function getDisplayPlayerIds(room) {
  return room.status === "waiting" ? getPlayerOrder(room) : getStartedPlayerIds(room);
}

function getPlayerOrder(room) {
  const players = room.players || {};
  if (Array.isArray(room.playerOrder) && room.playerOrder.length > 0) {
    return room.playerOrder.filter((id) => players[id]);
  }

  return Object.entries(players)
    .sort(([, a], [, b]) => (a.joinedOrder || 0) - (b.joinedOrder || 0))
    .map(([id]) => id);
}

function makePlayer(name, status, options = {}) {
  return {
    name,
    type: options.type || "human",
    difficulty: options.difficulty || null,
    accuracy: options.accuracy || null,
    joinedOrder: Date.now(),
    total: 0,
    hitCount: 0,
    status,
    drawn: {},
    candidate: null,
    lastRevealed: null,
    item: options.item || null,
    shieldActive: false,
    ready: false,
    joinedAt: serverTimestamp()
  };
}

async function toggleReady() {
  await runGameAction(async () => {
    const room = await getCurrentRoom();
    if (!room || room.status !== "waiting") return;
    const me = room.players?.[currentPlayerId];
    if (!me) return;
    await update(ref(db, `rooms/${currentRoomId}/players/${currentPlayerId}`), { ready: !me.ready });
  });
}

function getGameStartConfirmationPlayerIds(room) {
  if (room?.startConfirmationRequired !== true) return [];
  return getStartedPlayerIds(room).filter((playerId) => room.players?.[playerId]?.type !== "cpu");
}

function areGameStartConfirmationsComplete(room) {
  if (room?.startConfirmationRequired !== true) return true;
  const playerIds = getGameStartConfirmationPlayerIds(room);
  if (playerIds.length === 0) return true;
  return playerIds.every((playerId) => room.startConfirmations?.[playerId] === true);
}

async function confirmGameStart() {
  await runGameAction(async () => {
    const room = await getCurrentRoom();
    if (!room || room.status !== "playing" || room.startConfirmationRequired !== true) return;
    if (!getGameStartConfirmationPlayerIds(room).includes(currentPlayerId)) return;
    if (room.startConfirmations?.[currentPlayerId] === true) return;

    await set(ref(db, `rooms/${currentRoomId}/startConfirmations/${currentPlayerId}`), true);
  });
}

function assignRandomItem() {
  const totalWeight = ITEM_CATALOG.reduce((sum, item) => sum + item.weight, 0);
  let threshold = Math.random() * totalWeight;
  for (const item of ITEM_CATALOG) {
    threshold -= item.weight;
    if (threshold <= 0) return { id: item.id, used: false };
  }
  return { id: ITEM_CATALOG[ITEM_CATALOG.length - 1].id, used: false };
}

function getItemDefinition(itemId) {
  return ITEM_CATALOG.find((item) => item.id === itemId) || null;
}

function pickCandidate(drawn, targetValue, currentTotal, hitCount) {
  const available = MUNICIPALITIES.filter((item) => !drawn[item.id]);
  const pool = available.length > 0 ? available : MUNICIPALITIES;
  return pickWeightedCandidate(pool, targetValue, currentTotal, hitCount);
}

function pickWeightedCandidate(pool, targetValue, currentTotal, hitCount) {
  const target = Number(targetValue || 0);
  // 「TARGET以下=安全」ではなく「残り枠(TARGET-現在人口)以下=安全」で判定する。
  // 現在人口を無視すると、終盤でも安全枠に大きなカードが残り続けてバーストが激増する。
  const remaining = target - (currentTotal || 0);
  const underTargetPool = remaining > 0 ? pool.filter((item) => item.population <= remaining) : [];
  const overTargetPool = remaining > 0 ? pool.filter((item) => item.population > remaining) : pool;
  const reference = getDrawReferencePopulation(target, currentTotal || 0, hitCount || 0);

  if (underTargetPool.length > 0 && overTargetPool.length > 0) {
    return pickByPopulationWeight(Math.random() < OVER_TARGET_DRAW_RATE ? overTargetPool : underTargetPool, reference);
  }

  return pickByPopulationWeight(underTargetPool.length > 0 ? underTargetPool : pool, reference);
}

// 残り枠(TARGET-現在人口)÷残りターン数 に近い人口ほど引きやすくする基準値。
// TARGETそのものに寄せると1枚で決着してしまい、残り枠を無視すると終盤も大味な
// カードばかりになるため、進行に応じて基準値が縮んでいくようにしている。
function getDrawReferencePopulation(targetValue, currentTotal, hitCount) {
  const remaining = Math.max(1, targetValue - currentTotal);
  const remainingTurns = Math.max(1, DRAW_REFERENCE_TURNS - hitCount);
  return remaining / remainingTurns;
}

function populationDrawWeight(population, reference) {
  const logDistance = Math.abs(Math.log(Math.max(1, population)) - Math.log(reference));
  return Math.exp(-DRAW_DECAY_RATE * logDistance);
}

function pickByPopulationWeight(pool, reference) {
  if (pool.length === 0) return null;

  const weights = pool.map((item) => populationDrawWeight(item.population, reference));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight <= 0) return pool[Math.floor(Math.random() * pool.length)];

  let threshold = Math.random() * totalWeight;
  for (let i = 0; i < pool.length; i += 1) {
    threshold -= weights[i];
    if (threshold <= 0) return pool[i];
  }

  return pool[pool.length - 1];
}

function getPlayerName(inputEl, defaultName) {
  return inputEl.value.trim() || defaultName;
}

function getCpuPlayerName() {
  return els.cpuPlayerNameInput.value.trim() || "Player";
}

function getCpuCount() {
  return Math.min(4, Math.max(1, Number(els.cpuCountSelect.value || 1)));
}

function populateTargetSelects() {
  els.createTargetSelect.innerHTML = [
    '<option value="random">ランダム（特別を除く）</option>',
    ...TARGETS.map((target) => makeTargetOption(target))
  ].join("");
  els.cpuTargetSelect.innerHTML = [
    '<option value="random">ランダム（特別を除く）</option>',
    ...TARGETS.map((target) => makeTargetOption(target))
  ].join("");
  els.createTargetSelect.value = DEFAULT_TARGET.id;
  els.cpuTargetSelect.value = "random";
}

function makeTargetOption(target) {
  return `<option value="${target.id}">${target.label}</option>`;
}

function getSelectedTarget(targetId) {
  return TARGETS.find((target) => target.id === targetId) || DEFAULT_TARGET;
}

function getSelectedCpuTarget() {
  if (els.cpuTargetSelect.value === "random") return pickRandomTarget();
  return getSelectedTarget(els.cpuTargetSelect.value);
}

function pickRandomTarget() {
  const targets = TARGETS.filter((target) => !target.isSpecial);
  return targets[Math.floor(Math.random() * targets.length)] || DEFAULT_TARGET;
}

function runTargetRoulette() {
  const targets = TARGETS.filter((target) => !target.isSpecial);
  const selected = targets[Math.floor(Math.random() * targets.length)] || DEFAULT_TARGET;
  let index = 0;

  clearRoulette();
  els.targetRoulette.classList.remove("hidden");
  els.rouletteWindow.classList.add("spinning");
  els.rouletteWindow.textContent = targets[0]?.label || DEFAULT_TARGET.label;

  return new Promise((resolve) => {
    rouletteTimer = window.setInterval(() => {
      const target = targets[index % targets.length] || DEFAULT_TARGET;
      els.rouletteWindow.textContent = `${target.label} ${formatNumber(target.value)}人`;
      playSfx("tick");
      index += 1;
    }, 90);

    window.setTimeout(() => {
      clearRoulette(false);
      els.rouletteWindow.classList.remove("spinning");
      els.rouletteWindow.textContent = `${selected.label} ${formatNumber(selected.value)}人`;
      setSetupMessage(`TARGETは「${selected.label}」に決まりました。`);
      window.setTimeout(() => resolve(selected), 500);
    }, 1500);
  });
}

function clearRoulette(hide = true) {
  if (rouletteTimer) {
    window.clearInterval(rouletteTimer);
    rouletteTimer = null;
  }
  if (hide) els.targetRoulette.classList.add("hidden");
}

function getRoomTarget(room) {
  return {
    id: room.targetId || DEFAULT_TARGET.id,
    label: room.targetLabel || getSelectedTarget(room.targetId).label,
    value: Number(room.target || DEFAULT_TARGET.value),
    dateLabel: room.targetDateLabel || getSelectedTarget(room.targetId).dateLabel,
    sourceLabel: room.targetSourceLabel || getSelectedTarget(room.targetId).sourceLabel,
    difficulty: room.targetDifficulty || getSelectedTarget(room.targetId).difficulty
  };
}

function makeRoomTargetPayload(target) {
  return {
    targetId: target.id,
    target: target.value,
    targetLabel: target.label,
    targetDateLabel: target.dateLabel,
    targetSourceLabel: target.sourceLabel,
    targetDifficulty: target.difficulty
  };
}

function renderDrawProfileNotice(room, target) {
  const profileKey = `${room.roomId}:${room.startedAt || ""}:${room.status}`;

  if (room.status === "playing") {
    els.drawProfileText.classList.remove("hidden");
    if (profileKey !== lastProfileRoomKey) {
      lastProfileRoomKey = profileKey;
      renderDrawProfile(els.drawProfileText, target);
      renderDrawProfile(els.gameStartIntroProfile, target);
      renderGameStartIntroRule(room, target);
    }
    syncGameStartIntro(room);
    return;
  }

  lastProfileRoomKey = "";
  els.drawProfileText.classList.add("hidden");
  hideGameStartIntro(true);
}

function syncGameStartIntro(room) {
  if (!els.gameStartIntro || !els.gameStartIntroOkButton || !els.gameStartIntroStatus) return;

  if (room.startConfirmationRequired !== true || areGameStartConfirmationsComplete(room)) {
    if (gameStartIntroVisible) hideGameStartIntro(false);
    return;
  }

  const playerIds = getGameStartConfirmationPlayerIds(room);
  const confirmedCount = playerIds.filter((playerId) => room.startConfirmations?.[playerId] === true).length;
  const meConfirmed = room.startConfirmations?.[currentPlayerId] === true;
  const canConfirm = playerIds.includes(currentPlayerId);

  els.gameStartIntroStatus.textContent = meConfirmed
    ? `あなたはOK済みです。ほかの参加者を待っています（${confirmedCount} / ${playerIds.length}人）`
    : `${confirmedCount} / ${playerIds.length}人がOK`;
  renderGameStartConfirmationList(room, playerIds);
  els.gameStartIntroOkButton.textContent = meConfirmed ? "OK済み" : "OK";
  els.gameStartIntroOkButton.disabled = !canConfirm || meConfirmed;

  showGameStartIntro();
}

function renderGameStartConfirmationList(room, playerIds) {
  if (!els.gameStartIntroConfirmationList) return;

  els.gameStartIntroConfirmationList.replaceChildren();

  for (const playerId of playerIds) {
    const player = room.players?.[playerId];
    if (!player) continue;

    const confirmed = room.startConfirmations?.[playerId] === true;
    const row = document.createElement("div");
    row.className = `game-start-confirmation-player ${confirmed ? "confirmed" : "waiting"}`;

    const name = document.createElement("span");
    name.className = "game-start-confirmation-name";
    name.textContent = `${player.name || "参加者"}${playerId === currentPlayerId ? "（あなた）" : ""}`;

    const status = document.createElement("span");
    status.className = "game-start-confirmation-state";
    status.textContent = confirmed ? "✓ OK" : "待機中";

    row.append(name, status);
    els.gameStartIntroConfirmationList.append(row);
  }
}

function showGameStartIntro() {
  if (!els.gameStartIntro) return;
  window.clearTimeout(gameStartIntroHideTimer);
  gameStartIntroHideTimer = null;
  els.gameStartIntro.classList.remove("hidden", "fade-out");
  gameStartIntroVisible = true;
}

function renderGameStartIntroRule(room, target) {
  if (!els.gameStartIntroRule) return;
  els.gameStartIntroRule.innerHTML = "";

  const targetSpan = document.createElement("strong");
  targetSpan.textContent = isTargetHidden(room) ? "非公開（伏せモード）" : `${formatNumber(target.value)}人`;

  els.gameStartIntroRule.append("TARGETは", targetSpan, "。これを超えないように、HITかSTANDを選んでいきましょう。");
}

function hideGameStartIntro(immediate) {
  if (!els.gameStartIntro) return;
  window.clearTimeout(gameStartIntroHideTimer);
  gameStartIntroHideTimer = null;
  gameStartIntroVisible = false;
  if (els.gameStartIntro.classList.contains("hidden")) return;

  if (immediate) {
    els.gameStartIntro.classList.add("hidden");
    els.gameStartIntro.classList.remove("fade-out");
    return;
  }

  els.gameStartIntro.classList.add("fade-out");
  gameStartIntroHideTimer = window.setTimeout(() => {
    els.gameStartIntro.classList.add("hidden");
    els.gameStartIntro.classList.remove("fade-out");
    gameStartIntroHideTimer = null;
  }, 450);
}

function renderDrawProfile(container, target, options = {}) {
  if (!container) return;

  const rows = getAdaptiveDrawBands(target.value);
  container.innerHTML = "";

  const title = document.createElement("h3");
  title.textContent = options.title || "人口カード構成";

  const note = document.createElement("p");
  note.className = "draw-profile-note";
  note.textContent = `TARGET超過の市区町村は約${Math.round(OVER_TARGET_DRAW_RATE * 100)}%だけ出ます。`;

  const list = document.createElement("div");
  list.className = "draw-profile-bars";

  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "draw-profile-row";

    const label = document.createElement("span");
    label.className = "draw-profile-label";
    label.textContent = row.label;

    const meter = document.createElement("span");
    meter.className = "draw-profile-meter";

    const fill = document.createElement("span");
    fill.className = "draw-profile-fill";
    fill.style.width = `${Math.max(0, Math.min(100, row.percent))}%`;
    meter.append(fill);

    const value = document.createElement("strong");
    value.textContent = `${Math.round(row.percent)}%`;

    item.append(label, meter, value);
    list.append(item);
  }

  container.append(title, note, list);
}

function formatManValue(value) {
  const man = value / 10000;
  return Number.isInteger(man) ? `${man}` : man.toFixed(1);
}

function buildDrawBandLabel(lo, hi, isOpenUpper) {
  if (isOpenUpper) return `${formatManValue(lo)}万人以上`;
  if (lo <= 0) return `${formatManValue(hi)}万人未満`;
  return `${formatManValue(lo)}万〜${formatManValue(hi)}万人未満`;
}

// 帯の幅に対して十分細かい「キリのいい」区切り単位を選ぶ。
function niceBandUnit(width) {
  const candidates = DRAW_BAND_LADDER.filter((unit) => unit <= width / 3);
  return candidates.length > 0 ? candidates[candidates.length - 1] : DRAW_BAND_LADDER[0];
}

function niceBandMidpoint(lo, hi) {
  const unit = niceBandUnit(hi - lo);
  return Math.round((lo + hi) / 2 / unit) * unit;
}

function sumDrawWeight(items, lo, hi, reference) {
  let sum = 0;
  for (const item of items) {
    if (item.population >= lo && item.population < hi) {
      sum += populationDrawWeight(item.population, reference);
    }
  }
  return sum;
}

// [lo, hi) の割合がDRAW_BAND_SHARE_CAPを超える限り、キリのいい数字で再帰的に分割する。
function splitDrawBands(items, lo, hi, reference, totalWeight, depth) {
  const weight = sumDrawWeight(items, lo, hi, reference);
  const share = totalWeight > 0 ? weight / totalWeight : 0;

  if (share <= DRAW_BAND_SHARE_CAP || depth >= DRAW_BAND_MAX_DEPTH || hi - lo <= 10000) {
    return [{ lo, hi, weight }];
  }

  const mid = niceBandMidpoint(lo, hi);
  if (mid <= lo || mid >= hi) return [{ lo, hi, weight }];

  return [
    ...splitDrawBands(items, lo, mid, reference, totalWeight, depth + 1),
    ...splitDrawBands(items, mid, hi, reference, totalWeight, depth + 1)
  ];
}

// 「人口カード構成」表示用に、TARGETに応じて毎回キリのいい帯を組み立て直す。
// ゲーム開始直後(現在人口0・0ターン目)を代表値として、その時点の抽選確率を表示する。
// 内側の区切りはniceBandMidpointで丸めるが、TARGET以下/超の境界だけは実際のTARGET値を使う。
function getAdaptiveDrawBands(targetValue) {
  const target = Number(targetValue || 0);
  if (target <= 0 || MUNICIPALITIES.length === 0) return [];

  const reference = getDrawReferencePopulation(target, 0, 0);
  const underItems = MUNICIPALITIES.filter((item) => item.population <= target);
  const overItems = MUNICIPALITIES.filter((item) => item.population > target);
  const maxPopulation = MUNICIPALITIES.reduce((max, item) => Math.max(max, item.population), target);

  const hasUnder = underItems.length > 0;
  const hasOver = overItems.length > 0;
  const underShare = hasUnder && hasOver ? 1 - OVER_TARGET_DRAW_RATE : hasUnder ? 1 : 0;
  const overShare = hasUnder && hasOver ? OVER_TARGET_DRAW_RATE : hasOver ? 1 : 0;

  const bands = [];

  if (hasUnder) {
    const totalWeight = sumDrawWeight(underItems, 0, target, reference);
    for (const band of splitDrawBands(underItems, 0, target, reference, totalWeight, 0)) {
      const percent = totalWeight > 0 ? (band.weight / totalWeight) * underShare * 100 : 0;
      if (percent <= 0) continue;
      bands.push({ lo: band.lo, hi: band.hi, percent, isOpenUpper: false });
    }
  }

  if (hasOver) {
    const upperBound = maxPopulation + 1;
    const totalWeight = sumDrawWeight(overItems, target, upperBound, reference);
    const overBands = splitDrawBands(overItems, target, upperBound, reference, totalWeight, 0);
    overBands.forEach((band, index) => {
      const percent = totalWeight > 0 ? (band.weight / totalWeight) * overShare * 100 : 0;
      if (percent <= 0) return;
      bands.push({ lo: band.lo, hi: band.hi, percent, isOpenUpper: index === overBands.length - 1 });
    });
  }

  return collapseZeroDisplayBands(bands).map((band) => ({
    label: buildDrawBandLabel(band.lo, band.hi, band.isOpenUpper),
    percent: band.percent
  }));
}

// 表示上「0%」（四捨五入で0になる）帯が末尾に連続する場合、1件ずつ並べず
// 「◯万人以上」の1行にまとめて0%として表示する。
function collapseZeroDisplayBands(bands) {
  let cutIndex = bands.length;
  for (let i = bands.length - 1; i >= 0; i -= 1) {
    if (Math.round(bands[i].percent) !== 0) break;
    cutIndex = i;
  }

  if (cutIndex >= bands.length) return bands;

  const kept = bands.slice(0, cutIndex);
  const collapsed = bands.slice(cutIndex);
  const mergedPercent = collapsed.reduce((sum, band) => sum + band.percent, 0);

  kept.push({
    lo: collapsed[0].lo,
    hi: collapsed[collapsed.length - 1].hi,
    percent: mergedPercent,
    isOpenUpper: true
  });

  return kept;
}

function makeCpuProfiles(cpuCount) {
  const accuracies = CPU_ACCURACY_SETS[cpuCount] || CPU_ACCURACY_SETS[1];
  return accuracies.map((accuracy) => ({
    accuracy,
    difficulty: accuracy >= 0.7 ? "hard" : accuracy >= 0.6 ? "normal" : "easy"
  }));
}

function makeRoomId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function normalizeRoomId(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("ja-JP");
}

function setSetupMessage(message) {
  els.setupMessage.textContent = message;
}

function disableSetup(disabled) {
  els.selectCreateModeButton.disabled = disabled;
  els.selectJoinModeButton.disabled = disabled;
  els.selectCpuModeButton.disabled = disabled;
  els.createRoomButton.disabled = disabled;
  els.joinRoomButton.disabled = disabled;
  els.startCpuRoomButton.disabled = disabled;
}

function showSetupMode(mode) {
  clearRoulette();
  els.setupModeView.classList.toggle("hidden", mode !== "choice");
  els.createRoomForm.classList.toggle("hidden", mode !== "create");
  els.joinRoomForm.classList.toggle("hidden", mode !== "join");
  els.cpuRoomForm.classList.toggle("hidden", mode !== "cpu");
  setSetupMessage("");

  if (mode === "create") els.playerNameInput.focus();
  if (mode === "join") els.joinPlayerNameInput.focus();
  if (mode === "cpu") els.cpuPlayerNameInput.focus();
}

function canPlay(player) {
  return player?.status === "active";
}

function isFinished(status) {
  return ["stand", "bust", "just"].includes(status);
}

function getMe(room) {
  return room?.players?.[currentPlayerId] || null;
}

async function getCurrentRoom() {
  if (!currentRoomId) return null;
  const snapshot = await get(ref(db, `rooms/${currentRoomId}`));
  return snapshot.val();
}

function buildMyStatus(player, room) {
  const target = getRoomTarget(room).value;
  const hideTarget = isTargetHidden(room);
  if (player.status === "bust") return hideTarget ? "BUST：TARGETをオーバーしました" : `BUST：${formatNumber(player.total - target)}人オーバー`;
  if (player.status === "just") return "JUST：TARGETと完全一致";
  if (player.status === "stand") return hideTarget ? "STAND：結果を待っています" : `STAND：TARGETまで${formatNumber(target - player.total)}人`;
  if (player.status === "active") {
    if (room.status === "playing" && !areGameStartConfirmationsComplete(room)) {
      return "全員のOKを待っています。";
    }
    if (room.status === "playing" && getCurrentTurnPlayerId(room) !== currentPlayerId) {
      const turnPlayer = room.players?.[getCurrentTurnPlayerId(room)];
      return hideTarget
        ? `${turnPlayer?.name || "他の参加者"}さんの番です。`
        : `${turnPlayer?.name || "他の参加者"}さんの番です。TARGETまで${formatNumber(target - player.total)}人`;
    }
    return hideTarget ? "あなたの番です。" : `あなたの番です。TARGETまで${formatNumber(target - player.total)}人`;
  }
  return "待機中";
}

function assertFirebaseConfig(config) {
  const missing = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"].filter((key) => {
    const value = config[key];
    return !value || String(value).startsWith("YOUR_");
  });

  if (missing.length > 0) {
    throw new Error("firebase-config.js にFirebase設定値を入れてください。");
  }
}

async function runSetupAction(action) {
  setSetupMessage("Firebaseに接続しています...");
  disableSetup(true);
  try {
    await action();
  } catch (error) {
    setSetupMessage(formatFirebaseError(error));
  } finally {
    if (!currentRoomId) disableSetup(false);
  }
}

async function runGameAction(action) {
  els.myStatus.textContent = "同期しています...";
  try {
    await action();
  } catch (error) {
    els.myStatus.textContent = formatFirebaseError(error);
  }
}

function formatFirebaseError(error) {
  const code = error?.code || "";
  if (code.includes("permission-denied")) {
    return "Firebaseの書き込みが拒否されました。Realtime Database Rulesを検証用に読み書き許可へ変更してください。";
  }
  if (code.includes("database/invalid-url") || code.includes("app/no-options")) {
    return "Firebase設定値が正しくありません。firebase-config.js の databaseURL などを確認してください。";
  }
  if (String(error?.message || "").includes("Failed to fetch")) {
    return "Firebaseへ接続できません。ネットワーク接続とFirebase設定値を確認してください。";
  }
  return `処理に失敗しました：${error?.message || "原因不明のエラー"}`;
}
