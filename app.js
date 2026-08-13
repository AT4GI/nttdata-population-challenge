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

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 5;
const CPU_THINK_DELAY_MS = 1000;
const CPU_ACCURACY_SETS = {
  1: [0.75],
  2: [0.65, 0.5],
  3: [0.65, 0.5, 0.45],
  4: [0.65, 0.5, 0.45, 0.45]
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
  }
];
const DEFAULT_TARGET = TARGETS.find((target) => target.isDefault) || TARGETS[0];
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
  cpuRoomForm: document.querySelector("#cpuRoomForm"),
  selectCreateModeButton: document.querySelector("#selectCreateModeButton"),
  selectJoinModeButton: document.querySelector("#selectJoinModeButton"),
  selectCpuModeButton: document.querySelector("#selectCpuModeButton"),
  backFromCreateButton: document.querySelector("#backFromCreateButton"),
  backFromJoinButton: document.querySelector("#backFromJoinButton"),
  backFromCpuButton: document.querySelector("#backFromCpuButton"),
  gameView: document.querySelector("#gameView"),
  playerNameInput: document.querySelector("#playerNameInput"),
  cpuPlayerNameInput: document.querySelector("#cpuPlayerNameInput"),
  roomIdInput: document.querySelector("#roomIdInput"),
  cpuCountSelect: document.querySelector("#cpuCountSelect"),
  createRoomButton: document.querySelector("#createRoomButton"),
  joinRoomButton: document.querySelector("#joinRoomButton"),
  startCpuRoomButton: document.querySelector("#startCpuRoomButton"),
  setupMessage: document.querySelector("#setupMessage"),
  targetLabel: document.querySelector("#targetLabel"),
  targetName: document.querySelector("#targetName"),
  createTargetSelect: document.querySelector("#createTargetSelect"),
  cpuTargetSelect: document.querySelector("#cpuTargetSelect"),
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
let cpuActionTimer = null;
let cpuActionKey = "";

sessionStorage.setItem("populationBlackjackPlayerId", currentPlayerId);
populateTargetSelects();
els.targetLabel.textContent = formatNumber(DEFAULT_TARGET.value);
els.targetName.textContent = DEFAULT_TARGET.label;
disableSetup(true);
initializeFirebase();

els.selectCreateModeButton.addEventListener("click", () => showSetupMode("create"));
els.selectJoinModeButton.addEventListener("click", () => showSetupMode("join"));
els.selectCpuModeButton.addEventListener("click", () => showSetupMode("cpu"));
els.backFromCreateButton.addEventListener("click", () => showSetupMode("choice"));
els.backFromJoinButton.addEventListener("click", () => showSetupMode("choice"));
els.backFromCpuButton.addEventListener("click", () => showSetupMode("choice"));
els.createRoomButton.addEventListener("click", createRoom);
els.joinRoomButton.addEventListener("click", joinRoom);
els.startCpuRoomButton.addEventListener("click", createCpuRoom);
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
    const player = makePlayer(playerName, "waiting", { type: "human" });
    const target = getSelectedTarget(els.createTargetSelect.value);

    await set(ref(db, `rooms/${roomId}`), {
      roomId,
      roomMode: "online",
      ...makeRoomTargetPayload(target),
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

async function createCpuRoom() {
  if (!appReady) return;

  await runSetupAction(async () => {
    const roomId = makeRoomId();
    const target = getSelectedCpuTarget();
    const cpuCount = getCpuCount();
    const cpuProfiles = makeCpuProfiles(cpuCount);
    const cpuPlayerIds = cpuProfiles.map((_, index) => `cpu_${index + 1}`);
    const playerOrder = [currentPlayerId, ...cpuPlayerIds];
    const players = {
      [currentPlayerId]: makePlayer(getCpuPlayerName(), "active", { type: "human" })
    };

    for (const [index, cpuId] of cpuPlayerIds.entries()) {
      const profile = cpuProfiles[index];
      players[cpuId] = makePlayer(`CPU ${index + 1}`, "active", {
        type: "cpu",
        difficulty: profile.difficulty,
        accuracy: profile.accuracy
      });
    }

    for (const playerId of playerOrder) {
      players[playerId].candidate = pickCandidate(players[playerId].drawn || {});
    }

    await set(ref(db, `rooms/${roomId}`), {
      roomId,
      roomMode: "cpu",
      ...makeRoomTargetPayload(target),
      status: "playing",
      maxPlayers: MAX_PLAYERS,
      turnIndex: 0,
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
    await update(ref(db, `rooms/${roomId}/players/${currentPlayerId}`), makePlayer(getPlayerName(defaultName), "waiting", { type: "human" }));
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
    if (!room || !canTakeTurn(room, currentPlayerId)) return;

    await applyPlayerAction(room, currentPlayerId, "hit");
  });
}

async function stand() {
  await runGameAction(async () => {
    const room = await getCurrentRoom();
    if (!room || !canTakeTurn(room, currentPlayerId)) return;

    await applyPlayerAction(room, currentPlayerId, "stand");
  });
}

async function applyPlayerAction(room, playerId, action) {
  const player = room.players?.[playerId];
  if (!player || !canPlay(player) || getCurrentTurnPlayerId(room) !== playerId) return;

  const payload = action === "hit" ? buildHitPayload(room, player) : buildStandPayload();
  const nextPlayers = { ...(room.players || {}), [playerId]: { ...player, ...payload } };
  const updates = prefixPlayerUpdate(playerId, payload);
  Object.assign(updates, buildRoomProgressUpdates({ ...room, players: nextPlayers }, playerId));

  await update(ref(db, `rooms/${currentRoomId}`), updates);
}

function buildHitPayload(room, player) {
  const candidate = player.candidate || pickCandidate(player.drawn || {});
  const nextTotal = (player.total || 0) + candidate.population;
  const drawn = { ...(player.drawn || {}), [candidate.id]: true };
  const target = getRoomTarget(room).value;
  const status = nextTotal > target ? "bust" : nextTotal === target ? "just" : "active";
  const payload = {
    total: nextTotal,
    hitCount: (player.hitCount || 0) + 1,
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

  return payload;
}

function buildStandPayload() {
  return {
    status: "stand",
    candidate: null,
    finishedAt: serverTimestamp()
  };
}

async function finishRoomIfNeeded() {
  const room = await getCurrentRoom();
  if (!room || room.status === "finished") return;

  const playerIds = getStartedPlayerIds(room);
  const players = playerIds.map((id) => [id, room.players?.[id]]).filter(([, player]) => player);
  if (players.length < MIN_PLAYERS || !players.every(([, player]) => isFinished(player.status))) return;

  await update(ref(db, `rooms/${currentRoomId}`), {
    status: "finished",
    result: judge(players, getRoomTarget(room).value),
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
  const target = getRoomTarget(room);

  els.targetLabel.textContent = formatNumber(target.value);
  els.targetName.textContent = `${target.label} / ${target.difficulty}`;
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
  scheduleCpuTurn(room);
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
    const playerBadges = [];
    if (playerId === currentPlayerId) playerBadges.push("あなた");
    if (player.type === "cpu") playerBadges.push("CPU");
    title.textContent = `${player.name || "参加者"}${playerBadges.length > 0 ? `（${playerBadges.join(" / ")}）` : ""}`;

    const meta = document.createElement("span");
    meta.textContent =
      `${formatNumber(player.total || 0)}人 / ` +
      `${statusLabels[player.status] || "待機中"} / ` +
      `HIT ${formatNumber(player.hitCount || 0)}回`;

    item.append(title, meta);
    els.playersList.append(item);
  }
}

function scheduleCpuTurn(room) {
  const turnPlayerId = getCurrentTurnPlayerId(room);
  const turnPlayer = room.players?.[turnPlayerId];
  if (room.status !== "playing" || room.hostPlayerId !== currentPlayerId || turnPlayer?.type !== "cpu") {
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
  const candidate = cpuPlayer.candidate || pickCandidate(cpuPlayer.drawn || {});
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

function buildRoomProgressUpdates(room, actedPlayerId) {
  const playerIds = getStartedPlayerIds(room);
  const players = playerIds.map((id) => [id, room.players?.[id]]).filter(([, player]) => player);

  if (players.length >= MIN_PLAYERS && players.every(([, player]) => isFinished(player.status))) {
    return {
      status: "finished",
      result: judge(players, getRoomTarget(room).value),
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

function getCpuPlayerName() {
  return els.cpuPlayerNameInput.value.trim() || "Player";
}

function getCpuCount() {
  return Math.min(4, Math.max(1, Number(els.cpuCountSelect.value || 1)));
}

function populateTargetSelects() {
  els.createTargetSelect.innerHTML = TARGETS.map((target) => makeTargetOption(target)).join("");
  els.cpuTargetSelect.innerHTML = [
    '<option value="random">ランダム（特別を除く）</option>',
    ...TARGETS.map((target) => makeTargetOption(target))
  ].join("");
  els.createTargetSelect.value = DEFAULT_TARGET.id;
  els.cpuTargetSelect.value = "random";
}

function makeTargetOption(target) {
  return `<option value="${target.id}">${target.label} ${formatNumber(target.value)}人（${target.difficulty}）</option>`;
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
  els.setupModeView.classList.toggle("hidden", mode !== "choice");
  els.createRoomForm.classList.toggle("hidden", mode !== "create");
  els.joinRoomForm.classList.toggle("hidden", mode !== "join");
  els.cpuRoomForm.classList.toggle("hidden", mode !== "cpu");
  setSetupMessage("");

  if (mode === "create") els.playerNameInput.focus();
  if (mode === "join") els.roomIdInput.focus();
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
