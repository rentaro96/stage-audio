// =============================================
// STAGE AUDIO
// =============================================

let player = null;
let playerReady = false;

let cues = [];
let currentCueIndex = -1;
let currentSourceType = null;

let selectedFadeTime = 3;
let fadeInterval = null;
let toastTimer = null;

const localAudio = document.getElementById("localAudio");
const nowPlaying = document.getElementById("nowPlaying");
const playPauseButton = document.getElementById("playPauseButton");
const stopButton = document.getElementById("stopButton");
const fadeButton = document.getElementById("fadeButton");
const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");
const cueList = document.getElementById("cueList");
const youtubeModeButton = document.getElementById("youtubeModeButton");
const youtubeAddArea = document.getElementById("youtubeAddArea");
const youtubeUrlInput = document.getElementById("youtubeUrl");
const cueNameInput = document.getElementById("cueName");
const saveCueButton = document.getElementById("saveCueButton");
const audioFileButton = document.getElementById("audioFileButton");
const audioFileInput = document.getElementById("audioFileInput");
const audioFileArea = document.getElementById("audioFileArea");
const audioFileStatus = document.getElementById("audioFileStatus");
const customFadeButton = document.getElementById("customFadeButton");
const customFadeArea = document.getElementById("customFadeArea");
const customFadeInput = document.getElementById("customFadeInput");
const addCustomFadeButton = document.getElementById("addCustomFadeButton");
const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const shareButton = document.getElementById("shareButton");
const sharePanel = document.getElementById("sharePanel");
const sharePanelMessage = document.getElementById("sharePanelMessage");
const shareUrlInput = document.getElementById("shareUrlInput");
const copyShareUrlButton = document.getElementById("copyShareUrlButton");
const closeSharePanelButton = document.getElementById("closeSharePanelButton");
const toast = document.getElementById("toast");


// =============================================
// YouTube API
// =============================================

const youtubeScript = document.createElement("script");
youtubeScript.src = "https://www.youtube.com/iframe_api";

const firstScript = document.getElementsByTagName("script")[0];
firstScript.parentNode.insertBefore(youtubeScript, firstScript);

window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("player", {
        width: "100%",
        height: "100%",

        playerVars: {
            controls: 0,
            rel: 0,
            playsinline: 1
        },

        events: {
            onReady: function () {
                playerReady = true;
                player.setVolume(getSelectedVolume());
            },

            onStateChange: onPlayerStateChange
        }
    });
};


// =============================================
// YouTube CUE追加
// =============================================

saveCueButton.addEventListener("click", addYouTubeCue);

youtubeModeButton.addEventListener("click", function () {
    youtubeAddArea.classList.remove("hidden");
    youtubeUrlInput.focus();
});

youtubeUrlInput.addEventListener("keydown", addYouTubeCueFromEnter);
cueNameInput.addEventListener("keydown", addYouTubeCueFromEnter);

function addYouTubeCueFromEnter(event) {
    if (event.key !== "Enter") {
        return;
    }

    addYouTubeCue();
}

function addYouTubeCue() {
    const url = youtubeUrlInput.value.trim();
    const name = cueNameInput.value.trim();
    const videoId = getYouTubeID(url);

    if (!videoId) {
        alert("正しいYouTube URLを入力してください。");
        return;
    }

    cues.push({
        id: makeCueId(),
        type: "youtube",
        name: name || "名称未設定",
        url,
        videoId
    });

    saveCues();
    renderCueList();

    youtubeUrlInput.value = "";
    cueNameInput.value = "";

    showToast("YouTubeを追加しました");
}

function getYouTubeID(url) {
    try {
        const parsedUrl = new URL(url);

        if (parsedUrl.hostname.includes("youtu.be")) {
            return parsedUrl.pathname.substring(1).split("/")[0];
        }

        if (parsedUrl.searchParams.get("v")) {
            return parsedUrl.searchParams.get("v");
        }

        if (parsedUrl.pathname.includes("/shorts/")) {
            return parsedUrl.pathname.split("/shorts/")[1].split("/")[0];
        }

        if (parsedUrl.pathname.includes("/embed/")) {
            return parsedUrl.pathname.split("/embed/")[1].split("/")[0];
        }
    } catch {
        return null;
    }

    return null;
}


// =============================================
// ローカル音源追加
// =============================================

audioFileButton.addEventListener("click", function () {
    showAudioFileArea("ファイル選択画面を開いています。");
});

audioFileButton.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }

    event.preventDefault();
    showAudioFileArea("ファイル選択画面を開いています。");
    audioFileInput.click();
});

audioFileInput.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) {
        showAudioFileArea("ファイル選択がキャンセルされました。");
        return;
    }

    if (!isAudioFile(file)) {
        showAudioFileArea("音声ファイルを選択してください。");
        alert("音声ファイルを選択してください。");
        this.value = "";
        return;
    }

    const objectUrl = URL.createObjectURL(file);
    const cueName = file.name.replace(/\.[^/.]+$/, "") || file.name;

    cues.push({
        id: makeCueId(),
        type: "local",
        name: cueName,
        fileName: file.name,
        objectUrl
    });

    renderCueList();
    showAudioFileArea(`「${file.name}」を追加しました。`);

    this.value = "";

    showToast("音源ファイルを追加しました");
});

function showAudioFileArea(message) {
    audioFileArea.classList.remove("hidden");
    audioFileStatus.textContent = message;
}

function isAudioFile(file) {
    if (file.type && file.type.startsWith("audio/")) {
        return true;
    }

    return /\.(aac|aif|aiff|flac|m4a|mp3|ogg|wav|weba)$/i.test(file.name);
}


// =============================================
// CUE LIST
// =============================================

function renderCueList() {
    if (cues.length === 0) {
        cueList.innerHTML = `
            <div class="empty-message">
                まだCUEがありません。<br>
                YouTubeまたは音源ファイルを追加してください。
            </div>
        `;

        return;
    }

    cueList.innerHTML = "";

    cues.forEach((cue, index) => {
        const item = document.createElement("div");
        item.className = "cue-item";

        if (index === currentCueIndex) {
            item.classList.add("current");
        }

        const number = document.createElement("div");
        number.className = "cue-number";
        number.textContent = String(index + 1).padStart(2, "0");

        const type = document.createElement("div");
        type.className = "cue-type";
        type.textContent = cue.type === "youtube" ? "YouTube" : "AUDIO";

        const name = document.createElement("div");
        name.className = "cue-name";
        name.textContent = cue.name;

        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.textContent = "▶ 再生";
        playButton.addEventListener("click", function () {
            playCue(index);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "×";
        deleteButton.addEventListener("click", function () {
            deleteCue(index);
        });

        item.append(number, type, name, playButton, deleteButton);
        cueList.appendChild(item);
    });
}


// =============================================
// CUE再生
// =============================================

function playCue(index) {
    const cue = cues[index];

    if (!cue) {
        return;
    }

    cancelFade();
    stopEverything(false);

    currentCueIndex = index;
    currentSourceType = cue.type;
    nowPlaying.textContent = cue.name;

    const volume = getSelectedVolume();

    if (cue.type === "youtube") {
        if (!playerReady) {
            showToast("YouTubeプレイヤーを準備中です");
            return;
        }

        localAudio.pause();
        player.setVolume(volume);
        player.loadVideoById(cue.videoId);
    } else {
        if (!cue.objectUrl) {
            alert("この音源ファイルをもう一度追加してください。");
            return;
        }

        if (playerReady) {
            player.stopVideo();
        }

        localAudio.src = cue.objectUrl;
        localAudio.volume = volume / 100;
        localAudio.currentTime = 0;

        localAudio.play().catch(() => {
            alert("音源を再生できませんでした。");
        });
    }

    renderCueList();
}


// =============================================
// PLAY / PAUSE
// =============================================

playPauseButton.addEventListener("click", togglePlayPause);

function togglePlayPause() {
    if (currentCueIndex === -1) {
        if (cues.length > 0) {
            playCue(0);
        } else {
            showToast("先に音源を追加してください");
        }

        return;
    }

    if (currentSourceType === "youtube") {
        if (!playerReady) {
            showToast("YouTubeプレイヤーを準備中です");
            return;
        }

        const state = player.getPlayerState();

        if (state === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    } else if (currentSourceType === "local") {
        if (localAudio.paused) {
            localAudio.play();
        } else {
            localAudio.pause();
        }
    }
}


// =============================================
// STOP
// =============================================

stopButton.addEventListener("click", function () {
    cancelFade();
    stopEverything(true);
});

function stopEverything(resetButton = true) {
    if (playerReady) {
        player.stopVideo();
    }

    localAudio.pause();

    try {
        localAudio.currentTime = 0;
    } catch {
        // Some browsers reject seeking before a source is ready.
    }

    if (resetButton) {
        playPauseButton.textContent = "▶ 再生";
    }
}


// =============================================
// VOLUME
// =============================================

volumeSlider.addEventListener("input", function () {
    const volume = Number(this.value);

    updateVolumeDisplay(volume);
    setCurrentVolume(volume);
});

function getSelectedVolume() {
    return Number(volumeSlider.value);
}

function updateVolumeDisplay(volume) {
    const roundedVolume = Math.round(volume);

    volumeSlider.value = roundedVolume;
    volumeValue.textContent = roundedVolume + "%";
}

function setCurrentVolume(volume) {
    if (currentSourceType === "youtube" && playerReady) {
        player.setVolume(volume);
    }

    if (currentSourceType === "local") {
        localAudio.volume = volume / 100;
    }
}


// =============================================
// FADE TIME
// =============================================

document.querySelectorAll(".fade-time").forEach(button => {
    button.addEventListener("click", function () {
        selectFadeButton(this);
    });
});

function selectFadeButton(selectedButton) {
    document.querySelectorAll(".fade-time").forEach(button => {
        button.classList.remove("active");
    });

    selectedButton.classList.add("active");
    selectedFadeTime = Number(selectedButton.dataset.time);
}


// =============================================
// CUSTOM FADE
// =============================================

customFadeButton.addEventListener("click", function () {
    if (customFadeArea.classList.contains("hidden")) {
        openCustomFadeArea();
    } else {
        closeCustomFadeArea();
    }
});

addCustomFadeButton.addEventListener("click", addCustomFade);

customFadeInput.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") {
        return;
    }

    addCustomFade();
});

function openCustomFadeArea() {
    customFadeArea.classList.remove("hidden");
    customFadeButton.classList.add("active");
    customFadeButton.setAttribute("aria-expanded", "true");
    customFadeInput.focus();
}

function closeCustomFadeArea() {
    customFadeArea.classList.add("hidden");
    customFadeButton.classList.remove("active");
    customFadeButton.setAttribute("aria-expanded", "false");
}

function addCustomFade() {
    const seconds = Number(customFadeInput.value);

    if (!seconds || seconds < 0.5 || seconds > 120) {
        alert("0.5〜120秒で入力してください。");
        customFadeInput.focus();
        return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "fade-time";
    button.dataset.time = String(seconds);
    button.textContent = seconds + "秒";
    button.addEventListener("click", function () {
        selectFadeButton(this);
    });

    customFadeButton.before(button);
    selectFadeButton(button);

    customFadeInput.value = "";
    closeCustomFadeArea();

    showToast(`${seconds}秒FADEを追加しました`);
}


// =============================================
// FADE OUT
// =============================================

fadeButton.addEventListener("click", fadeOut);

function fadeOut() {
    if (currentCueIndex === -1) {
        showToast("先に音源を再生してください");
        return;
    }

    cancelFade();

    const originalVolume = getSelectedVolume();

    if (originalVolume <= 0) {
        showToast("音量が0%です");
        return;
    }

    const steps = 40;
    const interval = selectedFadeTime * 1000 / steps;
    let step = 0;

    fadeInterval = setInterval(() => {
        step++;

        const safeVolume = Math.max(0, originalVolume * (1 - step / steps));

        updateVolumeDisplay(safeVolume);
        setCurrentVolume(safeVolume);

        if (step >= steps) {
            clearInterval(fadeInterval);
            fadeInterval = null;

            stopEverything(true);
            updateVolumeDisplay(originalVolume);

            if (playerReady) {
                player.setVolume(originalVolume);
            }

            localAudio.volume = originalVolume / 100;
        }
    }, interval);
}

function cancelFade() {
    if (!fadeInterval) {
        return;
    }

    clearInterval(fadeInterval);
    fadeInterval = null;
}


// =============================================
// NEXT / PREVIOUS
// =============================================

nextButton.addEventListener("click", function () {
    if (cues.length === 0) {
        showToast("先に音源を追加してください");
        return;
    }

    const next = currentCueIndex + 1 >= cues.length ? 0 : currentCueIndex + 1;
    playCue(next);
});

previousButton.addEventListener("click", function () {
    if (cues.length === 0) {
        showToast("先に音源を追加してください");
        return;
    }

    const previous = currentCueIndex - 1 < 0 ? cues.length - 1 : currentCueIndex - 1;
    playCue(previous);
});


// =============================================
// DELETE
// =============================================

function deleteCue(index) {
    const cue = cues[index];

    if (!cue) {
        return;
    }

    if (!confirm(`「${cue.name}」を削除しますか？`)) {
        return;
    }

    if (cue.type === "local" && cue.objectUrl) {
        URL.revokeObjectURL(cue.objectUrl);
    }

    if (index === currentCueIndex) {
        stopEverything(true);

        currentCueIndex = -1;
        currentSourceType = null;
        nowPlaying.textContent = "まだ再生されていません";
    } else if (index < currentCueIndex) {
        currentCueIndex--;
    }

    cues.splice(index, 1);

    saveCues();
    renderCueList();
}


// =============================================
// PLAYER STATES
// =============================================

function onPlayerStateChange(event) {
    if (currentSourceType !== "youtube") {
        return;
    }

    if (event.data === YT.PlayerState.PLAYING) {
        playPauseButton.textContent = "⏸ 一時停止";
    } else {
        playPauseButton.textContent = "▶ 再生";
    }
}

localAudio.addEventListener("play", function () {
    playPauseButton.textContent = "⏸ 一時停止";
});

localAudio.addEventListener("pause", function () {
    playPauseButton.textContent = "▶ 再生";
});


// =============================================
// SHARE
// =============================================

shareButton.addEventListener("click", shareSite);
copyShareUrlButton.addEventListener("click", copyShareUrlFromPanel);
closeSharePanelButton.addEventListener("click", closeSharePanel);

async function shareSite() {
    const url = window.location.href;

    if (canUseNativeShare(url)) {
        try {
            await navigator.share({
                title: document.title,
                text: "Stage Audio",
                url
            });

            showToast("共有画面を開きました");
            return;
        } catch (error) {
            if (error.name === "AbortError") {
                showSharePanel(url, "共有をキャンセルしました。URLはこちらです。");
                return;
            }
        }
    }

    const copied = await copyText(url);

    if (copied) {
        showSharePanel(url, "共有URLをコピーしました。");
        showToast("共有URLをコピーしました");
    } else {
        showSharePanel(url, "このURLを選択してコピーしてください。");
        shareUrlInput.select();
    }
}

function canUseNativeShare(url) {
    if (!navigator.share || window.location.protocol === "file:") {
        return false;
    }

    if (!navigator.canShare) {
        return true;
    }

    return navigator.canShare({
        title: document.title,
        text: "Stage Audio",
        url
    });
}

async function copyShareUrlFromPanel() {
    const copied = await copyText(shareUrlInput.value);

    if (copied) {
        showSharePanel(shareUrlInput.value, "共有URLをコピーしました。");
        showToast("共有URLをコピーしました");
    } else {
        shareUrlInput.select();
        showToast("URLを選択しました");
    }
}

async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall back to the temporary text field below.
        }
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    let copied = false;

    try {
        copied = document.execCommand("copy");
    } catch {
        copied = false;
    }

    textArea.remove();

    return copied;
}

function showSharePanel(url, message) {
    shareUrlInput.value = url;
    sharePanelMessage.textContent = message;
    sharePanel.classList.remove("hidden");
}

function closeSharePanel() {
    sharePanel.classList.add("hidden");
}


// =============================================
// TOAST
// =============================================

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}


// =============================================
// SAVE
// =============================================

function saveCues() {
    const youtubeCues = cues.filter(cue => cue.type === "youtube");

    localStorage.setItem(
        "stageAudioCues",
        JSON.stringify(youtubeCues)
    );
}

function loadCues() {
    const saved = localStorage.getItem("stageAudioCues");

    if (!saved) {
        return;
    }

    try {
        cues = JSON.parse(saved);
    } catch {
        cues = [];
    }
}


// =============================================
// HELPERS
// =============================================

function makeCueId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}


// =============================================
// START
// =============================================

customFadeButton.setAttribute("aria-expanded", "false");

loadCues();
renderCueList();
