// =============================================
// STAGE AUDIO
// =============================================

let player = null;
let playerReady = false;

const localAudio =
    document.getElementById("localAudio");

let cues = [];
let currentCueIndex = -1;

let currentSourceType = null;

let selectedFadeTime = 3;
let fadeInterval = null;


// =============================================
// YouTube API
// =============================================

const youtubeScript =
    document.createElement("script");

youtubeScript.src =
    "https://www.youtube.com/iframe_api";

const firstScript =
    document.getElementsByTagName("script")[0];

firstScript.parentNode.insertBefore(
    youtubeScript,
    firstScript
);


function onYouTubeIframeAPIReady() {

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

                player.setVolume(
                    getSelectedVolume()
                );
            },

            onStateChange:
                onPlayerStateChange
        }
    });
}


// =============================================
// YouTube ID
// =============================================

function getYouTubeID(url) {

    try {

        const parsedUrl =
            new URL(url);


        if (
            parsedUrl.hostname.includes(
                "youtu.be"
            )
        ) {

            return parsedUrl.pathname
                .substring(1)
                .split("/")[0];
        }


        if (
            parsedUrl.searchParams.get("v")
        ) {

            return parsedUrl
                .searchParams
                .get("v");
        }


        if (
            parsedUrl.pathname.includes(
                "/shorts/"
            )
        ) {

            return parsedUrl.pathname
                .split("/shorts/")[1]
                .split("/")[0];
        }


        if (
            parsedUrl.pathname.includes(
                "/embed/"
            )
        ) {

            return parsedUrl.pathname
                .split("/embed/")[1]
                .split("/")[0];
        }

    } catch {

        return null;
    }


    return null;
}


// =============================================
// YouTube CUE追加
// =============================================

document
    .getElementById("saveCueButton")
    .addEventListener(
        "click",
        addYouTubeCue
    );


function addYouTubeCue() {

    const urlInput =
        document.getElementById(
            "youtubeUrl"
        );

    const nameInput =
        document.getElementById(
            "cueName"
        );


    const url =
        urlInput.value.trim();

    const name =
        nameInput.value.trim();

    const videoId =
        getYouTubeID(url);


    if (!videoId) {

        alert(
            "正しいYouTube URLを入力してください。"
        );

        return;
    }


    cues.push({

        id: Date.now(),

        type: "youtube",

        name:
            name ||
            "名称未設定",

        url,

        videoId
    });


    saveCues();

    renderCueList();


    urlInput.value = "";
    nameInput.value = "";
}


// =============================================
// ローカル音源追加
// =============================================

const audioFileInput =
    document.getElementById(
        "audioFileInput"
    );


document
    .getElementById(
        "audioFileButton"
    )
    .addEventListener(
        "click",
        function () {

            audioFileInput.click();
        }
    );


audioFileInput.addEventListener(
    "change",
    function () {

        const file =
            this.files[0];


        if (!file) {
            return;
        }


        if (
            !file.type.startsWith("audio/")
        ) {

            alert(
                "音声ファイルを選択してください。"
            );

            return;
        }


        const objectUrl =
            URL.createObjectURL(file);


        cues.push({

            id: Date.now(),

            type: "local",

            name:
                file.name.replace(
                    /\.[^/.]+$/,
                    ""
                ),

            fileName:
                file.name,

            objectUrl:
                objectUrl
        });


        renderCueList();


        this.value = "";


        showToast(
            "音源ファイルを追加しました"
        );
    }
);


// =============================================
// CUE LIST
// =============================================

function renderCueList() {

    const cueList =
        document.getElementById(
            "cueList"
        );


    if (cues.length === 0) {

        cueList.innerHTML = `

            <div class="empty-message">

                まだCUEがありません。<br>

                YouTubeまたは音源ファイルを
                追加してください。

            </div>
        `;

        return;
    }


    cueList.innerHTML = "";


    cues.forEach(
        (cue, index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "cue-item";


            if (
                index ===
                currentCueIndex
            ) {

                item.classList.add(
                    "current"
                );
            }


            const typeName =
                cue.type === "youtube"
                    ? "YouTube"
                    : "AUDIO";


            item.innerHTML = `

                <div class="cue-number">
                    ${String(index + 1)
                        .padStart(2, "0")}
                </div>

                <div class="cue-type">
                    ${typeName}
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
                    class="delete-button"
                    onclick="deleteCue(${index})"
                >
                    ×
                </button>
            `;


            cueList.appendChild(
                item
            );
        }
    );
}


// =============================================
// CUE再生
// =============================================

function playCue(index) {

    const cue =
        cues[index];


    if (!cue) {
        return;
    }


    cancelFade();

    stopEverything(false);


    currentCueIndex =
        index;

    currentSourceType =
        cue.type;


    document.getElementById(
        "nowPlaying"
    ).textContent =
        cue.name;


    const volume =
        getSelectedVolume();


    if (
        cue.type === "youtube"
    ) {

        if (!playerReady) {

            alert(
                "YouTubeプレイヤーを準備中です。"
            );

            return;
        }


        localAudio.pause();


        player.setVolume(
            volume
        );


        player.loadVideoById(
            cue.videoId
        );

    } else {

        if (!cue.objectUrl) {

            alert(
                "この音源ファイルをもう一度追加してください。"
            );

            return;
        }


        if (playerReady) {
            player.stopVideo();
        }


        localAudio.src =
            cue.objectUrl;

        localAudio.volume =
            volume / 100;

        localAudio.currentTime = 0;


        localAudio.play()
            .catch(() => {

                alert(
                    "音源を再生できませんでした。"
                );
            });
    }


    renderCueList();
}


// =============================================
// PLAY / PAUSE
// =============================================

document
    .getElementById(
        "playPauseButton"
    )
    .addEventListener(
        "click",
        togglePlayPause
    );


function togglePlayPause() {

    if (
        currentCueIndex === -1
    ) {

        if (cues.length > 0) {
            playCue(0);
        }

        return;
    }


    if (
        currentSourceType ===
        "youtube"
    ) {

        if (!playerReady) {
            return;
        }


        const state =
            player.getPlayerState();


        if (
            state ===
            YT.PlayerState.PLAYING
        ) {

            player.pauseVideo();

        } else {

            player.playVideo();
        }

    } else if (
        currentSourceType ===
        "local"
    ) {

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

document
    .getElementById(
        "stopButton"
    )
    .addEventListener(
        "click",
        function () {

            cancelFade();

            stopEverything(true);
        }
    );


function stopEverything(
    resetButton = true
) {

    if (playerReady) {
        player.stopVideo();
    }


    localAudio.pause();

    localAudio.currentTime = 0;


    if (resetButton) {

        document.getElementById(
            "playPauseButton"
        ).textContent =
            "▶ 再生";
    }
}


// =============================================
// VOLUME
// =============================================

const volumeSlider =
    document.getElementById(
        "volumeSlider"
    );


volumeSlider.addEventListener(
    "input",
    function () {

        const volume =
            Number(this.value);


        updateVolumeDisplay(
            volume
        );


        if (
            currentSourceType ===
            "youtube" &&
            playerReady
        ) {

            player.setVolume(
                volume
            );
        }


        if (
            currentSourceType ===
            "local"
        ) {

            localAudio.volume =
                volume / 100;
        }
    }
);


function getSelectedVolume() {

    return Number(
        volumeSlider.value
    );
}


function updateVolumeDisplay(
    volume
) {

    volumeSlider.value =
        volume;

    document.getElementById(
        "volumeValue"
    ).textContent =
        Math.round(volume) +
        "%";
}


// =============================================
// FADE TIME
// =============================================

document
    .querySelectorAll(
        ".fade-time"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                function () {

                    selectFadeButton(
                        this
                    );

                    selectedFadeTime =
                        Number(
                            this.dataset.time
                        );
                }
            );
        }
    );


function selectFadeButton(
    selectedButton
) {

    document
        .querySelectorAll(
            ".fade-time"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "active"
                );
            }
        );


    selectedButton.classList.add(
        "active"
    );
}


// =============================================
// CUSTOM FADE
// =============================================

document
    .getElementById(
        "customFadeButton"
    )
    .addEventListener(
        "click",
        function () {

            document
                .getElementById(
                    "customFadeArea"
                )
                .classList
                .toggle("hidden");
        }
    );


document
    .getElementById(
        "addCustomFadeButton"
    )
    .addEventListener(
        "click",
        addCustomFade
    );


function addCustomFade() {

    const input =
        document.getElementById(
            "customFadeInput"
        );


    const seconds =
        Number(input.value);


    if (
        !seconds ||
        seconds < 0.5 ||
        seconds > 120
    ) {

        alert(
            "0.5〜120秒で入力してください。"
        );

        return;
    }


    const button =
        document.createElement(
            "button"
        );


    button.className =
        "fade-time active";

    button.dataset.time =
        seconds;

    button.textContent =
        seconds + "秒";


    document
        .querySelectorAll(
            ".fade-time"
        )
        .forEach(
            btn =>
                btn.classList.remove(
                    "active"
                )
        );


    button.addEventListener(
        "click",
        function () {

            selectFadeButton(
                this
            );

            selectedFadeTime =
                Number(
                    this.dataset.time
                );
        }
    );


    document
        .getElementById(
            "customFadeButton"
        )
        .before(button);


    selectedFadeTime =
        seconds;


    input.value = "";


    document
        .getElementById(
            "customFadeArea"
        )
        .classList
        .add("hidden");
}


// =============================================
// FADE OUT
// =============================================

document
    .getElementById(
        "fadeButton"
    )
    .addEventListener(
        "click",
        fadeOut
    );


function fadeOut() {

    if (
        currentCueIndex === -1
    ) {

        return;
    }


    cancelFade();


    // FADE開始時の音量を保存
    const originalVolume =
        getSelectedVolume();


    if (
        originalVolume <= 0
    ) {

        return;
    }


    const steps = 40;

    const interval =
        selectedFadeTime *
        1000 /
        steps;


    let step = 0;


    fadeInterval =
        setInterval(
            () => {

                step++;


                const newVolume =
                    originalVolume *
                    (
                        1 -
                        step /
                        steps
                    );


                const safeVolume =
                    Math.max(
                        0,
                        newVolume
                    );


                // 表示も徐々に下げる
                updateVolumeDisplay(
                    safeVolume
                );


                if (
                    currentSourceType ===
                    "youtube" &&
                    playerReady
                ) {

                    player.setVolume(
                        safeVolume
                    );
                }


                if (
                    currentSourceType ===
                    "local"
                ) {

                    localAudio.volume =
                        safeVolume / 100;
                }


                if (
                    step >= steps
                ) {

                    clearInterval(
                        fadeInterval
                    );

                    fadeInterval =
                        null;


                    // 完全停止
                    stopEverything(true);


                    // 元の音量に戻す
                    updateVolumeDisplay(
                        originalVolume
                    );


                    if (playerReady) {

                        player.setVolume(
                            originalVolume
                        );
                    }


                    localAudio.volume =
                        originalVolume /
                        100;
                }

            },
            interval
        );
}


// =============================================
// FADE CANCEL
// =============================================

function cancelFade() {

    if (!fadeInterval) {
        return;
    }


    clearInterval(
        fadeInterval
    );

    fadeInterval =
        null;
}


// =============================================
// NEXT
// =============================================

document
    .getElementById(
        "nextButton"
    )
    .addEventListener(
        "click",
        function () {

            if (
                cues.length === 0
            ) {

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


// =============================================
// PREVIOUS
// =============================================

document
    .getElementById(
        "previousButton"
    )
    .addEventListener(
        "click",
        function () {

            if (
                cues.length === 0
            ) {

                return;
            }


            let previous =
                currentCueIndex - 1;


            if (
                previous < 0
            ) {

                previous =
                    cues.length - 1;
            }


            playCue(
                previous
            );
        }
    );


// =============================================
// DELETE
// =============================================

function deleteCue(index) {

    const cue =
        cues[index];


    if (!cue) {
        return;
    }


    if (
        !confirm(
            `「${cue.name}」を削除しますか？`
        )
    ) {

        return;
    }


    if (
        cue.type === "local" &&
        cue.objectUrl
    ) {

        URL.revokeObjectURL(
            cue.objectUrl
        );
    }


    if (
        index ===
        currentCueIndex
    ) {

        stopEverything(true);

        currentCueIndex =
            -1;

        currentSourceType =
            null;

        document.getElementById(
            "nowPlaying"
        ).textContent =
            "まだ再生されていません";

    } else if (
        index <
        currentCueIndex
    ) {

        currentCueIndex--;
    }


    cues.splice(
        index,
        1
    );


    saveCues();

    renderCueList();
}


// =============================================
// PLAYER STATES
// =============================================

function onPlayerStateChange(
    event
) {

    if (
        currentSourceType !==
        "youtube"
    ) {

        return;
    }


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


localAudio.addEventListener(
    "play",
    function () {

        document.getElementById(
            "playPauseButton"
        ).textContent =
            "⏸ 一時停止";
    }
);


localAudio.addEventListener(
    "pause",
    function () {

        document.getElementById(
            "playPauseButton"
        ).textContent =
            "▶ 再生";
    }
);


// =============================================
// SHARE
// =============================================

document
    .getElementById(
        "shareButton"
    )
    .addEventListener(
        "click",
        shareSite
    );


async function shareSite() {

    const url =
        window.location.href;


    try {

        await navigator.clipboard
            .writeText(url);


        showToast(
            "共有URLをコピーしました"
        );

    } catch {

        prompt(
            "このURLをコピーしてください",
            url
        );
    }
}


// =============================================
// TOAST
// =============================================

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        2200
    );
}


// =============================================
// SAVE
// =============================================

function saveCues() {

    // ローカルファイルはブラウザを閉じると
    // objectUrlが使えなくなるため保存しない

    const youtubeCues =
        cues.filter(
            cue =>
                cue.type ===
                "youtube"
        );


    localStorage.setItem(
        "stageAudioCues",
        JSON.stringify(
            youtubeCues
        )
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

    } catch {

        cues = [];
    }
}


// =============================================
// SECURITY
// =============================================

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;
}


// =============================================
// START
// =============================================

loadCues();

renderCueList();