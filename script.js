// ==============================
// STAGE AUDIO
// ==============================

let player = null;
let playerReady = false;

let cues = [];
let currentCueIndex = -1;

let selectedFadeTime = 3;
let fadeInterval = null;


// ==============================
// YouTube APIを読み込む
// ==============================

const youtubeScript = document.createElement("script");
youtubeScript.src = "https://www.youtube.com/iframe_api";

const firstScript = document.getElementsByTagName("script")[0];
firstScript.parentNode.insertBefore(youtubeScript, firstScript);


// YouTube APIの準備完了
function onYouTubeIframeAPIReady() {

    player = new YT.Player("player", {

        width: "100%",
        height: "100%",

        playerVars: {
            controls: 0,
            rel: 0,
            modestbranding: 1
        },

        events: {

            onReady: function () {
                playerReady = true;
                player.setVolume(80);
            },

            onStateChange: onPlayerStateChange
        }
    });
}


// ==============================
// URLからYouTube動画IDを取得
// ==============================

function getYouTubeID(url) {

    try {

        const parsedUrl = new URL(url);

        // youtu.be/xxxxx
        if (parsedUrl.hostname.includes("youtu.be")) {
            return parsedUrl.pathname.substring(1).split("/")[0];
        }

        // youtube.com/watch?v=xxxxx
        if (parsedUrl.searchParams.get("v")) {
            return parsedUrl.searchParams.get("v");
        }

        // youtube.com/shorts/xxxxx
        if (parsedUrl.pathname.includes("/shorts/")) {
            return parsedUrl.pathname.split("/shorts/")[1].split("/")[0];
        }

        // youtube.com/embed/xxxxx
        if (parsedUrl.pathname.includes("/embed/")) {
            return parsedUrl.pathname.split("/embed/")[1].split("/")[0];
        }

    } catch (error) {
        return null;
    }

    return null;
}


// ==============================
// CUEを追加
// ==============================

document
    .getElementById("saveCueButton")
    .addEventListener("click", addCue);


function addCue() {

    const urlInput =
        document.getElementById("youtubeUrl");

    const nameInput =
        document.getElementById("cueName");

    const url = urlInput.value.trim();
    const name = nameInput.value.trim();

    const videoId = getYouTubeID(url);


    if (!videoId) {

        alert("正しいYouTube URLを入力してください。");

        return;
    }


    const cue = {

        id: Date.now(),

        name:
            name ||
            "名称未設定",

        url: url,

        videoId: videoId
    };


    cues.push(cue);


    saveCues();

    renderCueList();


    urlInput.value = "";
    nameInput.value = "";
}


// ==============================
// CUE一覧を表示
// ==============================

function renderCueList() {

    const cueList =
        document.getElementById("cueList");


    if (cues.length === 0) {

        cueList.innerHTML = `
            <div class="empty-message">
                まだCUEがありません。<br>
                YouTubeのURLを追加してください。
            </div>
        `;

        return;
    }


    cueList.innerHTML = "";


    cues.forEach((cue, index) => {

        const item =
            document.createElement("div");

        item.className = "cue-item";


        if (index === currentCueIndex) {
            item.style.background = "#1c2330";
        }


        item.innerHTML = `

            <div class="cue-number">
                ${String(index + 1).padStart(2, "0")}
            </div>

            <div class="cue-name">
                ${escapeHTML(cue.name)}
            </div>

            <button
                onclick="playCue(${index})"
            >
                ▶ 再生
            </button>

            <button
                onclick="deleteCue(${index})"
                title="削除"
            >
                ×
            </button>

        `;


        cueList.appendChild(item);
    });
}


// ==============================
// CUEを再生
// ==============================

function playCue(index) {

    if (!playerReady) {

        alert(
            "YouTubeプレイヤーを準備中です。\n少し待ってからもう一度押してください。"
        );

        return;
    }


    if (!cues[index]) {
        return;
    }


    cancelFade();


    currentCueIndex = index;

    const cue = cues[index];


    document.getElementById(
        "nowPlaying"
    ).textContent = cue.name;


    const volume =
        Number(
            document.getElementById(
                "volumeSlider"
            ).value
        );


    player.setVolume(volume);

    player.loadVideoById(
        cue.videoId
    );


    renderCueList();
}


// ==============================
// 再生 / 一時停止
// ==============================

document
    .getElementById("playPauseButton")
    .addEventListener(
        "click",
        togglePlayPause
    );


function togglePlayPause() {

    if (!playerReady) {
        return;
    }


    const state =
        player.getPlayerState();


    if (
        state === YT.PlayerState.PLAYING
    ) {

        player.pauseVideo();

    } else {

        if (
            currentCueIndex === -1 &&
            cues.length > 0
        ) {

            playCue(0);

        } else {

            player.playVideo();
        }
    }
}


// ==============================
// STOP
// ==============================

document
    .getElementById("stopButton")
    .addEventListener(
        "click",
        stopAudio
    );


function stopAudio() {

    if (!playerReady) {
        return;
    }


    cancelFade();

    player.stopVideo();

    document.getElementById(
        "playPauseButton"
    ).textContent = "▶ 再生";
}


// ==============================
// 音量
// ==============================

const volumeSlider =
    document.getElementById(
        "volumeSlider"
    );


volumeSlider.addEventListener(
    "input",
    function () {

        const volume =
            Number(this.value);


        document.getElementById(
            "volumeValue"
        ).textContent =
            volume + "%";


        if (playerReady) {
            player.setVolume(volume);
        }
    }
);


// ==============================
// フェード時間
// ==============================

document
    .querySelectorAll(
        ".fade-time"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                selectedFadeTime =
                    Number(
                        this.dataset.time
                    );


                document
                    .querySelectorAll(
                        ".fade-time"
                    )
                    .forEach(btn =>
                        btn.classList.remove(
                            "active"
                        )
                    );


                this.classList.add(
                    "active"
                );
            }
        );
    });


// ==============================
// FADE OUT
// ==============================

document
    .getElementById("fadeButton")
    .addEventListener(
        "click",
        fadeOut
    );


function fadeOut() {

    if (!playerReady) {
        return;
    }


    cancelFade();


    const startVolume =
        player.getVolume();


    if (startVolume <= 0) {
        return;
    }


    const steps = 30;

    const interval =
        (selectedFadeTime * 1000)
        / steps;


    let currentStep = 0;


    fadeInterval =
        setInterval(() => {

            currentStep++;


            const newVolume =
                startVolume *
                (
                    1 -
                    currentStep /
                    steps
                );


            player.setVolume(
                Math.max(
                    0,
                    Math.round(
                        newVolume
                    )
                )
            );


            volumeSlider.value =
                Math.max(
                    0,
                    Math.round(
                        newVolume
                    )
                );


            document.getElementById(
                "volumeValue"
            ).textContent =
                Math.max(
                    0,
                    Math.round(
                        newVolume
                    )
                ) + "%";


            if (
                currentStep >= steps
            ) {

                clearInterval(
                    fadeInterval
                );

                fadeInterval = null;


                player.stopVideo();


                document.getElementById(
                    "playPauseButton"
                ).textContent =
                    "▶ 再生";
            }

        }, interval);
}


function cancelFade() {

    if (fadeInterval) {

        clearInterval(
            fadeInterval
        );

        fadeInterval = null;
    }
}


// ==============================
// NEXT CUE
// ==============================

document
    .getElementById("nextButton")
    .addEventListener(
        "click",
        function () {

            if (cues.length === 0) {
                return;
            }


            let next =
                currentCueIndex + 1;


            if (
                next >= cues.length
            ) {

                next = 0;
            }


            playCue(next);
        }
    );


// ==============================
// PREVIOUS
// ==============================

document
    .getElementById(
        "previousButton"
    )
    .addEventListener(
        "click",
        function () {

            if (cues.length === 0) {
                return;
            }


            let previous =
                currentCueIndex - 1;


            if (previous < 0) {

                previous =
                    cues.length - 1;
            }


            playCue(previous);
        }
    );


// ==============================
// 削除
// ==============================

function deleteCue(index) {

    const cue =
        cues[index];


    if (!cue) {
        return;
    }


    const result =
        confirm(
            `「${cue.name}」を削除しますか？`
        );


    if (!result) {
        return;
    }


    cues.splice(
        index,
        1
    );


    if (
        currentCueIndex === index
    ) {

        if (playerReady) {
            player.stopVideo();
        }

        currentCueIndex = -1;

        document.getElementById(
            "nowPlaying"
        ).textContent =
            "まだ再生されていません";

    } else if (
        currentCueIndex > index
    ) {

        currentCueIndex--;
    }


    saveCues();

    renderCueList();
}


// ==============================
// 再生状態
// ==============================

function onPlayerStateChange(
    event
) {

    const button =
        document.getElementById(
            "playPauseButton"
        );


    if (
        event.data ===
        YT.PlayerState.PLAYING
    ) {

        button.textContent =
            "⏸ 一時停止";

    } else {

        button.textContent =
            "▶ 再生";
    }
}


// ==============================
// 自動保存
// ==============================

function saveCues() {

    localStorage.setItem(
        "stageAudioCues",
        JSON.stringify(cues)
    );
}


function loadCues() {

    const saved =
        localStorage.getItem(
            "stageAudioCues"
        );


    if (!saved) {
        return;
    }


    try {

        cues =
            JSON.parse(saved);

    } catch (error) {

        cues = [];
    }
}


// ==============================
// HTML安全対策
// ==============================

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent = text;

    return div.innerHTML;
}


// ==============================
// 起動
// ==============================

loadCues();

renderCueList();