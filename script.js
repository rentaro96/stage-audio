// =============================================
// STAGE AUDIO
// =============================================

const DEFAULT_VOLUME = 80;
const CUE_STORAGE_KEY = "stageAudioCues";
const PERFORMANCE_MODE_KEY = "stageAudioPerformanceMode";

let player = null;
let playerReady = false;

let cues = [];
let currentCueIndex = -1;
let currentSourceType = null;

let selectedFadeTime = 3;
let fadeInterval = null;
let endCheckTimer = null;
let toastTimer = null;
let draggedCueId = null;
const expandedCueIds = new Set();

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
const performanceModeButton = document.getElementById("performanceModeButton");
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

    cues.push(normalizeCue({
        id: makeCueId(),
        type: "youtube",
        name: name || "名称未設定",
        url,
        videoId,
        volume: getSelectedVolume(),
        startTime: 0,
        endTime: null
    }));

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

    cues.push(normalizeCue({
        id: makeCueId(),
        type: "local",
        name: cueName,
        fileName: file.name,
        objectUrl,
        volume: getSelectedVolume(),
        startTime: 0,
        endTime: null
    }));

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
        normalizeCue(cue);

        const isDetailsOpen = expandedCueIds.has(cue.id);
        const item = document.createElement("div");
        item.className = "cue-item";
        item.dataset.cueId = String(cue.id);
        item.classList.toggle("details-open", isDetailsOpen);

        if (index === currentCueIndex) {
            item.classList.add("current");
        }

        item.addEventListener("dragover", handleCueDragOver);
        item.addEventListener("dragleave", handleCueDragLeave);
        item.addEventListener("drop", function (event) {
            handleCueDrop(event, cue.id);
        });

        const mainRow = document.createElement("div");
        mainRow.className = "cue-main-row";

        const dragHandle = document.createElement("button");
        dragHandle.type = "button";
        dragHandle.className = "cue-drag-handle";
        dragHandle.textContent = "≡";
        dragHandle.draggable = true;
        dragHandle.setAttribute("aria-label", `${cue.name}を並び替え`);
        dragHandle.addEventListener("dragstart", function (event) {
            startCueDrag(event, cue.id, item);
        });
        dragHandle.addEventListener("dragend", endCueDrag);

        const number = document.createElement("div");
        number.className = "cue-number";
        number.textContent = String(index + 1).padStart(2, "0");

        const type = document.createElement("div");
        type.className = "cue-type";
        type.textContent = cue.type === "youtube" ? "YouTube" : "AUDIO";

        const titleBlock = document.createElement("div");
        titleBlock.className = "cue-title-block";

        const name = document.createElement("div");
        name.className = "cue-name";
        name.textContent = cue.name;

        const meta = document.createElement("div");
        meta.className = "cue-meta";
        meta.textContent = createCueMeta(cue);

        titleBlock.append(name, meta);

        const actions = document.createElement("div");
        actions.className = "cue-actions";

        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.textContent = "▶ 再生";
        playButton.addEventListener("click", function () {
            playCue(index);
        });

        const expandButton = document.createElement("button");
        expandButton.type = "button";
        expandButton.className = "cue-expand-button";
        expandButton.textContent = "⌄";
        expandButton.setAttribute(
            "aria-label",
            `${cue.name}の設定を${isDetailsOpen ? "閉じる" : "開く"}`
        );
        expandButton.setAttribute("aria-expanded", String(isDetailsOpen));
        expandButton.setAttribute("aria-controls", `cue-settings-${cue.id}`);
        expandButton.addEventListener("click", function () {
            toggleCueDetails(cue.id);
        });

        const moveUpButton = document.createElement("button");
        moveUpButton.type = "button";
        moveUpButton.className = "move-button";
        moveUpButton.textContent = "↑";
        moveUpButton.disabled = index === 0;
        moveUpButton.setAttribute("aria-label", `${cue.name}を上に移動`);
        moveUpButton.addEventListener("click", function () {
            moveCue(index, -1);
        });

        const moveDownButton = document.createElement("button");
        moveDownButton.type = "button";
        moveDownButton.className = "move-button";
        moveDownButton.textContent = "↓";
        moveDownButton.disabled = index === cues.length - 1;
        moveDownButton.setAttribute("aria-label", `${cue.name}を下に移動`);
        moveDownButton.addEventListener("click", function () {
            moveCue(index, 1);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "×";
        deleteButton.setAttribute("aria-label", `${cue.name}を削除`);
        deleteButton.addEventListener("click", function () {
            deleteCue(index);
        });

        actions.append(playButton, expandButton, moveUpButton, moveDownButton, deleteButton);
        mainRow.append(dragHandle, number, type, titleBlock, actions);

        item.append(mainRow, createCueSettings(cue, index, isDetailsOpen));
        cueList.appendChild(item);
    });
}

function createCueSettings(cue, index, isDetailsOpen) {
    const settings = document.createElement("div");
    settings.className = "cue-settings-row";
    settings.id = `cue-settings-${cue.id}`;

    if (!isDetailsOpen) {
        settings.classList.add("hidden");
    }

    const volumeControl = document.createElement("label");
    volumeControl.className = "cue-setting cue-volume-setting";

    const volumeLabel = document.createElement("span");
    volumeLabel.textContent = "音量";

    const volumeInput = document.createElement("input");
    volumeInput.type = "range";
    volumeInput.min = "0";
    volumeInput.max = "100";
    volumeInput.value = String(getCueVolume(cue));
    volumeInput.setAttribute("aria-label", `${cue.name}の音量`);

    const volumeText = document.createElement("span");
    volumeText.className = "cue-volume-value";
    volumeText.textContent = `${getCueVolume(cue)}%`;

    volumeInput.addEventListener("input", function () {
        updateCueVolume(index, Number(this.value), volumeText);
    });

    volumeControl.append(volumeLabel, volumeInput, volumeText);

    const startControl = createTimeControl(
        cue,
        index,
        "startTime",
        "開始",
        getCueStartTime(cue)
    );

    const endControl = createTimeControl(
        cue,
        index,
        "endTime",
        "終了",
        getCueEndTime(cue)
    );

    settings.append(volumeControl, startControl, endControl);

    return settings;
}

function toggleCueDetails(cueId) {
    if (expandedCueIds.has(cueId)) {
        expandedCueIds.delete(cueId);
    } else {
        expandedCueIds.add(cueId);
    }

    renderCueList();
}

function createTimeControl(cue, index, field, labelText, value) {
    const control = document.createElement("label");
    control.className = "cue-setting cue-time-setting";

    const label = document.createElement("span");
    label.textContent = labelText;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "0.1";
    input.inputMode = "decimal";
    input.className = "cue-time-input";
    input.value = formatTimeInput(value);
    input.placeholder = field === "startTime" ? "0" : "";
    input.setAttribute("aria-label", `${cue.name}の${labelText}位置`);
    input.addEventListener("change", function () {
        updateCueTime(index, field, this.value, this);
    });

    const unit = document.createElement("span");
    unit.textContent = "秒";

    control.append(label, input, unit);

    return control;
}

function createCueMeta(cue) {
    const volume = getCueVolume(cue);
    const start = getCueStartTime(cue);
    const end = getCueEndTime(cue);
    const endText = end === null ? "なし" : formatSeconds(end);

    return `音量 ${volume}% / 開始 ${formatSeconds(start)} / 終了 ${endText}`;
}


// =============================================
// CUE再生
// =============================================

function playCue(index) {
    const cue = cues[index];

    if (!cue) {
        return;
    }

    normalizeCue(cue);
    cancelFade();
    stopEverything(false);

    currentCueIndex = index;
    currentSourceType = cue.type;
    nowPlaying.textContent = cue.name;

    const volume = getCueVolume(cue);
    const startTime = getCueStartTime(cue);
    const endTime = getCueEndTime(cue);

    updateVolumeDisplay(volume);

    if (cue.type === "youtube") {
        if (!playerReady) {
            showToast("YouTubeプレイヤーを準備中です");
            return;
        }

        localAudio.pause();
        player.setVolume(volume);
        player.loadVideoById(createYouTubePlaybackOptions(cue, startTime, endTime));
        startEndMonitor(cue.id);
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

        setLocalStartTime(startTime);
        localAudio.addEventListener("loadedmetadata", function () {
            setLocalStartTime(startTime);
        }, { once: true });

        localAudio.play().catch(() => {
            alert("音源を再生できませんでした。");
        });

        startEndMonitor(cue.id);
    }

    renderCueList();
}

function createYouTubePlaybackOptions(cue, startTime, endTime) {
    const options = {
        videoId: cue.videoId,
        startSeconds: startTime
    };

    if (endTime !== null) {
        options.endSeconds = endTime;
    }

    return options;
}

function setLocalStartTime(startTime) {
    try {
        localAudio.currentTime = startTime;
    } catch {
        // The loadedmetadata listener sets it once the browser is ready.
    }
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
        } else if (state === YT.PlayerState.PAUSED) {
            player.playVideo();
            startEndMonitor(cues[currentCueIndex].id);
        } else {
            playCue(currentCueIndex);
        }
    } else if (currentSourceType === "local") {
        if (localAudio.paused) {
            const startTime = getCueStartTime(cues[currentCueIndex]);

            if (startTime > 0 && localAudio.currentTime < startTime) {
                setLocalStartTime(startTime);
            }

            localAudio.play();
            startEndMonitor(cues[currentCueIndex].id);
        } else {
            localAudio.pause();
            stopEndMonitor();
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
    stopEndMonitor();

    const restartTime = currentCueIndex === -1
        ? 0
        : getCueStartTime(cues[currentCueIndex]);

    if (playerReady) {
        player.stopVideo();
    }

    localAudio.pause();

    try {
        localAudio.currentTime = restartTime;
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
    const volume = clampVolume(Number(this.value));

    updateVolumeDisplay(volume);

    if (currentCueIndex !== -1) {
        updateCueVolume(currentCueIndex, volume, null);
    } else {
        setCurrentVolume(volume);
    }
});

volumeSlider.addEventListener("change", function () {
    renderCueList();
});

function getSelectedVolume() {
    return clampVolume(Number(volumeSlider.value));
}

function updateVolumeDisplay(volume) {
    const roundedVolume = clampVolume(volume);

    volumeSlider.value = String(roundedVolume);
    volumeValue.textContent = roundedVolume + "%";
}

function updateCueVolume(index, volume, valueElement) {
    const cue = cues[index];

    if (!cue) {
        return;
    }

    cue.volume = clampVolume(volume);

    if (valueElement) {
        valueElement.textContent = `${cue.volume}%`;
    }

    if (index === currentCueIndex) {
        updateVolumeDisplay(cue.volume);
        setCurrentVolume(cue.volume);
    }

    saveCues();
}

function setCurrentVolume(volume) {
    const safeVolume = clampVolume(volume);

    if (currentSourceType === "youtube" && playerReady) {
        player.setVolume(safeVolume);
    }

    if (currentSourceType === "local") {
        localAudio.volume = safeVolume / 100;
    }
}


// =============================================
// START / END
// =============================================

function updateCueTime(index, field, rawValue, input) {
    const cue = cues[index];

    if (!cue) {
        return;
    }

    const parsed = parseOptionalTime(rawValue);

    if (parsed === "invalid") {
        showToast("0以上の秒数を入力してください");
        input.value = formatTimeInput(cue[field]);
        return;
    }

    if (field === "startTime") {
        cue.startTime = parsed === null ? 0 : parsed;

        if (cue.endTime !== null && cue.endTime <= cue.startTime) {
            cue.endTime = null;
        }
    } else {
        if (parsed !== null && parsed <= getCueStartTime(cue)) {
            showToast("終了は開始より後にしてください");
            input.value = formatTimeInput(cue.endTime);
            return;
        }

        cue.endTime = parsed;
    }

    saveCues();
    renderCueList();
}

function startEndMonitor(cueId) {
    stopEndMonitor();

    const cue = getCueById(cueId);
    const endTime = getCueEndTime(cue);

    if (endTime === null) {
        return;
    }

    endCheckTimer = setInterval(() => {
        const activeCue = cues[currentCueIndex];

        if (!activeCue || activeCue.id !== cueId) {
            stopEndMonitor();
            return;
        }

        const currentTime = getCurrentPlaybackTime();

        if (currentTime === null || currentTime < endTime) {
            return;
        }

        stopEndMonitor();
        cancelFade();
        stopEverything(true);
        showToast("終了位置で停止しました");
    }, 100);
}

function stopEndMonitor() {
    if (!endCheckTimer) {
        return;
    }

    clearInterval(endCheckTimer);
    endCheckTimer = null;
}

function getCurrentPlaybackTime() {
    if (
        currentSourceType === "youtube" &&
        playerReady &&
        typeof player.getCurrentTime === "function"
    ) {
        return player.getCurrentTime();
    }

    if (currentSourceType === "local") {
        return localAudio.currentTime;
    }

    return null;
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

            if (currentCueIndex !== -1) {
                cues[currentCueIndex].volume = originalVolume;
                saveCues();
            }

            setCurrentVolume(originalVolume);
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
// REORDER
// =============================================

function startCueDrag(event, cueId, item) {
    if (isPerformanceMode()) {
        event.preventDefault();
        return;
    }

    draggedCueId = cueId;
    item.classList.add("dragging");

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(cueId));
}

function handleCueDragOver(event) {
    if (isPerformanceMode() || draggedCueId === null) {
        return;
    }

    event.preventDefault();
    event.currentTarget.classList.add("drag-over");
}

function handleCueDragLeave(event) {
    if (event.currentTarget.contains(event.relatedTarget)) {
        return;
    }

    event.currentTarget.classList.remove("drag-over");
}

function handleCueDrop(event, targetCueId) {
    if (isPerformanceMode() || draggedCueId === null) {
        return;
    }

    event.preventDefault();

    const sourceCueId = Number(event.dataTransfer.getData("text/plain")) || draggedCueId;

    if (sourceCueId !== targetCueId) {
        const fromIndex = cues.findIndex(cue => cue.id === sourceCueId);
        const toIndex = cues.findIndex(cue => cue.id === targetCueId);

        reorderCues(fromIndex, toIndex);
    }

    endCueDrag();
}

function endCueDrag() {
    draggedCueId = null;

    document.querySelectorAll(".cue-item").forEach(item => {
        item.classList.remove("drag-over", "dragging");
    });
}

function moveCue(index, direction) {
    reorderCues(index, index + direction);
}

function reorderCues(fromIndex, toIndex) {
    if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= cues.length ||
        toIndex >= cues.length ||
        fromIndex === toIndex
    ) {
        return;
    }

    const currentCueId = cues[currentCueIndex]?.id ?? null;
    const [movedCue] = cues.splice(fromIndex, 1);

    cues.splice(toIndex, 0, movedCue);

    if (currentCueId !== null) {
        currentCueIndex = cues.findIndex(cue => cue.id === currentCueId);
    }

    saveCues();
    renderCueList();
    showToast("順番を変更しました");
}


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

    expandedCueIds.delete(cue.id);

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
// PERFORMANCE MODE
// =============================================

performanceModeButton.addEventListener("click", function () {
    setPerformanceMode(!isPerformanceMode());
});

function setPerformanceMode(enabled, showNotice = true) {
    document.body.classList.toggle("performance-mode", enabled);
    performanceModeButton.textContent = enabled ? "編集モード" : "本番モード";
    performanceModeButton.setAttribute("aria-pressed", String(enabled));
    localStorage.setItem(PERFORMANCE_MODE_KEY, enabled ? "on" : "off");

    renderCueList();

    if (showNotice) {
        showToast(enabled ? "本番モードにしました" : "編集モードにしました");
    }
}

function isPerformanceMode() {
    return document.body.classList.contains("performance-mode");
}


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
    const youtubeCues = cues
        .filter(cue => cue.type === "youtube")
        .map(serializeCue);

    localStorage.setItem(
        CUE_STORAGE_KEY,
        JSON.stringify(youtubeCues)
    );
}

function loadCues() {
    const saved = localStorage.getItem(CUE_STORAGE_KEY);

    if (!saved) {
        return;
    }

    try {
        cues = JSON.parse(saved)
            .filter(cue => cue && cue.type === "youtube" && cue.videoId)
            .map(normalizeCue);
    } catch {
        cues = [];
    }
}

function serializeCue(cue) {
    return {
        id: cue.id,
        type: cue.type,
        name: cue.name,
        url: cue.url,
        videoId: cue.videoId,
        volume: getCueVolume(cue),
        startTime: getCueStartTime(cue),
        endTime: getCueEndTime(cue)
    };
}


// =============================================
// HELPERS
// =============================================

function normalizeCue(cue) {
    cue.id = Number(cue.id) || makeCueId();
    cue.name = cue.name || "名称未設定";
    cue.volume = clampVolume(cue.volume);
    cue.startTime = normalizeTime(cue.startTime, 0);
    cue.endTime = normalizeTime(cue.endTime, null);

    if (cue.endTime !== null && cue.endTime <= cue.startTime) {
        cue.endTime = null;
    }

    return cue;
}

function getCueById(cueId) {
    return cues.find(cue => cue.id === cueId) || null;
}

function getCueVolume(cue) {
    return clampVolume(cue?.volume);
}

function getCueStartTime(cue) {
    return normalizeTime(cue?.startTime, 0);
}

function getCueEndTime(cue) {
    const startTime = getCueStartTime(cue);
    const endTime = normalizeTime(cue?.endTime, null);

    if (endTime === null || endTime <= startTime) {
        return null;
    }

    return endTime;
}

function clampVolume(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return DEFAULT_VOLUME;
    }

    return Math.min(100, Math.max(0, Math.round(number)));
}

function normalizeTime(value, fallback) {
    if (value === "" || value === null || value === undefined) {
        return fallback;
    }

    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
        return fallback;
    }

    return roundTime(number);
}

function parseOptionalTime(value) {
    if (String(value).trim() === "") {
        return null;
    }

    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
        return "invalid";
    }

    return roundTime(number);
}

function roundTime(value) {
    return Math.round(value * 10) / 10;
}

function formatTimeInput(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
}

function formatSeconds(value) {
    return `${formatTimeInput(value)}秒`;
}

function makeCueId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}


// =============================================
// START
// =============================================

customFadeButton.setAttribute("aria-expanded", "false");

loadCues();
setPerformanceMode(localStorage.getItem(PERFORMANCE_MODE_KEY) === "on", false);
updateVolumeDisplay(getSelectedVolume());
