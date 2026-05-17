// 1. ตั้งค่า Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8GcMTsZjtIV-O4S21_UyVWw896vZtDA4",
  authDomain: "daily-diary-game.firebaseapp.com",
  databaseURL: "https://daily-diary-game-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "daily-diary-game",
  storageBucket: "daily-diary-game.firebasestorage.app",
  messagingSenderId: "815417352324",
  appId: "1:815417352324:web:de240a6611e263cf66a2d1"
}

firebase.initializeApp(firebaseConfig)
const db = firebase.database()

const url = new URLSearchParams(window.location.search)
let roomId = url.get("room")
let playerName = url.get("name")

// --- DYNAMIC VISUAL EFFECTS ---
function generateNightSky() {
  const container = document.getElementById("stars-container")
  if(!container) return
  for (let i = 0; i < 50; i++) {
    const star = document.createElement("div")
    star.className = "star"
    star.style.left = `${Math.random() * 100}vw`
    star.style.top = `${Math.random() * 100}vh`
    const size = Math.random() * 2 + 1
    star.style.width = `${size}px`
    star.style.height = `${size}px`
    star.style.setProperty("--duration", `${Math.random() * 3 + 2}s`)
    star.style.setProperty("--opacity", Math.random())
    container.appendChild(star)
  }
}
generateNightSky()

// --- BASE CARDS DATA ---
const baseMorning = [
  { image: "https://github.com/user-attachments/assets/01155d03-fcc7-4301-ada5-7fb897b301b8" },
  { image: "https://github.com/user-attachments/assets/b6dac043-358d-4052-b9e8-56219a2d41c0" },
  { image: "https://github.com/user-attachments/assets/41ded218-68f3-48f8-acc9-473c3dc498ea" },
  { image: "https://github.com/user-attachments/assets/369ba676-34b7-41fa-95b1-0aa33dd4b1c2" }
]
const baseDay = [
  { image: "https://github.com/user-attachments/assets/75d9ffa7-4485-4fb8-a890-5b87d523988f" },
  { image: "https://github.com/user-attachments/assets/5028bb42-f75a-4adc-9b8e-67013bc21e91" },
  { image: "https://github.com/user-attachments/assets/2a9666c2-c45b-401b-a42c-2f60bc18732d" }
]
const baseEvening = [
  { image: "https://github.com/user-attachments/assets/e30e6ac9-1c50-4392-ae08-965957c423a8" },
  { image: "https://github.com/user-attachments/assets/c661b4ae-ae4f-4f2a-90ee-ea284532938e" },
  { image: "https://github.com/user-attachments/assets/78d2ab9c-c9fe-44a8-a308-f1862a0df149" }
]

// --- LOBBY SYSTEM ---
function createRoom(){
  const name = document.getElementById("playerName").value
  const room = document.getElementById("roomId").value
  const max = document.getElementById("maxPlayers").value
  if(!name || !room) return alert("ใส่ชื่อ + ห้อง")

  // สุ่มจัดสำรับตามเกณฑ์ขั้นต่ำ-ขั้นสูงของคอสต์และคะแนนแต่ละประเภท
  const morningDeck = createCardVariants(baseMorning, 15, 1, 2, 2) // minCost:1, maxCost:2, maxPoint:2
  const dayDeck = createCardVariants(baseDay, 10, 1, 3, 3)         // minCost:1, maxCost:3, maxPoint:3
  const eveningDeck = createCardVariants(baseEvening, 5, 3, 4, 4)   // minCost:3, maxCost:4, maxPoint:4

  db.ref("rooms/" + room).set({
    maxPlayers: Number(max),
    currentPlayer: 0,
    gameStarted: false,
    reviewState: { active: false, speakerKey: "", cardData: null, approvedPlayers: [], usedParticles: [] },
    board: {
      morning: { deck: morningDeck.slice(4), open: morningDeck.slice(0, 4) },
      day: { deck: dayDeck.slice(4), open: dayDeck.slice(0, 4) },
      evening: { deck: eveningDeck.slice(4), open: eveningDeck.slice(0, 4) }
    },
    players: { p1: { name: name, score: 0, particles: [] } }
  }).then(() => { location.href = `index.html?room=${room}&name=${name}` })
}

function joinRoom(){
  const name = document.getElementById("playerName").value
  const room = document.getElementById("roomId").value
  if(!name || !room) return alert("ใส่ชื่อ + ห้อง")

  db.ref("rooms/" + room).once("value", snap => {
    const data = snap.val()
    if(!data) return alert("ไม่มีห้องนี้")
    if(data.gameStarted) return alert("ห้องเริ่มไปแล้ว")
    const playersObj = data.players || {}
    if(Object.keys(playersObj).length >= data.maxPlayers) return alert("ห้องเต็มแล้ว")
    for (let p in playersObj) { if (playersObj[p].name === name) return alert("ชื่อซ้ำ") }

    let slot = ""
    for(let i=1; i<=4; i++) { if(!playersObj["p"+i]) { slot = "p"+i; break; } }
    playersObj[slot] = { name: name, score: 0, particles: [] }
    db.ref("rooms/" + room).update({ players: playersObj }).then(() => {
      location.href = `index.html?room=${room}&name=${name}`
    })
  })
}

function leaveRoom() {
  if (!roomId || !playerName || !confirm("ออกจากห้องใช่หรือไม่?")) return
  const myKey = getMyPlayerKey()
  if (myKey) {
    db.ref(`rooms/${roomId}/players/${myKey}`).remove().then(() => {
      db.ref(`rooms/${roomId}/players`).once("value", snap => {
        if (!snap.val() || myKey === "p1") db.ref("rooms/" + roomId).remove()
        location.href = "index.html"
      })
    })
  } else { location.href = "index.html" }
}

function startGame() {
  if (players.length < 2) return alert("ต้องมี 2 คนขึ้นไป")
  db.ref(`rooms/${roomId}`).update({ gameStarted: true, currentPlayer: 0 })
}

// --- GAME STATE SYNC ---
const particles = ["の", "を", "に", "で", "と", "へ"]
const MAX_PARTICLES = 7
let players = [], currentPlayer = 0, gameStarted = false
let sentenceMode = false, selectedCardData = null, selectedParticles = []
let reviewState = { active: false, speakerKey: "", cardData: null, approvedPlayers: [], usedParticles: [] }
let serverBoard = { morning: { deck: [], open: [] }, day: { deck: [], open: [] }, evening: { deck: [], open: [] } }

function getCurrentPlayer() { return players[currentPlayer] || { key: "", name: "รอ...", score: 0, particles: [] }; }
function isMyTurn() { return gameStarted && getCurrentPlayer().name === playerName; }
function getMyPlayerKey() { const f = players.find(p => p.name === playerName); return f ? f.key : null; }
function amIHost() { const f = players.find(p => p.name === playerName); return f && f.key === "p1"; }

function checkRoomState(){
  if(roomId && playerName){
    document.getElementById("lobby").style.display = "none"
    document.getElementById("game-container").style.display = "block"
    initGameSync() 
  } else {
    document.getElementById("lobby").style.display = "flex"
    document.getElementById("game-container").style.display = "none"
  }
}

function initGameSync() {
  db.ref("rooms/" + roomId).on("value", snap => {
    const data = snap.val()
    if (!data) { location.href = "index.html"; return; }

    gameStarted = data.gameStarted || false
    reviewState = data.reviewState || { active: false, speakerKey: "", approvedPlayers: [], usedParticles: [] }

    if (data.board) {
      serverBoard.morning = data.board.morning || { deck: [], open: [] }
      serverBoard.day = data.board.day || { deck: [], open: [] }
      serverBoard.evening = data.board.evening || { deck: [], open: [] }
    }

    const playersObj = data.players || {}
    players = ["p1", "p2", "p3", "p4"]
      .filter(key => playersObj[key])
      .map(key => ({
        key,
        name: playersObj[key].name,
        score: playersObj[key].score || 0,
        particles: playersObj[key].particles || []
      }))

    if (gameStarted && players.length < 2) {
      alert("ผู้เล่นคนอื่นออกไปหมดแล้ว เกมจบลง")
      resetRoomToLobby()
      return
    }

    if (data.currentPlayer !== undefined) currentPlayer = data.currentPlayer

    renderBoard()
    renderParticles()
    renderSelectedCard()
    renderHostControl()
  })
}

// --- ACTIONS MANAGEMENT ---
function drawParticle() {
  if (!gameStarted || !isMyTurn()) return alert("ยังไม่ถึงตาของคุณ หรือเกมยังไม่เริ่ม")
  if (reviewState.active) return alert("กรุณารอระบบตรวจสอบประโยคให้เสร็จสิ้นก่อน")

  const player = getCurrentPlayer()
  const currentParticles = player.particles || []
  if (currentParticles.length >= MAX_PARTICLES) return alert("เหรียญคำช่วยบนมือเต็ม 7 อันแล้ว! ไม่สามารถสุ่มเพิ่มได้")

  const rand = particles[Math.floor(Math.random() * particles.length)]
  currentParticles.push(rand)

  alert(`🪙 คุณสุ่มได้คำช่วย "${rand}" \n(ระบบจะเพิ่มเหรียญให้และจบเทิร์นส่งต่อผู้เล่นคนถัดไป)`)
  
  let nextPlayerIndex = currentPlayer + 1
  if (nextPlayerIndex >= players.length) nextPlayerIndex = 0

  db.ref(`rooms/${roomId}`).update({
    currentPlayer: nextPlayerIndex,
    [`players/${player.key}/particles`]: currentParticles
  })
}

// --- CARD VARIATING SYSTEM (ปรับช่วงคอสต์และแต้มตามกฎชุดใหม่) ---
function createCardVariants(baseCards, totalAmount, minCost, maxCost, maxPoint) {
  const result = []
  while (result.length < totalAmount) {
    const base = baseCards[Math.floor(Math.random() * baseCards.length)]
    
    // สุ่มคอสต์ให้อยู่ในช่วง minCost ถึง maxCost พอดี
    let randomCost = minCost + Math.floor(Math.random() * (maxCost - minCost + 1))
    
    // สุ่มคะแนนโดยให้อิงตามราคาคอสต์ (+-1) แต่ต้องไม่เกินเพดานคะแนนสูงสุดของการ์ดประเภทนั้นๆ
    let randomPoints = randomCost + (Math.random() > 0.5 ? 1 : 0)
    if (randomPoints > maxPoint) randomPoints = maxPoint
    if (randomPoints < 1) randomPoints = 1

    result.push({ image: base.image, cost: randomCost, points: randomPoints })
  }
  return result
}

function startSentenceMode() {
  if (!gameStarted || !isMyTurn()) return alert("ยังไม่ถึงตาของคุณ")
  if (reviewState.active) return alert("กรุณารอระบบตรวจสอบประโยคให้เสร็จสิ้นก่อน")
  const player = getCurrentPlayer()
  if (!player.particles || player.particles.length <= 0) return alert("ไม่มีเหรียญคำช่วยให้จ่ายคอสต์")

  sentenceMode = true
  alert("✨ เลือกการ์ดบนกระดานเพื่อเริ่มจ่ายคอสต์แต่งประโยคได้เลย")
}

function selectCard(type, index) {
  if (!gameStarted || !isMyTurn() || !sentenceMode) return
  let openCards = serverBoard[type].open
  if (!openCards || !openCards[index]) return

  const needCost = openCards[index].cost
  if (getCurrentPlayer().particles.length < needCost) {
    alert("🪙 เหรียญคำช่วยมีไม่พอจ่ายคอสต์การ์ดใบนี้")
    sentenceMode = false
    return
  }

  selectedCardData = { type, index, card: openCards[index] }
  selectedParticles = []
  renderParticles()
  renderSelectedCard()
}

function toggleParticle(index) {
  if (!selectedCardData || !isMyTurn()) return
  if (selectedParticles.includes(index)) {
    selectedParticles = selectedParticles.filter(i => i !== index)
  } else {
    if (selectedParticles.length < selectedCardData.card.cost) selectedParticles.push(index)
  }
  renderParticles()
  renderSelectedCard()
}

// --- SPEAK & ONLINE REVIEW VOTING SYSTEM ---
function startSpeaking() {
  if (!isMyTurn()) return
  if (selectedParticles.length !== selectedCardData.card.cost) return alert("เลือกเหรียญคอสต์คำช่วยไม่ครบจำนวน")

  alert("🎤 เริ่มแต่งประโยคพูดออกเสียงใน Discord ได้เลย! \nผู้เล่นคนอื่นจะทำหน้าที่ตรวจสอบประโยคของคุณ");

  const player = getCurrentPlayer()
  const savedUsedParticles = selectedParticles.map(index => player.particles[index])

  selectedParticles.sort((a, b) => b - a).forEach(index => { player.particles.splice(index, 1) })

  db.ref(`rooms/${roomId}`).update({
    reviewState: {
      active: true,
      speakerKey: player.key,
      cardData: selectedCardData,
      approvedPlayers: [player.key], 
      usedParticles: savedUsedParticles
    },
    board: serverBoard,
    [`players/${player.key}/particles`]: player.particles || []
  })

  selectedCardData = null
  selectedParticles = []
  sentenceMode = false
}

function approveSentence() {
  const myKey = getMyPlayerKey()
  if (!myKey || !reviewState.active) return
  if (reviewState.approvedPlayers.includes(myKey)) return alert("คุณลงคะแนนโหวตประโยคนี้ไปแล้ว")

  reviewState.approvedPlayers.push(myKey)

  if (reviewState.approvedPlayers.length >= players.length) {
    const speaker = players.find(p => p.key === reviewState.speakerKey)
    const targetCard = reviewState.cardData.card
    let currentScore = speaker ? speaker.score : 0
    let nextScore = currentScore + targetCard.points

    alert(`🎉 ทุกคนในห้องกดยอมรับประโยคเรียบร้อย! ผู้เล่น ${speaker.name} ได้รับ +${targetCard.points} คะแนน`)

    let targetRow = serverBoard[reviewState.cardData.type]
    targetRow.open.splice(reviewState.cardData.index, 1)
    if (targetRow.deck && targetRow.deck.length > 0) {
      targetRow.open.push(targetRow.deck.shift())
    }

    if (nextScore >= 13) {
      alert(`🏆 ยินดีด้วย!! ผู้เล่น ${speaker.name} ชนะเกมนี้อย่างเป็นทางการด้วยคะแนน ${nextScore} แต้ม!`)
      resetRoomToLobby()
      return
    }

    currentPlayer++
    if (currentPlayer >= players.length) currentPlayer = 0

    db.ref(`rooms/${roomId}`).update({
      currentPlayer: currentPlayer,
      board: serverBoard,
      reviewState: { active: false, speakerKey: "", approvedPlayers: [], usedParticles: [] },
      [`players/${reviewState.speakerKey}/score`]: nextScore
    })

  } else {
    db.ref(`rooms/${roomId}/reviewState`).update({ approvedPlayers: reviewState.approvedPlayers })
  }
}

function rejectSentence() {
  if (!reviewState.active) return
  const speaker = players.find(p => p.key === reviewState.speakerKey)
  if (!speaker) return

  alert(`❌ ประโยคถูกปฏิเสธ! ระบบทำการคืนเหรียญคำช่วยให้ผู้เล่น [${speaker.name}] และให้โอกาสเลือกแอคชันใหม่อีกครั้งในเทิร์นเดิม`)

  const restoredParticles = speaker.particles || []
  if (reviewState.usedParticles) {
    reviewState.usedParticles.forEach(p => restoredParticles.push(p))
  }

  db.ref(`rooms/${roomId}`).update({
    reviewState: { active: false, speakerKey: "", approvedPlayers: [], usedParticles: [] },
    [`players/${speaker.key}/particles`]: restoredParticles
  })
}

// --- RENDER SYSTEM UI ---
function renderSelectedCard() {
  const area = document.getElementById("selected-card-area")
  if (!area) return

  if (reviewState && reviewState.active) {
    const speakerNode = players.find(p => p.key === reviewState.speakerKey)
    const speakerName = speakerNode ? speakerNode.name : "ผู้เล่น"
    const isMeSpeaker = speakerNode && speakerNode.name === playerName

    if (isMeSpeaker) {
      area.innerHTML = `
        <div class="selected-card-box" style="border-color: #ff9e00;">
          <div class="selected-card"><img src="${reviewState.cardData.card.image}"></div>
          <div>
            <h3 style="color: #ff9e00;">⏳ กำลังรอผู้เล่นคนอื่นโหวตตรวจประโยคของคุณใน Discord...</h3>
            <p style="margin: 3px 0 0 0; font-size:12px; color:#ccc;">จำนวนผู้ยอมรับแล้ว: ${reviewState.approvedPlayers.length} / ${players.length} คน</p>
          </div>
        </div>`
    } else {
      const hasIApproved = reviewState.approvedPlayers.includes(getMyPlayerKey())
      area.innerHTML = `
        <div class="selected-card-box" style="border-color: #00cc66;">
          <div class="selected-card"><img src="${reviewState.cardData.card.image}"></div>
          <div style="text-align: left;">
            <h3>🎤 ผู้เล่น [${speakerName}] กำลังแต่งประโยค</h3>
            <p style="margin:2px 0 8px 0; font-size:11px; color:#aaa;">โปรดเลือกตัดสินผลประโยคที่ได้ยิน:</p>
            ${hasIApproved 
              ? `<span style="color:#00cc66; font-size:13px; font-weight:bold;">👍 คุณลงคะแนนแล้ว (รอคนอื่นกด: ${reviewState.approvedPlayers.length}/${players.length})</span>`
              : `
                <button class="vote-btn" onclick="approveSentence()" style="margin-right:10px;">👍 ยอมรับ (ผ่าน)</button>
                <button class="vote-btn" onclick="rejectSentence()" style="background: linear-gradient(to bottom, #ff4d4d, #cc0000) !important; animation:none;">👎 ไม่ยอมรับ (ตก)</button>
              `
            }
          </div>
        </div>`
    }
    return
  }

  if (!selectedCardData) { area.innerHTML = ""; return; }
  const selectedText = selectedParticles.map(i => getCurrentPlayer().particles[i])

  area.innerHTML = `
    <div class="selected-card-box">
      <div class="selected-card"><img src="${selectedCardData.card.image}"></div>
      <div>
        <h3>ใช้คอสต์คำช่วย ${selectedCardData.card.cost} ตัว (เลือกแล้ว: ${selectedParticles.length})</h3>
        <div class="selected-particles" style="display:flex; gap:5px; margin-top:3px;">
          ${selectedText.map(p => `<div class="particle" style="width:28px; height:28px; font-size:12px;">${p}</div>`).join("")}
        </div>
        <br>
        ${isMyTurn() ? `<button class="start-btn" onclick="startSpeaking()">🎤 แต่งประโยคเสร็จสิ้น (ส่งให้เพื่อนตรวจ)</button>` : ''}
      </div>
    </div>`
}

function renderHostControl() {
  const area = document.getElementById("host-control-area")
  if (!area) return
  if (!gameStarted) {
    if (amIHost()) area.innerHTML = `<button class="start-game-btn" onclick="startGame()">▶️ เริ่มเกมการแข่งขัน (${players.length} คนพร้อม)</button>`
    else area.innerHTML = `<div class="waiting-msg" style="color:#aaa; font-size:13px;">⏳ กำลังรอหัวหน้าห้องกดเริ่มเกม...</div>`
    document.getElementById("btn-sentence").style.display = "none"
    document.getElementById("btn-draw").style.display = "none"
  } else {
    area.innerHTML = ""
    document.getElementById("btn-sentence").style.display = "inline-block"
    document.getElementById("btn-draw").style.display = "inline-block"
  }
}

function renderParticles() {
  const activeReview = reviewState && reviewState.active
  
  const p1Data = players.find(p => p.key === "p1")
  const p2Data = players.find(p => p.key === "p2")
  const p3Data = players.find(p => p.key === "p3")
  const p4Data = players.find(p => p.key === "p4")

  renderPlayerArea("player-bottom", p1Data?.particles || [], p1Data && getCurrentPlayer().key === "p1" && isMyTurn() && !activeReview, p1Data, "p1")
  renderPlayerArea("player-top", p2Data?.particles || [], p2Data && getCurrentPlayer().key === "p2" && isMyTurn() && !activeReview, p2Data, "p2")
  renderPlayerArea("player-left", p3Data?.particles || [], p3Data && getCurrentPlayer().key === "p3" && isMyTurn() && !activeReview, p3Data, "p3")
  renderPlayerArea("player-right", p4Data?.particles || [], p4Data && getCurrentPlayer().key === "p4" && isMyTurn() && !activeReview, p4Data, "p4")
}

function renderPlayerArea(areaId, particleList, clickable, targetPlayer, playerKey) {
  const area = document.getElementById(areaId)
  if (!area) return
  const nameDiv = area.previousElementSibling

  if (nameDiv && targetPlayer) {
    nameDiv.innerText = `${targetPlayer.name} (⭐${targetPlayer.score}) ${gameStarted && getCurrentPlayer().key === playerKey ? "🎤" : ""}`
  }
  if (!targetPlayer) {
    area.innerHTML = "<div style='font-size:11px; color:#666;'>ว่างเปล่า</div>"
    if(nameDiv) nameDiv.innerText = "รอผู้เล่น..."
    return
  }

  area.innerHTML = particleList.map((particle, index) => {
    const isSelected = clickable && selectedParticles.includes(index)
    return `<div class="particle ${isSelected ? "selected-particle" : ""}" ${clickable ? `onclick="toggleParticle(${index})"` : ""}>${particle}</div>`
  }).join("")
}

function renderBoard() {
  if (players.length === 0) return
  document.getElementById("score-area").innerHTML = players.map(p => `${p.name}: ${p.score} แต้ม`).join(" | ")
  
  if (!gameStarted) document.getElementById("turn-area").innerHTML = `💤 กำลังจัดเตรียมห้องเกม...`
  else document.getElementById("turn-area").innerHTML = `🎤 ตาของผู้เล่น: ${getCurrentPlayer().name}`

  const boardElement = document.getElementById("board")
  if (!boardElement) return
  boardElement.innerHTML = `
    ${renderRow("☀️ Morning", "morning", serverBoard.morning.deck, serverBoard.morning.open)}
    ${renderRow("🌤 Day", "day", serverBoard.day.deck, serverBoard.day.open)}
    ${renderRow("🌙 Evening", "evening", serverBoard.evening.deck, serverBoard.evening.open)}
  `
}

function renderRow(title, className, deck, openCards) {
  return `
    <div class="row ${className}">
      <div class="row-title">${title}</div>
      <div class="cards">
        <div class="deck">${deck ? deck.length : 0}</div>
        ${openCards.map((card, index) => {
          if (!card) return ""
          return `
            <div class="card" onclick="selectCard('${className}', ${index})">
              <div class="card-top"><div class="cost">C:${card.cost}</div><div class="points">⭐${card.points}</div></div>
              <img src="${card.image}">
            </div>`
        }).join("")}
      </div>
    </div>`
}

function resetRoomToLobby() {
  if (!roomId) return
  const morningDeck = createCardVariants(baseMorning, 15, 1, 2, 2)
  const dayDeck = createCardVariants(baseDay, 10, 1, 3, 3)
  const eveningDeck = createCardVariants(baseEvening, 5, 3, 4, 4)
  const updates = {}
  updates[`rooms/${roomId}/gameStarted`] = false
  updates[`rooms/${roomId}/currentPlayer`] = 0
  updates[`rooms/${roomId}/reviewState`] = { active: false, speakerKey: "", approvedPlayers: [], usedParticles: [] }
  updates[`rooms/${roomId}/board`] = {
    morning: { deck: morningDeck.slice(4), open: morningDeck.slice(0, 4) },
    day: { deck: dayDeck.slice(4), open: dayDeck.slice(0, 4) },
    evening: { deck: eveningDeck.slice(4), open: eveningDeck.slice(0, 4) }
  }
  players.forEach(p => { updates[`rooms/${roomId}/players/${p.key}/score`] = 0; updates[`rooms/${roomId}/players/${p.key}/particles`] = []; })
  db.ref().update(updates)
}

checkRoomState()
