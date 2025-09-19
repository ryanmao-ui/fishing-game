// ----------- Data Models -----------
class Fish {
    constructor(name, price, rarity, pixels, color) {
        this.name = name;
        this.price = price;
        this.rarity = rarity;
        this.pixels = pixels;
        this.color = color;
    }
}
class FishingRod {
    constructor(name, speed, quality, price) {
        this.name = name;
        this.speed = speed;
        this.quality = quality;
        this.price = price;
    }
}
class Place {
    constructor(name, rarity, price) {
        this.name = name;
        this.rarity = rarity;
        this.price = price;
    }
}
class Mine {
    constructor(level = 1) {
        this.level = level;
        this.baseGold = 0.3; // (was 1) now balanced to be much lower than fishing
    }
    getGoldPerClick() {
        // Scaling is much slower than fishing
        return +(this.baseGold * Math.pow(1.4, this.level - 1)).toFixed(2);
    }
    getUpgradeCost() {
        return Math.round(130 * Math.pow(2.3, this.level - 1));
    }
    getAutoGoldPerSec() {
        // Passive is very small
        return +(this.level > 1 ? (this.level - 1) * 0.07 : 0).toFixed(2);
    }
}
class Player {
    constructor(name) {
        this.name = name;
        this.money = 10.0;
        this.fishes = [];
        this.rods = [new FishingRod("Basic Rod", 5, 1, 0)];
        this.currentRod = this.rods[0];
        this.places = [new Place("Pond", 1, 0)];
        this.currentPlace = this.places[0];
        this.lastFishTime = 0;
        this.maxInventory = 10;
        this.mine = new Mine();
        this.totalGoldMined = 0;
    }
}
const FISH_TEMPLATES = [
    { name: "Tiny Carp", pixels: [[0,1,1,0], [1,1,1,1], [0,1,1,0]], color: "#c2b280", rarity: "common" },
    { name: "Blue Bass", pixels: [[0,0,1,1,0,0],[1,1,1,1,1,1],[0,1,1,1,1,0],[0,0,1,1,0,0]], color: "#228be6", rarity: "common" },
    { name: "Red Salmon", pixels: [[0,1,1,0,0],[1,1,1,1,1],[0,1,1,1,0]], color: "#fa5252", rarity: "rare" },
    { name: "Green Trout", pixels: [[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0]], color: "#40c057", rarity: "rare" },
    { name: "Legendary Dragonfish", pixels: [[0,0,1,1,1,0,0],[0,1,1,1,1,1,0],[1,1,1,1,1,1,1],[0,1,1,1,1,1,0],[0,0,1,1,1,0,0]], color: "#fab005", rarity: "legendary" }
];
const rodShop = [
    new FishingRod("Super Rod", 3, 3, 200),
    new FishingRod("Ultra Rod", 1, 10, 2000),
    new FishingRod("Legend Rod", 0.5, 50, 8000)
];
const placeShop = [
    new Place("River", 2, 1000),
    new Place("Lake", 5, 5000),
    new Place("Ocean", 10, 20000)
];
let player = new Player("Player");
let lastActivity = "fishing";
let lastCategory = "fish";

// ----------- UI Rendering -----------
function updateStats() {
    document.getElementById('money-box').textContent =
        `money$: $${player.money.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    document.getElementById('place-box').textContent =
        `Place: ${player.currentPlace.name}`;
    document.getElementById('fishes-box').textContent =
        `Fishes: ${player.fishes.length}/${player.maxInventory}`;
    document.getElementById('goldmine-box').textContent =
        `Gold Mine Level: ${player.mine.level}`;
    document.getElementById('click-box').textContent =
        `$ per click: ${player.mine.getGoldPerClick().toLocaleString(undefined, {maximumFractionDigits:2})}`;
    document.getElementById('passive-box').textContent =
        `Passive $/sec: ${player.mine.getAutoGoldPerSec().toLocaleString(undefined, {maximumFractionDigits:2})}`;
    document.getElementById('rod-box').textContent =
        `Rod: ${player.currentRod.name}`;
    showSideActions();
}
function showSideActions() {
    document.getElementById('fishing-actions-section').style.display = lastActivity === "fishing" ? "" : "none";
    document.getElementById('sidebar-fish').style.display = lastActivity === "fishing" ? "" : "none";
    document.getElementById('sidebar-sell').style.display = lastActivity === "fishing" ? "" : "none";
    document.getElementById('sidebar-rod').style.display = lastActivity === "fishing" ? "" : "none";
    document.getElementById('sidebar-place').style.display = lastActivity === "fishing" ? "" : "none";
    document.getElementById('sidebar-inventory').style.display = lastActivity === "fishing" ? "" : "none";
    document.getElementById('mining-actions-section').style.display = lastActivity === "mining" ? "" : "none";
    document.getElementById('sidebar-mine').style.display = lastActivity === "mining" ? "" : "none";
    document.getElementById('sidebar-upgrade-mine').style.display = lastActivity === "mining" ? "" : "none";
    document.getElementById('sidebar-mining-inventory').style.display = lastActivity === "mining" ? "" : "none";
    document.getElementById('gamble-actions-section').style.display = "";
    document.getElementById('sidebar-gamble').style.display = "";
}
function showInventory() {
    let panel = document.getElementById('action-panel');
    let html = "<h3>Inventory</h3><ul class='inventory-list'>";
    if (player.fishes.length === 0) html += "<li>No fishes</li>";
    else player.fishes.forEach((f, i) => {
        html += `<li>
            <canvas width="56" height="32" class="pixel-fish" id="fish-canvas-${i}"></canvas>
            ${f.name} ($${f.price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}) [${f.rarity}]
        </li>`;
    });
    html += "</ul><h4>Rods</h4><ul>";
    player.rods.forEach(r => {
        html += `<li>${r.name} (Speed: ${r.speed}, Quality: ${r.quality})</li>`;
    });
    html += "</ul><h4>Places</h4><ul>";
    player.places.forEach(p => {
        html += `<li>${p.name} (Rarity: ${p.rarity})</li>`;
    });
    panel.innerHTML = html;
    player.fishes.forEach((f, i) => drawFishCanvas(f, `fish-canvas-${i}`));
}
function setActivity(act) {
    lastActivity = act;
    Array.from(document.querySelectorAll('.sidebar-category')).forEach(e => e.classList.remove('active'));
    if (act === "fishing") {
        document.getElementById('sidebar-fishing').classList.add('active');
        setCategory("fish");
    } else if (act === "mining") {
        document.getElementById('sidebar-mining').classList.add('active');
        minePanel();
    }
    updateStats();
}
function setCategory(cat) {
    lastCategory = cat;
    Array.from(document.querySelectorAll('.sidebar-category')).forEach(e => e.classList.remove('active'));
    if (lastActivity === "fishing") document.getElementById('sidebar-fishing').classList.add('active');
    if (lastActivity === "mining") document.getElementById('sidebar-mining').classList.add('active');
    let catMap = {
        "fish": "sidebar-fish",
        "sell": "sidebar-sell",
        "rod": "sidebar-rod",
        "place": "sidebar-place",
        "inventory": lastActivity === "fishing" ? "sidebar-inventory" : "sidebar-mining-inventory",
        "mine": "sidebar-mine",
        "upgrade_mine": "sidebar-upgrade-mine",
        "gamble": "sidebar-gamble"
    };
    if (catMap[cat]) document.getElementById(catMap[cat]).classList.add('active');
    let categories = {
        "fish": fishPanel,
        "sell": showSellFish,
        "rod": showRodShop,
        "place": showPlaceShop,
        "inventory": showInventory,
        "mine": minePanel,
        "upgrade_mine": upgradeMinePanel,
        "gamble": showGamble
    };
    if (categories[cat]) categories[cat]();
}
let fishWaitInterval = null;
function fishPanel() {
    let panel = document.getElementById('action-panel');
    let invMsg = "";
    let timeLeft = Math.ceil((60000 - (Date.now() - player.lastFishTime)) / 1000);
    let waitMsg = "";
    if (Date.now() - player.lastFishTime < 60000) {
        waitMsg = `<span style="color:#fa5252;">Please wait <span id="fish-wait">${timeLeft}</span>s before fishing again.</span>`;
        if (!fishWaitInterval) {
            fishWaitInterval = setInterval(() => {
                let t = Math.ceil((60000 - (Date.now() - player.lastFishTime)) / 1000);
                let el = document.getElementById('fish-wait');
                if (el) el.textContent = t > 0 ? t : 0;
                if (t <= 0) {
                    clearInterval(fishWaitInterval);
                    fishWaitInterval = null;
                    fishPanel();
                }
            }, 500);
        }
    }
    if (player.fishes.length >= player.maxInventory) {
        invMsg = `<span style="color:#fa5252;">Inventory full! Sell or gamble fish first.</span>`;
    }
    let disabled = (waitMsg || invMsg) ? "disabled" : "";
    panel.innerHTML = `
        <h3>Go Fishing</h3>
        <button onclick="fish()" style="padding:10px 20px;" ${disabled}>🎣 Cast!</button>
        <div>${waitMsg}</div>
        <div>${invMsg}</div>
    `;
}
function fish() {
    if (Date.now() - player.lastFishTime < 60000 || player.fishes.length >= player.maxInventory) {
        fishPanel(); return;
    }
    player.lastFishTime = Date.now();
    let rodQuality = player.currentRod.quality;
    let placeRarity = player.currentPlace.rarity;
    let roll = Math.random();
    let fishIdx;
    if (roll < 0.60) fishIdx = Math.floor(Math.random() * 2); // common
    else if (roll < 0.95) fishIdx = 2 + Math.floor(Math.random() * 2); // rare
    else fishIdx = 4; // legendary
    let template = FISH_TEMPLATES[fishIdx];
    let baseMin = template.rarity === "common" ? 2 : template.rarity === "rare" ? 12 : 1000;
    let baseMax = template.rarity === "common" ? 10 : template.rarity === "rare" ? 200 : 100000;
    let price = +(Math.random() * (baseMax - baseMin) + baseMin).toFixed(2);
    price *= rodQuality * placeRarity / 5;
    price = Math.max(0.1, +price.toFixed(2));
    let name = (template.rarity === "legendary" ? "Legendary " : "") + template.name;
    let fishObj = new Fish(name, price, template.rarity, template.pixels, template.color);
    player.fishes.push(fishObj);
    updateStats();
    document.getElementById('action-panel').innerHTML =
        `<p>You caught a <b>${fishObj.name}</b> worth <b>$${fishObj.price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</b>!</p>
        <canvas width="70" height="40" class="pixel-fish" id="just-caught"></canvas>`;
    drawFishCanvas(fishObj, "just-caught");
}
function drawFishCanvas(fish, canvasId) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return;
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let px = fish.pixels;
    let block = 8;
    let ox = Math.floor((canvas.width - px[0].length * block)/2);
    let oy = Math.floor((canvas.height - px.length * block)/2);
    for (let y=0; y<px.length; y++)
        for (let x=0; x<px[0].length; x++)
            if (px[y][x])
                ctx.fillStyle = fish.color,
                ctx.fillRect(ox+x*block, oy+y*block, block, block);
}
function showSellFish() {
    let panel = document.getElementById('action-panel');
    if (player.fishes.length === 0) {
        panel.innerHTML = "<p>No fishes to sell!</p>";
        return;
    }
    let html = "<h3>Sell Fish</h3><ul class='inventory-list'>";
    player.fishes.forEach((fish, i) => {
        html += `<li>
            <canvas width="56" height="32" class="pixel-fish" id="sell-fish-canvas-${i}"></canvas>
            ${fish.name} ($${fish.price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}) [${fish.rarity}]
            <button onclick="sellFish(${i})">Sell</button>
        </li>`;
    });
    html += "</ul>";
    panel.innerHTML = html;
    player.fishes.forEach((f, i) => drawFishCanvas(f, `sell-fish-canvas-${i}`));
}
function sellFish(idx) {
    let fish = player.fishes[idx];
    player.money += fish.price;
    player.fishes.splice(idx, 1);
    updateStats();
    showSellFish();
}
function showRodShop() {
    let panel = document.getElementById('action-panel');
    let html = "<h3>Rod Shop</h3><ul class='shop-list'>";
    rodShop.forEach((rod, i) => {
        html += `<li>${rod.name} (Speed: ${rod.speed}, Quality: ${rod.quality}) - $${rod.price.toLocaleString()}
            <button onclick="buyRod(${i})">Buy</button></li>`;
    });
    html += "</ul>";
    panel.innerHTML = html;
}
function buyRod(idx) {
    let rod = rodShop[idx];
    if (player.money >= rod.price && !player.rods.find(r => r.name === rod.name)) {
        player.money -= rod.price;
        player.rods.push(rod);
        player.currentRod = rod;
        updateStats();
        document.getElementById('action-panel').innerHTML =
            `<p>Purchased <b>${rod.name}</b> and equipped it!</p>`;
    } else if (player.rods.find(r => r.name === rod.name)) {
        document.getElementById('action-panel').innerHTML = `<p>You already own this rod!</p>`;
    } else {
        document.getElementById('action-panel').innerHTML = `<p>Not enough money!</p>`;
    }
}
function showPlaceShop() {
    let panel = document.getElementById('action-panel');
    let html = "<h3>Place Shop</h3><ul class='shop-list'>";
    placeShop.forEach((place, i) => {
        html += `<li>${place.name} (Rarity: ${place.rarity}) - $${place.price.toLocaleString()}
            <button onclick="buyPlace(${i})">Buy</button></li>`;
    });
    html += "</ul>";
    panel.innerHTML = html;
}
function buyPlace(idx) {
    let place = placeShop[idx];
    if (player.money >= place.price && !player.places.find(p => p.name === place.name)) {
        player.money -= place.price;
        player.places.push(place);
        player.currentPlace = place;
        updateStats();
        document.getElementById('action-panel').innerHTML =
            `<p>Unlocked and moved to <b>${place.name}</b>!</p>`;
    } else if (player.places.find(p => p.name === place.name)) {
        document.getElementById('action-panel').innerHTML = `<p>You already unlocked this place!</p>`;
    } else {
        document.getElementById('action-panel').innerHTML = `<p>Not enough money!</p>`;
    }
}
function showGamble() {
    let panel = document.getElementById('action-panel');
    panel.innerHTML = `
        <h3>Gamble</h3>
        <p>Gamble your money OR your fish!</p>
        <button class="gamble-btn" onclick="gambleMoneyPanel()">Gamble Money</button>
        <button class="gamble-btn" onclick="gambleFishPanel()">Gamble Fish</button>
    `;
}
function gambleMoneyPanel() {
    let panel = document.getElementById('action-panel');
    panel.innerHTML = `
        <h4>Gamble Your Money</h4>
        <button class="gamble-btn" onclick="gambleRoulette()">Roulette</button>
        <button class="gamble-btn" onclick="gambleDice()">Dice</button>
        <button class="gamble-btn" onclick="gambleCoin()">Coin Flip</button>
    `;
}
function gambleRoulette() {
    let panel = document.getElementById('action-panel');
    panel.innerHTML = `
        <h4>Roulette</h4>
        <label>Bet Amount: <input type="number" id="roulette-bet" min="0.01" step="0.01"></label><br>
        <label>Pick a number (0-36): <input type="number" id="roulette-num" min="0" max="36"></label>
        <button onclick="playRoulette()">Spin!</button>
    `;
}
function playRoulette() {
    let bet = Number(document.getElementById('roulette-bet').value);
    let pick = Number(document.getElementById('roulette-num').value);
    if (bet > player.money || bet <= 0 || pick < 0 || pick > 36) {
        alert('Invalid bet or pick.');
        return;
    }
    let roll = Math.floor(Math.random() * 37);
    let win = (pick === roll);
    if (win) {
        player.money += bet * 35;
        document.getElementById('action-panel').innerHTML =
            `<p class="result-win">Roulette landed on ${roll}! Jackpot! You win $${(bet*35).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}!</p>`;
    } else {
        player.money -= bet;
        document.getElementById('action-panel').innerHTML =
            `<p class="result-lose">Roulette landed on ${roll}. You lose your bet.</p>`;
    }
    updateStats();
}
function gambleDice() {
    let panel = document.getElementById('action-panel');
    panel.innerHTML = `
        <h4>Dice</h4>
        <label>Bet Amount: <input type="number" id="dice-bet" min="0.01" step="0.01"></label><br>
        <label>Pick (1-6): <input type="number" id="dice-num" min="1" max="6"></label>
        <button onclick="playDice()">Roll!</button>
    `;
}
function playDice() {
    let bet = Number(document.getElementById('dice-bet').value);
    let pick = Number(document.getElementById('dice-num').value);
    if (bet > player.money || bet <= 0 || pick < 1 || pick > 6) {
        alert('Invalid bet or pick.');
        return;
    }
    let roll = Math.floor(Math.random() * 6) + 1;
    let win = (pick === roll);
    if (win) {
        player.money += bet * 5;
        document.getElementById('action-panel').innerHTML =
            `<p class="result-win">Dice rolled ${roll}! You win $${(bet*5).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}!</p>`;
    } else {
        player.money -= bet;
        document.getElementById('action-panel').innerHTML =
            `<p class="result-lose">Dice rolled ${roll}. You lose your bet.</p>`;
    }
    updateStats();
}
function gambleCoin() {
    let panel = document.getElementById('action-panel');
    panel.innerHTML = `
        <h4>Coin Flip</h4>
        <label>Bet Amount: <input type="number" id="coin-bet" min="0.01" step="0.01"></label><br>
        <label>Pick (h/t): <input type="text" id="coin-pick" maxlength="1" placeholder="h or t"></label>
        <button onclick="playCoin()">Flip!</button>
    `;
}
function playCoin() {
    let bet = Number(document.getElementById('coin-bet').value);
    let pick = document.getElementById('coin-pick').value.toLowerCase();
    if (bet > player.money || bet <= 0 || !(pick === 'h' || pick === 't')) {
        alert('Invalid bet or pick.');
        return;
    }
    let result = Math.random() < 0.5 ? 'h' : 't';
    let win = (pick === result);
    if (win) {
        player.money += bet * 2;
        document.getElementById('action-panel').innerHTML =
            `<p class="result-win">Coin landed on ${result === 'h' ? 'heads' : 'tails'}! You win $${(bet*2).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}!</p>`;
    } else {
        player.money -= bet;
        document.getElementById('action-panel').innerHTML =
            `<p class="result-lose">Coin landed on ${result === 'h' ? 'heads' : 'tails'}. You lose your bet.</p>`;
    }
    updateStats();
}
function gambleFishPanel() {
    let panel = document.getElementById('action-panel');
    if (player.fishes.length === 0) {
        panel.innerHTML = "<p>No fishes to gamble!</p>";
        return;
    }
    let html = "<h4>Pick a fish to gamble:</h4><ul class='inventory-list'>";
    player.fishes.forEach((fish, i) => {
        html += `<li class="selected-fish">
            <canvas width="56" height="32" class="pixel-fish" id="gamble-fish-canvas-${i}"></canvas>
            ${fish.name} ($${fish.price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}) [${fish.rarity}]
            <button onclick="startFishGamble(${i})">Gamble</button>
        </li>`;
    });
    html += "</ul>";
    panel.innerHTML = html;
    player.fishes.forEach((f, i) => drawFishCanvas(f, `gamble-fish-canvas-${i}`));
}
function startFishGamble(idx) {
    let panel = document.getElementById('action-panel');
    let fish = player.fishes[idx];
    panel.innerHTML = `
        <h4>Gamble "${fish.name}" ($${fish.price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})})</h4>
        <canvas width="70" height="40" class="pixel-fish" id="gamble-just-caught"></canvas>
        <button class="gamble-btn" onclick="gambleFishRoulette(${idx})">Roulette</button>
        <button class="gamble-btn" onclick="gambleFishDice(${idx})">Dice</button>
        <button class="gamble-btn" onclick="gambleFishCoin(${idx})">Coin Flip</button>
    `;
    drawFishCanvas(fish, "gamble-just-caught");
}
function gambleFishRoulette(idx) {
    let panel = document.getElementById('action-panel');
    panel.innerHTML = `
        <h4>Roulette</h4>
        <label>Pick a number (0-36): <input type="number" id="roulette-fish-num" min="0" max="36"></label>
        <button onclick="playFishRoulette(${idx})">Spin!</button>
    `;
}
function playFishRoulette(idx) {
    let pick = Number(document.getElementById('roulette-fish-num').value);
    let roll = Math.floor(Math.random() * 37);
    let fish = player.fishes[idx];
    let win = (pick === roll);
    if (win) {
        let gain = fish.price * 2;
        player.money += gain;
        player.fishes.splice(idx, 1);
        document.getElementById('action-panel').innerHTML =
            `<p class="result-win">Roulette landed on ${roll}! You won and got $${gain.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} for your fish!</p>`;
    } else {
        player.fishes.splice(idx, 1);
        document.getElementById('action-panel').innerHTML =
            `<p class="result-lose">Roulette landed on ${roll}. You lost your fish!</p>`;
    }
    updateStats();
}
function gambleFishDice(idx) {
    let panel = document.getElementById('action-panel');
    panel.innerHTML = `
        <h4>Dice</h4>
        <label>Pick (1-6): <input type="number" id="dice-fish-num" min="1" max="6"></label>
        <button onclick="playFishDice(${idx})">Roll!</button>
    `;
}
function playFishDice(idx) {
    let pick = Number(document.getElementById('dice-fish-num').value);
    let roll = Math.floor(Math.random() * 6) + 1;
    let fish = player.fishes[idx];
    let win = (pick === roll);
    if (win) {
        let gain = fish.price * 2;
        player.money += gain;
        player.fishes.splice(idx, 1);
        document.getElementById('action-panel').innerHTML =
            `<p class="result-win">Dice rolled ${roll}! You won and got $${gain.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} for your fish!</p>`;
    } else {
        player.fishes.splice(idx, 1);
        document.getElementById('action-panel').innerHTML =
            `<p class="result-lose">Dice rolled ${roll}. You lost your fish!</p>`;
    }
    updateStats();
}
function gambleFishCoin(idx) {
    let panel = document.getElementById('action-panel');
    panel.innerHTML = `
        <h4>Coin Flip</h4>
        <label>Pick (h/t): <input type="text" id="coin-fish-pick" maxlength="1" placeholder="h or t"></label>
        <button onclick="playFishCoin(${idx})">Flip!</button>
    `;
}
function playFishCoin(idx) {
    let pick = document.getElementById('coin-fish-pick').value.toLowerCase();
    let result = Math.random() < 0.5 ? 'h' : 't';
    let fish = player.fishes[idx];
    let win = (pick === result);
    if (win) {
        let gain = fish.price * 2;
        player.money += gain;
        player.fishes.splice(idx, 1);
        document.getElementById('action-panel').innerHTML =
            `<p class="result-win">Coin landed on ${result === 'h' ? 'heads' : 'tails'}! You won and got $${gain.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} for your fish!</p>`;
    } else {
        player.fishes.splice(idx, 1);
        document.getElementById('action-panel').innerHTML =
            `<p class="result-lose">Coin landed on ${result === 'h' ? 'heads' : 'tails'}. You lost your fish!</p>`;
    }
    updateStats();
}
function minePanel() {
    let panel = document.getElementById('action-panel');
    panel.innerHTML = `
        <h3>Gold Mine</h3>
        <p>Click to mine gold! Upgrade for more gold per click and passive gold.</p>
        <button onclick="mineGold()" style="font-size:1.2em;padding:12px 28px;">⛏️ Mine Gold!</button>
        <p id="mine-gold-message"></p>
        <p>Total Gold Mined: <span id="mine-total">${player.totalGoldMined.toLocaleString(undefined, {maximumFractionDigits:2})}</span></p>
    `;
}
function mineGold() {
    let gold = player.mine.getGoldPerClick();
    player.money += gold;
    player.totalGoldMined += gold;
    updateStats();
    document.getElementById('mine-gold-message').textContent = `You mined ${gold.toLocaleString(undefined, {maximumFractionDigits:2})} money$!`;
    document.getElementById('mine-total').textContent = player.totalGoldMined.toLocaleString(undefined, {maximumFractionDigits:2});
}
setInterval(() => {
    let passive = player.mine.getAutoGoldPerSec();
    if (passive > 0) {
        player.money += passive;
        player.totalGoldMined += passive;
        updateStats();
        if (lastActivity === "mining") {
            let el = document.getElementById('mine-total');
            if (el) el.textContent = player.totalGoldMined.toLocaleString(undefined, {maximumFractionDigits:2});
        }
    }
}, 1000);
function upgradeMinePanel() {
    let panel = document.getElementById('action-panel');
    let cost = player.mine.getUpgradeCost();
    panel.innerHTML = `
        <h3>Upgrade Mine</h3>
        <p>Current Level: ${player.mine.level}</p>
        <p>Gold per Click: ${player.mine.getGoldPerClick().toLocaleString(undefined, {maximumFractionDigits:2})}</p>
        <p>Passive Gold/sec: ${player.mine.getAutoGoldPerSec().toLocaleString(undefined, {maximumFractionDigits:2})}</p>
        <button onclick="upgradeMine()" ${player.money < cost ? "disabled" : ""}>Upgrade for $${cost.toLocaleString()}</button>
        <p>${player.money < cost ? "<span style='color:#fa5252;'>Not enough money!</span>" : ""}</p>
    `;
}
function upgradeMine() {
    let cost = player.mine.getUpgradeCost();
    if (player.money >= cost) {
        player.money -= cost;
        player.mine.level += 1;
        updateStats();
        upgradeMinePanel();
    }
}
window.onload = function() {
    updateStats();
    setActivity(lastActivity);
};
