# Peer Practice

Peer Practice is a private two-person interview room, separate from the AI mock
interviewer. It uses the existing SkillNex account and is available below Career
roadmap. The room and report styles follow the application's dark or light theme.

## Make a call

1. Create a room and send its invite link to one partner. Both people sign in with
   their own accounts and open the same room.
2. Select **Start mic** and allow microphone access. Speak and check that the input
   bar moves. If it does not, choose the intended headset or microphone from the
   selector, and check the device's physical mute switch.
3. If the browser blocks sound, select **Hear your partner**. Camera use is optional;
   a profile photo or initials are shown while video is off.
4. Once the partner is connected, the host starts the interview. Use **Switch roles**
   to give each person time to ask and answer.
5. Select **End & review** to end the call for both people. Capture stops and the
   completed session remains in recent sessions.

The mic bar measures local input, not confirmed delivery to the other device.
Temporary connection failure triggers a limited automatic retry; **Reconnect** is
also available and keeps the currently enabled devices. Reconnecting refreshes ICE
configuration. If sound is still missing, both people should check their input,
speaker volume and browser sound permissions before trying another connection.

## Save evidence for the final report

Each participant independently chooses **Save my speech for the final review**.
During the active interview, that participant's microphone clips go to the configured
AI transcription provider. SkillNex retains transcript text, not the audio recording.
Saved transcripts are visible to both room members and support the shared report.
Video is not recorded or analysed by SkillNex.

Written notes are private by default. Select the note form's sharing option before
saving an answer if it should be visible to the partner and included in the shared
review. Private notes are excluded from that review. Existing written notes remain
private after upgrading. To correct an entry, remove your entry and save a corrected
one, choosing whether to share it.

Transcription is optional: shared written questions and answers can support analysis
when transcription is unavailable. No saved content means no evidence-based score.

## Two-person report

Analysis is available only after a started interview ends. The page automatically
requests a report once its final transcript uploads have settled and sufficient
shared text exists. **Generate analysis** can also be used manually. A late saved
entry invalidates an older report so it can be generated again with current evidence.

Both participants see one document containing a separate section for each person:

- Overall practice points derived from the available scored criteria.
- Clarity, answer/question structure, technical reasoning, and interviewing/follow-up
  criteria, each with its supporting explanation.
- Strong points, specific mistakes with links to the person's saved answer,
  corrections, areas to improve and next practice steps.
- The amount of saved evidence and what it cannot establish.

A criterion without sufficient evidence is **Not scored**, not zero. A participant
who only answered questions need not receive an interviewing score. The report is
practice guidance from saved text; it does not measure vocal quality, body language,
confidence, personality or employability. Transcription can be imperfect, and shared
written answers are self-reported. Partner feedback remains identifiable as peer
opinion. Earlier personal reports remain readable and can be refreshed into the new
two-person format using shared evidence.

## Server requirements and persistence

- Serve the site over HTTPS outside localhost so browsers can access media devices.
- Configure the existing TURN relay for calls across networks that cannot connect
  directly. Relay bandwidth, availability and provider limits affect connectivity.
  Never put provider API keys or long-lived relay secrets in frontend source.
- The existing Gemini transcription configuration handles speech-to-text. The
  configured structured AI provider handles the report; no new provider account is
  required by this feature.
- Apply Flyway migrations through `V13__peer_shared_notes.sql`. It adds only the
  explicit note-sharing flag and does not change accounts or existing progress.
- Room membership restricts the API. Both copies of a new report are written
  transactionally, and content revisions prevent stale analysis from being saved.
- Microphone uploads use stable clip IDs, survive media reconnection, and have a
  bounded timeout and one retry for transient network/server errors. Leaving the
  room aborts outstanding uploads; wait for the saving indicator before navigating
  away if you want the final segment included.

## Verification

`frontend/src/utils/peerCall.test.ts` covers negotiation, signaling retry, duplicate
descriptions, device replacement, capture cleanup, reconnection and transcript
upload lifetime. Playback tests cover late audio tracks and browser sound unlocking.
Backend integration tests cover membership, private/shared notes, report lifecycle,
stale revisions and participant attribution.

The development-only `frontend/qa/peer-media.html` fixture runs two actual WebRTC
peers with synthetic tones and video. It can inspect received audio energy/video
frames, exercise microphone toggles and a lost signaling request, and force a TURN
route using privately supplied ICE settings. It never requests real microphone or
camera access. A direct fixture pass alone does not verify a deployment's relay;
cross-network and TURN checks must be recorded separately for the environment tested.
