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
import { loadFirebaseConfig } from "./config-loader.js";

const TARGET = 200000;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 5;
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
  setupModeView: document.querySelector("#setupModeView"),
  createRoomForm: document.querySelector("#createRoomForm"),
  joinRoomForm: document.querySelector("#joinRoomForm"),
  selectCreateModeButton: document.querySelector("#selectCreateModeButton"),
  selectJoinModeButton: document.querySelector("#selectJoinModeButton"),
  backFromCreateButton: document.querySelector("#backFromCreateButton"),
  backFromJoinButton: document.querySelector("#backFromJoinButton"),
  gameView: document.querySelector("#gameView"),
  playerNameInput: document.querySelector("#playerNameInput"),
  roomIdInput: document.querySelector("#roomIdInput"),
  createRoomButton: document.querySelector("#createRoomButton"),
  joinRoomButton: document.querySelector("#joinRoomButton"),
  setupMessage: document.querySelector("#setupMessage"),
  targetLabel: document.querySelector("#targetLabel"),
  roomCode: document.querySelector("#roomCode"),
  roomState: document.querySelector("#roomState"),
  turnLabel: document.querySelector("#turnLabel"),
  capacityLabel: document.querySelector("#capacityLabel"),
  startGameButton: document.querySelector("#startGameButton"),
  myTotal: document.querySelector("#myTotal"),
  myHitCount: document.querySelector("#myHitCount"),
  candidateName: document.querySelector("#candidateName"),
  candidatePrefecture: document.querySelector("#candidatePrefecture"),
  candidatePopulation: document.querySelector("#candidatePopulation"),
  hitButton: document.querySelector("#hitButton"),
  standButton: document.querySelector("#standButton"),
  myStatus: document.querySelector("#myStatus"),
  playersList: document.querySelector("#playersList"),
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
disableSetup(true);
initializeFirebase();

els.selectCreateModeButton.addEventListener("click", () => showSetupMode("create"));
els.selectJoinModeButton.addEventListener("click", () => showSetupMode("join"));
els.backFromCreateButton.addEventListener("click", () => showSetupMode("choice"));
els.backFromJoinButton.addEventListener("click", () => showSetupMode("choice"));
els.createRoomButton.addEventListener("click", createRoom);
els.joinRoomButton.addEventListener("click", joinRoom);
els.startGameButton.addEventListener("click", startGame);
els.hitButton.addEventListener("click", hit);
els.standButton.addEventListener("click", stand);
els.leaveRoomButton.addEventListener("click", () => window.location.reload());

async function initializeFirebase() {
  try {
    const firebaseConfig = await loadFirebaseConfig();
    assertFirebaseConfig(firebaseConfig);
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    appReady = true;
    setSetupMessage("");
    disableSetup(false);
  } catch (error) {
    setSetupMessage(error.message);
    disableSetup(true);
  }
}

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
      maxPlayers: MAX_PLAYERS,
      turnIndex: null,
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
    const playerOrder = getPlayerOrder({ ...room, players });
    if (playerOrder.length < MIN_PLAYERS) {
      els.myStatus.textContent = `${MIN_PLAYERS}人以上そろうと開始できます。`;
      return;
    }

    const updates = {
      status: "playing",
      startedAt: serverTimestamp(),
      turnIndex: 0,
      playerOrder,
      startedPlayerIds: playerOrder
    };
    for (const playerId of playerOrder) {
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
    if (!room || !canTakeTurn(room, currentPlayerId)) return;

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

    const nextPlayers = { ...(room.players || {}), [currentPlayerId]: { ...me, ...payload } };
    const updates = prefixPlayerUpdate(currentPlayerId, payload);
    Object.assign(updates, buildRoomProgressUpdates({ ...room, players: nextPlayers }, currentPlayerId));

    await update(ref(db, `rooms/${currentRoomId}`), updates);
  });
}

async function stand() {
  await runGameAction(async () => {
    const room = await getCurrentRoom();
    const me = getMe(room);
    if (!room || !canTakeTurn(room, currentPlayerId)) return;

    const payload = {
      status: "stand",
      candidate: null,
      finishedAt: serverTimestamp()
    };
    const nextPlayers = { ...(room.players || {}), [currentPlayerId]: { ...me, ...payload } };
    const updates = prefixPlayerUpdate(currentPlayerId, payload);
    Object.assign(updates, buildRoomProgressUpdates({ ...room, players: nextPlayers }, currentPlayerId));

    await update(ref(db, `rooms/${currentRoomId}`), updates);
  });
}

async function finishRoomIfNeeded() {
  const room = await getCurrentRoom();
  if (!room || room.status === "finished") return;

  const playerIds = getStartedPlayerIds(room);
  const players = playerIds.map((id) => [id, room.players?.[id]]).filter(([, player]) => player);
  if (players.length < MIN_PLAYERS || !players.every(([, player]) => isFinished(player.status))) return;

  await update(ref(db, `rooms/${currentRoomId}`), {
    status: "finished",
    result: judge(players, room.target),
    finishedAt: serverTimestamp()
  });
}

function renderRoom(room) {
  const players = room.players || {};
  const playerIds = getDisplayPlayerIds(room);
  const me = players[currentPlayerId];
  const isHost = room.hostPlayerId === currentPlayerId;
  const turnPlayerId = getCurrentTurnPlayerId(room);
  const turnPlayer = players[turnPlayerId];

  els.targetLabel.textContent = formatNumber(room.target || TARGET);
  els.roomState.textContent = room.status === "finished" ? "終了" : room.status === "playing" ? "プレイ中" : "待機中";
  els.capacityLabel.textContent = `${playerIds.length} / ${room.maxPlayers || MAX_PLAYERS}人`;
  els.turnLabel.textContent = room.status === "playing" ? `${turnPlayer?.name || "不明"}さんの番` : "開始前";
  els.startGameButton.classList.toggle("hidden", !(isHost && room.status === "waiting" && playerIds.length >= MIN_PLAYERS));

  if (room.status !== "finished" && playerIds.length >= MIN_PLAYERS && playerIds.every((id) => isFinished(players[id].status))) {
    finishRoomIfNeeded();
  }

  if (!me) return;

  els.myTotal.textContent = formatNumber(me.total || 0);
  els.myHitCount.textContent = formatNumber(me.hitCount || 0);
  els.myStatus.textContent = buildMyStatus(me, room);

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
    els.candidatePrefecture.textContent = playerIds.length < MIN_PLAYERS ? "参加者を待っています" : "ホストがゲームを開始します";
    els.candidatePopulation.textContent = "人口：?????";
  }

  els.hitButton.disabled = !canTakeTurn(room, currentPlayerId);
  els.standButton.disabled = !canTakeTurn(room, currentPlayerId);

  renderPlayersList(room, players, playerIds);

  renderResult(room, players);
}

function renderResult(room, players) {
  const shouldShow = room.status === "finished" && room.result;
  els.resultPanel.classList.toggle("hidden", !shouldShow);
  els.resultPanel.classList.remove("win", "lose");
  if (!shouldShow) return;

  const result = room.result;
  const me = players[currentPlayerId];
  const winnerIds = result.winnerPlayerIds || (result.winnerPlayerId && result.winnerPlayerId !== "draw" ? [result.winnerPlayerId] : []);

  if (winnerIds.length === 0) {
    els.resultTitle.textContent = "DRAW";
  } else if (winnerIds.includes(currentPlayerId)) {
    els.resultTitle.textContent = "WIN";
    els.resultPanel.classList.add("win");
  } else {
    els.resultTitle.textContent = "LOSE";
    els.resultPanel.classList.add("lose");
  }

  const summaries = (result.playerIds || getDisplayPlayerIds(room))
    .map((id) => {
      const player = players[id];
      const label = id === currentPlayerId ? "あなた" : player?.name || "参加者";
      return `${label} ${formatNumber(player?.total || 0)}人（${statusLabels[player?.status] || "待機中"}）`;
    })
    .join(" / ");
  els.resultDetail.textContent = `${result.reason || "TARGETとの差で判定しました。"} ${summaries}`;
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
    title.textContent = `${player.name || "参加者"}${playerId === currentPlayerId ? "（あなた）" : ""}`;

    const meta = document.createElement("span");
    meta.textContent =
      `${formatNumber(player.total || 0)}人 / ` +
      `${statusLabels[player.status] || "待機中"} / ` +
      `HIT ${formatNumber(player.hitCount || 0)}回`;

    item.append(title, meta);
    els.playersList.append(item);
  }
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

function buildRoomProgressUpdates(room, actedPlayerId) {
  const playerIds = getStartedPlayerIds(room);
  const players = playerIds.map((id) => [id, room.players?.[id]]).filter(([, player]) => player);

  if (players.length >= MIN_PLAYERS && players.every(([, player]) => isFinished(player.status))) {
    return {
      status: "finished",
      result: judge(players, room.target || TARGET),
      finishedAt: serverTimestamp()
    };
  }

  return {
    turnIndex: getNextTurnIndex(room, actedPlayerId)
  };
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
  return room?.status === "playing" && canPlay(room.players?.[playerId]) && getCurrentTurnPlayerId(room) === playerId;
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

function makePlayer(name, status) {
  return {
    name,
    joinedOrder: Date.now(),
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
  els.selectCreateModeButton.disabled = disabled;
  els.selectJoinModeButton.disabled = disabled;
  els.createRoomButton.disabled = disabled;
  els.joinRoomButton.disabled = disabled;
}

function showSetupMode(mode) {
  els.setupModeView.classList.toggle("hidden", mode !== "choice");
  els.createRoomForm.classList.toggle("hidden", mode !== "create");
  els.joinRoomForm.classList.toggle("hidden", mode !== "join");
  setSetupMessage("");

  if (mode === "create") els.playerNameInput.focus();
  if (mode === "join") els.roomIdInput.focus();
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
  const target = room.target || TARGET;
  if (player.status === "bust") return `BUST：${formatNumber(player.total - target)}人オーバー`;
  if (player.status === "just") return "JUST：TARGETと完全一致";
  if (player.status === "stand") return `STAND：TARGETまで${formatNumber(target - player.total)}人`;
  if (player.status === "active") {
    if (room.status === "playing" && getCurrentTurnPlayerId(room) !== currentPlayerId) {
      const turnPlayer = room.players?.[getCurrentTurnPlayerId(room)];
      return `${turnPlayer?.name || "他の参加者"}さんの番です。TARGETまで${formatNumber(target - player.total)}人`;
    }
    return `あなたの番です。TARGETまで${formatNumber(target - player.total)}人`;
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
