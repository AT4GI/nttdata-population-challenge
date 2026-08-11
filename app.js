import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  onValue,
  set,
  update,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const TARGET = 200000;
const MUNICIPALITIES = [
  { id: "tokyo-hachioji", name: "八王子市", prefecture: "東京都", population: 579355 },
  { id: "tokyo-mitaka", name: "三鷹市", prefecture: "東京都", population: 195391 },
  { id: "kanagawa-kamakura", name: "鎌倉市", prefecture: "神奈川県", population: 172710 },
  { id: "kanagawa-atsugi", name: "厚木市", prefecture: "神奈川県", population: 223705 },
  { id: "chiba-urayasu", name: "浦安市", prefecture: "千葉県", population: 169749 },
  { id: "saitama-kawagoe", name: "川越市", prefecture: "埼玉県", population: 353301 },
  { id: "yamanashi-fujiyoshida", name: "富士吉田市", prefecture: "山梨県", population: 46722 },
  { id: "shizuoka-atami", name: "熱海市", prefecture: "静岡県", population: 34396 },
  { id: "nagano-matsumoto", name: "松本市", prefecture: "長野県", population: 241145 },
  { id: "toyama-himi", name: "氷見市", prefecture: "富山県", population: 41700 },
  { id: "ishikawa-nanao", name: "七尾市", prefecture: "石川県", population: 49000 },
  { id: "gifu-takayama", name: "高山市", prefecture: "岐阜県", population: 84000 },
  { id: "aichi-okazaki", name: "岡崎市", prefecture: "愛知県", population: 385376 },
  { id: "mie-ise", name: "伊勢市", prefecture: "三重県", population: 122432 },
  { id: "shiga-hikone", name: "彦根市", prefecture: "滋賀県", population: 112156 },
  { id: "kyoto-maizuru", name: "舞鶴市", prefecture: "京都府", population: 77650 },
  { id: "osaka-ibaraki", name: "茨木市", prefecture: "大阪府", population: 285715 },
  { id: "hyogo-akashi", name: "明石市", prefecture: "兵庫県", population: 303601 },
  { id: "nara-kashihara", name: "橿原市", prefecture: "奈良県", population: 119250 },
  { id: "wakayama-tanabe", name: "田辺市", prefecture: "和歌山県", population: 69000 },
  { id: "okayama-kurashiki", name: "倉敷市", prefecture: "岡山県", population: 474862 },
  { id: "hiroshima-onomichi", name: "尾道市", prefecture: "広島県", population: 126000 },
  { id: "yamaguchi-hagi", name: "萩市", prefecture: "山口県", population: 44000 },
  { id: "kagawa-marugame", name: "丸亀市", prefecture: "香川県", population: 109589 },
  { id: "ehime-imabari", name: "今治市", prefecture: "愛媛県", population: 151672 },
  { id: "fukuoka-dazaifu", name: "太宰府市", prefecture: "福岡県", population: 71812 },
  { id: "saga-karatsu", name: "唐津市", prefecture: "佐賀県", population: 117373 },
  { id: "nagasaki-sasebo", name: "佐世保市", prefecture: "長崎県", population: 239636 },
  { id: "kumamoto-amakusa", name: "天草市", prefecture: "熊本県", population: 73523 },
  { id: "kagoshima-kirishima", name: "霧島市", prefecture: "鹿児島県", population: 123135 }
];

const statusLabels = {
  waiting: "待機中",
  active: "プレイ中",
  stand: "STAND",
  bust: "BUST",
  just: "JUST"
};

const els = {
  setupView: document.querySelector("#setupView"),
  gameView: document.querySelector("#gameView"),
  playerNameInput: document.querySelector("#playerNameInput"),
  roomIdInput: document.querySelector("#roomIdInput"),
  createRoomButton: document.querySelector("#createRoomButton"),
  joinRoomButton: document.querySelector("#joinRoomButton"),
  setupMessage: document.querySelector("#setupMessage"),
  targetLabel: document.querySelector("#targetLabel"),
  roomCode: document.querySelector("#roomCode"),
  roomState: document.querySelector("#roomState"),
  startGameButton: document.querySelector("#startGameButton"),
  myTotal: document.querySelector("#myTotal"),
  myHitCount: document.querySelector("#myHitCount"),
  candidateName: document.querySelector("#candidateName"),
  candidatePrefecture: document.querySelector("#candidatePrefecture"),
  candidatePopulation: document.querySelector("#candidatePopulation"),
  hitButton: document.querySelector("#hitButton"),
  standButton: document.querySelector("#standButton"),
  myStatus: document.querySelector("#myStatus"),
  opponentName: document.querySelector("#opponentName"),
  opponentTotal: document.querySelector("#opponentTotal"),
  opponentStatus: document.querySelector("#opponentStatus"),
  opponentHitCount: document.querySelector("#opponentHitCount"),
  resultPanel: document.querySelector("#resultPanel"),
  resultTitle: document.querySelector("#resultTitle"),
  resultDetail: document.querySelector("#resultDetail"),
  leaveRoomButton: document.querySelector("#leaveRoomButton")
};

let db = null;
let appReady = false;
let currentRoomId = "";
let currentPlayerId = sessionStorage.getItem("populationBlackjackPlayerId") || crypto.randomUUID();
let unsubscribeRoom = null;

sessionStorage.setItem("populationBlackjackPlayerId", currentPlayerId);
els.targetLabel.textContent = formatNumber(TARGET);

try {
  assertFirebaseConfig(firebaseConfig);
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  appReady = true;
} catch (error) {
  setSetupMessage(error.message);
  disableSetup(true);
}

els.createRoomButton.addEventListener("click", createRoom);
els.joinRoomButton.addEventListener("click", joinRoom);
els.startGameButton.addEventListener("click", startGame);
els.hitButton.addEventListener("click", hit);
els.standButton.addEventListener("click", stand);
els.leaveRoomButton.addEventListener("click", () => window.location.reload());

async function createRoom() {
  if (!appReady) return;

  await runSetupAction(async () => {
    const roomId = makeRoomId();
    const playerName = getPlayerName("Player 1");
    const player = makePlayer(playerName, "waiting");

    await set(ref(db, `rooms/${roomId}`), {
      roomId,
      target: TARGET,
      status: "waiting",
      hostPlayerId: currentPlayerId,
      createdAt: serverTimestamp(),
      players: {
        [currentPlayerId]: player
      }
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
    if (!players[currentPlayerId] && playerIds.length >= 2) {
      setSetupMessage("この部屋はすでに2人そろっています。");
      return;
    }

    const defaultName = playerIds.length === 0 ? "Player 1" : "Player 2";
    await update(ref(db, `rooms/${roomId}/players/${currentPlayerId}`), makePlayer(getPlayerName(defaultName), "waiting"));
    enterRoom(roomId);
  });
}

function enterRoom(roomId) {
  currentRoomId = roomId;
  els.roomCode.textContent = roomId;
  els.roomIdInput.value = roomId;
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
    const updates = { status: "playing", startedAt: serverTimestamp() };
    for (const playerId of Object.keys(players)) {
      updates[`players/${playerId}/status`] = "active";
      updates[`players/${playerId}/candidate`] = pickCandidate(players[playerId].drawn || {});
    }

    await update(ref(db, `rooms/${currentRoomId}`), updates);
  });
}

async function hit() {
  await runGameAction(async () => {
    const room = await getCurrentRoom();
    const me = getMe(room);
    if (!room || !canPlay(me)) return;

    const candidate = me.candidate || pickCandidate(me.drawn || {});
    const nextTotal = (me.total || 0) + candidate.population;
    const drawn = { ...(me.drawn || {}), [candidate.id]: true };
    const status = nextTotal > room.target ? "bust" : nextTotal === room.target ? "just" : "active";
    const payload = {
      total: nextTotal,
      hitCount: (me.hitCount || 0) + 1,
      status,
      drawn,
      lastRevealed: candidate,
      updatedAt: serverTimestamp()
    };

    if (status === "active") {
      payload.candidate = pickCandidate(drawn);
    } else {
      payload.candidate = null;
      payload.finishedAt = serverTimestamp();
    }

    await update(ref(db, `rooms/${currentRoomId}/players/${currentPlayerId}`), payload);
    await finishRoomIfNeeded();
  });
}

async function stand() {
  await runGameAction(async () => {
    const room = await getCurrentRoom();
    const me = getMe(room);
    if (!room || !canPlay(me)) return;

    await update(ref(db, `rooms/${currentRoomId}/players/${currentPlayerId}`), {
      status: "stand",
      candidate: null,
      finishedAt: serverTimestamp()
    });
    await finishRoomIfNeeded();
  });
}

async function finishRoomIfNeeded() {
  const room = await getCurrentRoom();
  if (!room || room.status === "finished") return;

  const players = Object.entries(room.players || {});
  if (players.length < 2 || !players.every(([, player]) => isFinished(player.status))) return;

  await update(ref(db, `rooms/${currentRoomId}`), {
    status: "finished",
    result: judge(players, room.target),
    finishedAt: serverTimestamp()
  });
}

function renderRoom(room) {
  const players = room.players || {};
  const playerIds = Object.keys(players);
  const me = players[currentPlayerId];
  const opponent = playerIds.filter((id) => id !== currentPlayerId).map((id) => players[id])[0];
  const isHost = room.hostPlayerId === currentPlayerId;

  els.targetLabel.textContent = formatNumber(room.target || TARGET);
  els.roomState.textContent = room.status === "finished" ? "終了" : room.status === "playing" ? "プレイ中" : "待機中";
  els.startGameButton.classList.toggle("hidden", !(isHost && room.status === "waiting" && playerIds.length === 2));

  if (room.status !== "finished" && playerIds.length === 2 && playerIds.every((id) => isFinished(players[id].status))) {
    finishRoomIfNeeded();
  }

  if (!me) return;

  els.myTotal.textContent = formatNumber(me.total || 0);
  els.myHitCount.textContent = formatNumber(me.hitCount || 0);
  els.myStatus.textContent = buildMyStatus(me, room.target);

  const candidate = me.candidate;
  if (candidate && canPlay(me) && room.status === "playing") {
    els.candidateName.textContent = candidate.name;
    els.candidatePrefecture.textContent = candidate.prefecture;
    els.candidatePopulation.textContent = "人口：?????";
  } else if (me.lastRevealed && !canPlay(me)) {
    els.candidateName.textContent = me.lastRevealed.name;
    els.candidatePrefecture.textContent = `${me.lastRevealed.prefecture} / ${formatNumber(me.lastRevealed.population)}人`;
    els.candidatePopulation.textContent = "終了";
  } else {
    els.candidateName.textContent = room.status === "waiting" ? "待機中" : "候補なし";
    els.candidatePrefecture.textContent = playerIds.length < 2 ? "相手の参加を待っています" : "ホストがゲームを開始します";
    els.candidatePopulation.textContent = "人口：?????";
  }

  els.hitButton.disabled = !(room.status === "playing" && canPlay(me));
  els.standButton.disabled = !(room.status === "playing" && canPlay(me));

  els.opponentName.textContent = opponent?.name || "参加待ち";
  els.opponentTotal.textContent = formatNumber(opponent?.total || 0);
  els.opponentStatus.textContent = statusLabels[opponent?.status] || "待機中";
  els.opponentHitCount.textContent = formatNumber(opponent?.hitCount || 0);

  renderResult(room, players);
}

function renderResult(room, players) {
  const shouldShow = room.status === "finished" && room.result;
  els.resultPanel.classList.toggle("hidden", !shouldShow);
  els.resultPanel.classList.remove("win", "lose");
  if (!shouldShow) return;

  const result = room.result;
  const me = players[currentPlayerId];
  const opponentId = result.playerIds.find((id) => id !== currentPlayerId);
  const opponent = players[opponentId];

  if (result.winnerPlayerId === "draw") {
    els.resultTitle.textContent = "引き分け";
  } else if (result.winnerPlayerId === currentPlayerId) {
    els.resultTitle.textContent = "あなたの勝ち";
    els.resultPanel.classList.add("win");
  } else {
    els.resultTitle.textContent = "あなたの負け";
    els.resultPanel.classList.add("lose");
  }

  els.resultDetail.textContent =
    `あなた ${formatNumber(me.total || 0)}人（${statusLabels[me.status]}） / ` +
    `${opponent?.name || "相手"} ${formatNumber(opponent?.total || 0)}人（${statusLabels[opponent?.status] || "待機中"}）`;
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
  const [a, b] = normalized;

  let winnerPlayerId = "draw";
  if (a.just && !b.just) winnerPlayerId = a.id;
  else if (!a.just && b.just) winnerPlayerId = b.id;
  else if (a.busted && !b.busted) winnerPlayerId = b.id;
  else if (!a.busted && b.busted) winnerPlayerId = a.id;
  else if (!a.busted && !b.busted && a.diff !== b.diff) winnerPlayerId = a.diff < b.diff ? a.id : b.id;

  return {
    winnerPlayerId,
    playerIds: normalized.map((player) => player.id),
    decidedAt: Date.now()
  };
}

function makePlayer(name, status) {
  return {
    name,
    total: 0,
    hitCount: 0,
    status,
    drawn: {},
    candidate: null,
    lastRevealed: null,
    joinedAt: serverTimestamp()
  };
}

function pickCandidate(drawn) {
  const available = MUNICIPALITIES.filter((item) => !drawn[item.id]);
  const pool = available.length > 0 ? available : MUNICIPALITIES;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getPlayerName(defaultName) {
  return els.playerNameInput.value.trim() || defaultName;
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
  els.createRoomButton.disabled = disabled;
  els.joinRoomButton.disabled = disabled;
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

function buildMyStatus(player, target) {
  if (player.status === "bust") return `BUST：${formatNumber(player.total - target)}人オーバー`;
  if (player.status === "just") return "JUST：TARGETと完全一致";
  if (player.status === "stand") return `STAND：TARGETまで${formatNumber(target - player.total)}人`;
  if (player.status === "active") return `TARGETまで${formatNumber(target - player.total)}人`;
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
