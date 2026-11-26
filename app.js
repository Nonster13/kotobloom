
const urlInput = document.querySelector('#ytUrl');
const videoWrap = document.querySelector('#videoWrap');
const captions = document.querySelector('#captions');
const status = document.querySelector('#status');
const vttFile = document.querySelector('#vttFile');

const popup = document.querySelector('#dictionaryPopup');
const popupWord = document.querySelector('#popupWord');
const popupReading = document.querySelector('#popupReading');
const popupMeaning = document.querySelector('#popupMeaning');
const popupLink = document.querySelector('#popupLink');

let player = null;
let cues = [];
let activeCue = -1;
let currentTokens = [];
let selectedToken = null;
let syncTimer = null;
let cueSource = '';

const demo = [
  {start: 4, end: 8, text: '今日はいい天気だ。'},
  {start: 8, end: 12, text: 'そうだね。'},
  {start: 12, end: 16, text: '早く行こう。'}
];

function videoId(raw) {
  try {
    const u = new URL(raw);
    let id = null;

    if (u.hostname.includes('youtu.be')) {
      id = u.pathname.split('/').filter(Boolean)[0];
    } else if (
      u.hostname === 'youtube.com' ||
      u.hostname.endsWith('.youtube.com')
    ) {
      id = u.searchParams.get('v') ||
        u.pathname.split('/').filter(Boolean).pop();
    }

    return /^[\w-]{11}$/.test(id || '') ? id : null;
  } catch {
    return null;
  }
}

function setStatus(message) {
  status.textContent = message;
}

window.onYouTubeIframeAPIReady = function () {
  setStatus('PLAYER READY');
};

document.querySelector('#loadVideo').addEventListener('click', () => {
  const id = videoId(urlInput.value.trim());

  if (!id) {
    setStatus('INVALID LINK');
    return;
  }

  if (!window.YT || !YT.Player) {
    setStatus('PLAYER LOADING');
    return;
  }

  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }

  closePopup();

  // Keep AI subtitles when loading the matching video.
  if (cueSource !== 'ai') {
    cues = [];
    cueSource = '';
    captions.innerHTML =
      '<div class="empty">load subtitles or transcribe audio.</div>';
  }

  activeCue = -1;

  document.querySelector('#playerPlaceholder').style.display = 'none';

  if (player) {
    player.destroy();
    player = null;
  }

  document.querySelector('#player').innerHTML = '';

  player = new YT.Player('player', {
    width: '100%',
    height: '100%',
    videoId: id,

    playerVars: {
      playsinline: 1,
      rel: 0,
      enablejsapi: 1,

      // Request Japanese captions automatically.
      cc_load_policy: 1,
      cc_lang_pref: 'ja'
    },

    events: {
      onReady: event => {
        setStatus('VIDEO READY · JAPANESE CAPTIONS REQUESTED');

        // Try to select Japanese captions if available.
        try {
          const tracks = event.target.getOption(
            'captions',
            'tracklist'
          );

          if (Array.isArray(tracks)) {
            const japaneseTrack = tracks.find(track =>
              track.languageCode === 'ja'
            );

            if (japaneseTrack) {
              event.target.setOption(
                'captions',
                'track',
                japaneseTrack
              );
            }
          }
        } catch (error) {
          console.log('Caption track selection unavailable.');
        }

        syncTimer = setInterval(updateSubtitles, 100);
        updateSubtitles();
      },

      onStateChange: updateSubtitles,

      onError: () => setStatus('VIDEO ERROR')
    }
  });
});

function parseTime(value) {
  const parts = value.trim().replace(',', '.').split(':');
  let seconds = 0;

  if (parts.length === 3) {
    seconds =
      Number(parts[0]) * 3600 +
      Number(parts[1]) * 60 +
      Number(parts[2]);
  } else if (parts.length === 2) {
    seconds = Number(parts[0]) * 60 + Number(parts[1]);
  }

  return seconds;
}

function parseVTT(source) {
  const blocks = source.replace(/\r/g, '').split(/\n\n+/);
  const result = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    const timeIndex = lines.findIndex(line => line.includes('-->'));

    if (timeIndex === -1) continue;

    const times = lines[timeIndex].split('-->');

    if (times.length !== 2) continue;

    const start = parseTime(times[0]);
    const end = parseTime(times[1].trim().split(/\s+/)[0]);

    const text = lines.slice(timeIndex + 1)
      .join(' ')
      .replace(/<[^>]*>/g, '')
      .trim();

    if (text && end > start) {
      result.push({start, end, text});
    }
  }

  return result.sort((a, b) => a.start - b.start);
}

vttFile.addEventListener('change', async () => {
  const file = vttFile.files[0];
  if (!file) return;

  try {
    const source = await file.text();
    const loaded = parseVTT(source);

    if (!loaded.length) {
      setStatus('INVALID SUBTITLES');
      return;
    }

    cues = loaded;
    cueSource = 'vtt';
    activeCue = -1;
    closePopup();

    setStatus(`${cues.length} SUBTITLES LOADED`);
    updateSubtitles();

  } catch (error) {
    console.error(error);
    setStatus('FILE ERROR');
  }
});

document.querySelector('#demoBtn').addEventListener('click', () => {
  cues = demo;
  cueSource = 'demo';
  activeCue = -1;

  closePopup();
  setStatus('DEMO LOADED');
  updateSubtitles();
});

// Receive subtitles generated by the AI engine.
window.addEventListener('kotobloom:transcription-ready', event => {
  const generated = event.detail?.cues;

  if (!Array.isArray(generated) || !generated.length) {
    setStatus('NO SUBTITLES GENERATED');
    return;
  }

  cues = generated
    .filter(cue =>
      Number.isFinite(cue.start) &&
      Number.isFinite(cue.end) &&
      cue.end > cue.start &&
      typeof cue.text === 'string' &&
      cue.text.trim()
    )
    .sort((a, b) => a.start - b.start);

  if (!cues.length) {
    setStatus('INVALID AI SUBTITLES');
    return;
  }

  cueSource = 'ai';
  activeCue = -1;

  closePopup();
  setStatus(`AI READY · ${cues.length} SEGMENTS`);

  if (player && player.getCurrentTime) {
    updateSubtitles();
  } else {
    renderCue(cues[0]);

    captions.insertAdjacentHTML(
      'beforeend',
      '<p class="small">load the matching YouTube video to synchronize these subtitles.</p>'
    );
  }
});

function updateSubtitles() {
  if (!player || !player.getCurrentTime) return;

  let time;

  try {
    time = player.getCurrentTime();
  } catch {
    return;
  }

  const index = cues.findIndex(
    cue => time >= cue.start && time < cue.end
  );

  if (index === activeCue) return;

  activeCue = index;

  if (index === -1) {
    currentTokens = [];
    captions.innerHTML =
      '<div class="empty">no subtitle at this moment.</div>';
    closePopup();
    return;
  }

  renderCue(cues[index]);
}

function renderCue(cue) {
  captions.innerHTML = '';

  const time = document.createElement('div');
  time.className = 'time';
  time.textContent = formatTime(cue.start);

  const line = document.createElement('div');
  line.className = 'jp';

  currentTokens = [];

  const segments = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter('ja', {
        granularity: 'word'
      }).segment(cue.text)]
    : [...cue.text].map(segment => ({segment}));

  segments.forEach(part => {
    const word = part.segment;

    if (/^[\s]+$/.test(word)) {
      line.append(document.createTextNode(word));
      return;
    }

    const button = document.createElement('button');
    button.className = 'token';
    button.type = 'button';
    button.textContent = word;

    button.addEventListener('click', () => {
      showWord(word, button);
    });

    currentTokens.push(button);
    line.append(button);
  });

  captions.append(time, line);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function showWord(word, element) {
  closePopup();

  selectedToken = element;
  element.classList.add('selected');

  popupWord.textContent = word;
  popupReading.textContent = 'look up reading';
  popupMeaning.textContent =
    'Open the dictionary for the reading, meaning and examples.';

  popupLink.href =
    'https://jisho.org/search/' + encodeURIComponent(word);

  popup.hidden = false;
  positionPopup(element);
}

function positionPopup(element) {
  if (!element || popup.hidden) return;

  const rect = element.getBoundingClientRect();

  popup.style.visibility = 'hidden';
  popup.style.left = '0px';
  popup.style.top = '0px';

  const width = popup.offsetWidth;
  const height = popup.offsetHeight;

  const left = Math.max(
    8,
    Math.min(
      rect.left + rect.width / 2 - width / 2,
      window.innerWidth - width - 8
    )
  );

  let top = rect.top - height - 10;

  if (top < 8) {
    top = Math.min(
      rect.bottom + 10,
      window.innerHeight - height - 8
    );
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${Math.max(8, top)}px`;
  popup.style.visibility = 'visible';
}

function closePopup() {
  popup.hidden = true;

  if (selectedToken) {
    selectedToken.classList.remove('selected');
    selectedToken = null;
  }
}

document.querySelector('#closeDictionary')
  .addEventListener('click', closePopup);

document.addEventListener('click', event => {
  if (
    popup.hidden ||
    popup.contains(event.target) ||
    event.target.classList.contains('token')
  ) return;

  closePopup();
});

window.addEventListener('resize', () => {
  if (selectedToken) positionPopup(selectedToken);
});

window.addEventListener('scroll', () => {
  if (selectedToken) positionPopup(selectedToken);
}, true);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

