HayaLearn iPhone PWA prototype

WHAT THIS VERSION DOES
- Mobile-first installable website interface.
- Accepts a YouTube URL and embeds the video when embedding is allowed.
- Includes an interactive Japanese word-tapping demo.
- Can be installed to the iPhone home screen after it is hosted on HTTPS.

IMPORTANT LIMITATION
This is not yet the full automatic-subtitle product. A YouTube URL cannot simply be read by ordinary webpage JavaScript to extract the video's audio or private captions. Automatic transcription needs a backend service and an allowed source of audio/captions. This prototype does not bypass YouTube restrictions or download videos.

HOW TO MAKE IT A HOME-SCREEN APP
1. Host these files on an HTTPS static host (for example, GitHub Pages).
2. Open the published HTTPS address in a browser on iPhone.
3. Use the browser's Share menu and choose "Add to Home Screen" (the exact menu can vary by iOS version).
4. Launch HayaLearn from its home-screen icon.

The Google app may open links in its own in-app browser. If "Add to Home Screen" is unavailable there, open the same published link in Safari to install it; the installed app can then be launched from its icon.

NEXT DEVELOPMENT STEP
Connect a lawful transcription/caption backend, then replace the demo captions with real timestamped Japanese segments, readings, and dictionary definitions.
