# Lucien Ambient Voice Assistant — Production Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get RecoverPro's backend/DB/AI infra onto free-tier-safe production hosting, and add the ambient (continuously-listening, speak-only-when-warranted) doorstep interaction mode to Lucien — English only for now.

**Architecture:** Backend/frontend/DB/Redis stay on OCI Ampere A1 (free, 2 OCPU/12GB); the LLM moves off local CPU Ollama onto a RunPod GPU endpoint (the only paid piece) for real-time latency. On the code side, a new `AMBIENT` session mode is added alongside the existing `CHAT` and visit-interview modes: the frontend streams VAD-segmented utterances to a new endpoint, the backend runs a single lightweight (non-tool-calling) model call per utterance that returns a `{speak, text}` decision, and only speaks when `speak=true` — either the model's own judgment, or forced by the FO's Help button.

**Tech Stack:** Spring Boot (Java 21), PostgreSQL 16 + Flyway, Redis, Ollama (RunPod-hosted), faster-whisper + IndicF5 (`tts-service/`, FastAPI), Docker Compose, Caddy, Cloudflare DNS.

## Global Constraints

- English only in this plan — Hindi/Tamil/Kannada/Telugu activation is explicitly out of scope (see "Not in this plan" at the end).
- No third-party hosted LLM/TTS API — self-hosted only, per RecoverPro's existing PII-encryption posture (`app.encryption.*` in `application.properties`).
- OCI free tier is capped at 2 OCPU/12GB as of the June 2026 cut — do not provision the older 4 OCPU/24GB shape.
- `ambientTurn()` does not run `LucienAgentLoop`'s ReAct tool-calling loop — it's a single direct `ModelClientPort.chat()` call. Tool use (PTP creation, etc.) stays on the existing `/chat` and `/confirm` endpoints; ambient mode is guidance-only for this iteration.
- Every new/modified Java file must compile against the existing constructor-injection (`@RequiredArgsConstructor`) pattern already used throughout `service/impl/` and `controller/`.

---

## File Structure

**Phase 1 — Infra (no new files; modifies what's already in `recoverpro/`):**
- Modify: `recoverpro/docker-compose.yml` — remove the local `ollama` service, point `backend` at the RunPod endpoint
- Modify: `recoverpro/tts-service/app.py:203-209` — remove a stray hardcoded debug file write left over from another developer's machine

**Phase 2 — Backend ambient mode:**
- Create: `server/src/main/resources/db/migration/V083__lucien_ambient_mode.sql`
- Modify: `server/src/main/java/com/recoverpro/server/entity/ChatSession.java` — new `interactionMode` column
- Modify: `server/src/main/java/com/recoverpro/server/dto/request/StartSessionRequest.java` — new `ambientMode` flag
- Modify: `server/src/main/java/com/recoverpro/server/service/impl/LucienServiceImpl.java:startSession` — wire the flag through
- Modify: `server/src/main/java/com/recoverpro/server/prompt/DefaultSystemPrompt.java` — new ambient system prompt
- Create: `server/src/main/java/com/recoverpro/server/lucien/ambient/AmbientReplyParser.java`
- Create: `server/src/test/java/com/recoverpro/server/lucien/ambient/AmbientReplyParserTest.java`
- Create: `server/src/main/java/com/recoverpro/server/dto/request/AmbientTurnRequest.java`
- Create: `server/src/main/java/com/recoverpro/server/dto/response/AmbientTurnResponse.java`
- Modify: `server/src/main/java/com/recoverpro/server/service/LucienService.java` — new `ambientTurn` method
- Modify: `server/src/main/java/com/recoverpro/server/service/impl/LucienServiceImpl.java` — implement it (adds `ModelClientPort` + `AmbientReplyParser` as new constructor deps)
- Modify: `server/src/test/java/com/recoverpro/server/service/impl/LucienServiceImplTest.java` — add the two new mocks to the constructor call, add ambient tests
- Modify: `server/src/main/java/com/recoverpro/server/controller/LucienController.java` — new `/ambient-turn` and `/help` endpoints
- Create: `server/src/test/java/com/recoverpro/server/controller/LucienAmbientControllerTest.java`

---

## Task 1: RunPod GPU endpoint for the LLM

**Files:** none (external service setup) — output is a URL + API key you'll use in Task 3.

- [ ] **Step 1: Create a RunPod account and Serverless endpoint**

At https://runpod.io, create a Serverless endpoint using an Ollama-compatible template (RunPod's "Ollama" quick-deploy template, or a custom container running `ollama serve` with `llama3.1:8b` pulled at build time). Pick a region in or near India. Note the endpoint URL (`https://api.runpod.ai/v2/<endpoint-id>`) and API key.

- [ ] **Step 2: Verify it responds**

```bash
curl -X POST https://api.runpod.ai/v2/<endpoint-id>/runsync \
  -H "Authorization: Bearer <api-key>" \
  -H "Content-Type: application/json" \
  -d '{"input": {"model": "llama3.1:8b", "prompt": "Say hello in one word."}}'
```

Expected: a JSON response containing generated text, within a few seconds (not 10+, which would indicate cold-start or wrong region).

- [ ] **Step 3: Note the exact request/response shape**

RunPod's Serverless wrapper is not the same wire format as Ollama's native `/api/chat` — `LlamaClientAdapter` (`server/src/main/java/com/recoverpro/server/client/LlamaClientAdapter.java`) currently talks to Ollama's native API directly. Confirm whether your chosen RunPod template exposes an Ollama-compatible passthrough path (some do, at `/ollama/api/chat`) or requires the `/runsync` wrapper shape shown above — this determines whether Task 3 needs `LlamaClientAdapter` changed or just its base URL.

---

## Task 2: Point the backend at RunPod instead of local Ollama

**Files:**
- Modify: `recoverpro/docker-compose.yml`
- Modify: `recoverpro/server/.env` (or set as a compose environment override)

**Interfaces:**
- Consumes: RunPod endpoint URL from Task 1
- Produces: `LLAMA_BASE_URL` resolving to a real, fast model backend for every later task

- [ ] **Step 1: Remove the local `ollama` service from `docker-compose.yml`**

Delete the `ollama:` service block and its `ollama_models:` volume entry (both added in the earlier free-tier-CPU version of this file) — the OCI instance no longer runs the LLM itself.

- [ ] **Step 2: Point `backend`'s `LLAMA_BASE_URL` at RunPod**

In the `backend` service's `environment:` block in `docker-compose.yml`, change:
```yaml
      LLAMA_BASE_URL: http://ollama:11434
```
to:
```yaml
      LLAMA_BASE_URL: ${RUNPOD_LLM_URL}
```
and add `RUNPOD_LLM_URL=https://api.runpod.ai/v2/<endpoint-id>` (or the Ollama-passthrough path from Task 1 Step 3) to `recoverpro/.env`. If the RunPod template requires an `Authorization` header (it does), check `LlamaClientAdapter` for how it builds its HTTP client — if there's no existing auth-header support, this needs a small adapter change (see Task 1 Step 3 note); if the template is a plain Ollama-compatible passthrough with no auth, no adapter change is needed.

- [ ] **Step 3: Verify end to end**

```bash
docker compose up -d --build backend
docker compose logs -f backend
```
Expected: backend starts without connection errors to the LLM. Then hit a Lucien chat endpoint (existing `/api/v1/lucien/chat`, requires an authenticated session) and confirm a reply comes back in a few seconds, not tens of seconds.

- [ ] **Step 4: Commit**

```bash
git add recoverpro/docker-compose.yml recoverpro/.env
git commit -m "infra: move Lucien's LLM from local CPU Ollama to RunPod GPU"
```

(Skip if `recoverpro/` isn't a git repo yet — commit once it is.)

---

## Task 3: Provision OCI and deploy backend/frontend/DB

**Files:** none — this is the OCI console + SSH session work already scoped earlier in this conversation.

- [ ] **Step 1: Create the instance**

OCI Console → Compute → Create Instance → Ubuntu 22.04 → Shape → Ampere → `VM.Standard.A1.Flex` → **2 OCPU / 12GB** (not 4/24 — the free-tier cut applies). Confirm "Always Free eligible" shows before creating. Attach your SSH key.

- [ ] **Step 2: Reserve a static public IP and open ports**

Networking → IP Management → Reserved Public IPs → create one, attach to the instance. Then in the VCN's Security List, add ingress rules for 22, 80, 443. On the instance itself:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

- [ ] **Step 3: Point DNS and set Cloudflare's SSL mode**

Add an `A` record for your domain to the reserved IP. In Cloudflare, set SSL/TLS mode to **Full (strict)** (not Flexible — causes a redirect loop with Caddy).

- [ ] **Step 4: Install Docker and deploy**

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER   # log out/in after this
# copy recoverpro/ to the instance (git clone or scp)
cd recoverpro
```
Edit `Caddyfile` — replace `yourdomain.com` with your real domain. Edit `server/.env` — update `CORS_ORIGINS`, `APP_BASE_URL`, and `OAUTH2_REDIRECT_URI` to `https://<your-domain>` (and update the same redirect URI in Google Cloud Console). Then:
```bash
docker compose up -d --build
```

- [ ] **Step 5: Verify**

```bash
curl -I https://<your-domain>
```
Expected: `200 OK` with a valid Let's Encrypt cert (Caddy issues it automatically on first request).

---

## Task 4: Remove the stray debug file write in `tts-service/app.py`

**Files:**
- Modify: `recoverpro/tts-service/app.py:203-209`

**Interfaces:**
- Consumes: nothing
- Produces: nothing — pure cleanup, unrelated to ambient mode, but touches the file this plan already depends on for STT

- [ ] **Step 1: Read the current code**

`app.py`'s `/stt` handler currently contains, inside the `try` block:
```python
        tmp.write(data)
        tmp.close()
        # Save a copy for debugging
        try:
            with open(r"C:\Users\Keerthana\.gemini\antigravity-cli\brain\79d819ae-e1dd-4039-8fea-75bff29ccf36\scratch\debug.webm", "wb") as f:
                f.write(data)
            print("[STT] Saved debug.webm successfully")
        except Exception as ex:
            print(f"[STT] Failed to save debug.webm: {ex}")
        # Decode and resample to 16kHz mono float32 using PyAV
```
This is a hardcoded path on a different developer's machine (a different tool's, `.gemini/antigravity-cli`, not this project's). It always fails here (caught and swallowed), but it's dead weight on every `/stt` call and a landmine if anyone ever runs this on a machine where that exact path happens to exist.

- [ ] **Step 2: Remove it**

Delete the inner `# Save a copy for debugging` `try/except` block entirely, leaving:
```python
        tmp.write(data)
        tmp.close()
        # Decode and resample to 16kHz mono float32 using PyAV
```

- [ ] **Step 3: Verify**

```bash
cd recoverpro/tts-service
.venv/Scripts/python.exe -m uvicorn app:app --host 127.0.0.1 --port 8100
```
Send a test clip to `POST /stt` (e.g. via curl with a small `.webm`/`.wav` file) and confirm it still transcribes and no longer prints `[STT] Saved debug.webm` / `[STT] Failed to save debug.webm`.

- [ ] **Step 4: Commit**

```bash
git add recoverpro/tts-service/app.py
git commit -m "fix: remove leftover cross-machine debug file write from /stt"
```

---

## Task 5: Ambient-mode session persistence

**Files:**
- Create: `server/src/main/resources/db/migration/V083__lucien_ambient_mode.sql`
- Modify: `server/src/main/java/com/recoverpro/server/entity/ChatSession.java`
- Modify: `server/src/main/java/com/recoverpro/server/dto/request/StartSessionRequest.java`
- Modify: `server/src/main/java/com/recoverpro/server/service/impl/LucienServiceImpl.java` (`startSession` only)
- Test: `server/src/test/java/com/recoverpro/server/service/impl/LucienServiceImplTest.java`

**Interfaces:**
- Produces: `ChatSession.getInteractionMode()` returning `"CHAT"` or `"AMBIENT"`, consumed by Task 8's `ambientTurn()`

- [ ] **Step 1: Write the failing test**

Add to `LucienServiceImplTest.java` (needs `import com.recoverpro.server.dto.request.StartSessionRequest;` if not already present — it is, per existing tests in this file):

```java
    @Test
    void startSession_ambientModeWithAllocationId_persistsAmbientInteractionMode() {
        UUID allocationId = UUID.randomUUID();
        when(sessionRepository.save(any(ChatSession.class))).thenAnswer(inv -> inv.getArgument(0));

        StartSessionRequest request = StartSessionRequest.builder()
                .agentId(agentId)
                .agentFirstName("Priya")
                .allocationId(allocationId)
                .ambientMode(true)
                .build();

        service.startSession(request, principal);

        var captor = org.mockito.ArgumentCaptor.forClass(ChatSession.class);
        verify(sessionRepository).save(captor.capture());
        assertThat(captor.getValue().getInteractionMode()).isEqualTo("AMBIENT");
    }

    @Test
    void startSession_ambientModeWithoutAllocationId_throwsBusinessException() {
        StartSessionRequest request = StartSessionRequest.builder()
                .agentId(agentId)
                .agentFirstName("Priya")
                .ambientMode(true)
                .build();

        assertThatThrownBy(() -> service.startSession(request, principal))
                .isInstanceOf(com.recoverpro.server.common.exception.BusinessException.class)
                .hasMessageContaining("ambient");
    }
```

`startSession`'s real body (lines 84-112) calls `allocationService.getAllocationById(allocationId)` for the existing visit-interview path but discards its return value (it's called only for the org-isolation check it performs internally, per the existing comment on that line) — so the mock needs no stub for it; Mockito returns `null` for the unstubbed call and the code never touches the result.

Add `import static org.assertj.core.api.Assertions.assertThatThrownBy;` if not already imported.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd recoverpro/server
mvn test -Dtest=LucienServiceImplTest#startSession_ambientModeWithAllocationId_persistsAmbientInteractionMode+startSession_ambientModeWithoutAllocationId_throwsBusinessException
```
Expected: compile error (no `ambientMode` on `StartSessionRequest`, no `getInteractionMode()` on `ChatSession`) — that's the correct starting failure.

- [ ] **Step 3: Add the migration**

`server/src/main/resources/db/migration/V083__lucien_ambient_mode.sql`:
```sql
ALTER TABLE lucien_chat_sessions
    ADD COLUMN interaction_mode VARCHAR(20) NOT NULL DEFAULT 'CHAT';
```

- [ ] **Step 4: Add the entity field**

In `ChatSession.java`, after the `allocationId` field (around line 38):
```java

    /** CHAT (default, turn-based text/voice) or AMBIENT (continuous doorstep listening — see
     * LucienServiceImpl#ambientTurn). Only meaningful when allocationId is also set. */
    @Column(name = "interaction_mode", nullable = false, length = 20)
    @Builder.Default
    private String interactionMode = "CHAT";
```

- [ ] **Step 5: Add the request flag**

In `StartSessionRequest.java`, after the `allocationId` field:
```java

    /** Only meaningful when allocationId is also set — starts the session in continuous
     * ambient-listening mode (LucienController#ambientTurn/#help) instead of turn-based chat. */
    private boolean ambientMode;
```

- [ ] **Step 6: Wire it into `startSession`**

`LucienServiceImpl.java:84-112` currently reads:
```java
    public SessionResponse startSession(StartSessionRequest request, UserPrincipal principal) {
        UUID agentId = principal.getId();
        log.info("Starting Lucien session for agentId={}", agentId);

        UUID allocationId = request.getAllocationId();
        if (allocationId != null) {
            allocationService.getAllocationById(allocationId);
            log.info("Starting Lucien visit-interview session: agentId={}, allocationId={}", agentId, allocationId);
        }

        sessionRepository.closeAllSessionsForAgent(agentId, Instant.now());
        String safeFirstName = dataSanitizer.sanitizeAgentName(request.getAgentFirstName());
        ChatSession session = ChatSession.builder()
                .agentId(agentId)
                .organizationId(principal.getOrganizationId())
                .agentFirstName(safeFirstName)
                .allocationId(allocationId)
                .isActive(true)
                .totalMessages(0)
                .build();
        ChatSession saved = sessionRepository.save(session);
        log.info("Lucien session created: id={}, agentId={}, allocationId={}",
                saved.getId(), saved.getAgentId(), saved.getAllocationId());
        return toSessionResponse(saved);
    }
```
Change it to:
```java
    public SessionResponse startSession(StartSessionRequest request, UserPrincipal principal) {
        UUID agentId = principal.getId();
        log.info("Starting Lucien session for agentId={}", agentId);

        UUID allocationId = request.getAllocationId();
        if (request.isAmbientMode() && allocationId == null) {
            throw new BusinessException("Ambient mode requires a visit (allocationId) to be set.");
        }
        if (allocationId != null) {
            allocationService.getAllocationById(allocationId);
            log.info("Starting Lucien visit-interview session: agentId={}, allocationId={}", agentId, allocationId);
        }

        sessionRepository.closeAllSessionsForAgent(agentId, Instant.now());
        String safeFirstName = dataSanitizer.sanitizeAgentName(request.getAgentFirstName());
        ChatSession session = ChatSession.builder()
                .agentId(agentId)
                .organizationId(principal.getOrganizationId())
                .agentFirstName(safeFirstName)
                .allocationId(allocationId)
                .interactionMode(request.isAmbientMode() ? "AMBIENT" : "CHAT")
                .isActive(true)
                .totalMessages(0)
                .build();
        ChatSession saved = sessionRepository.save(session);
        log.info("Lucien session created: id={}, agentId={}, allocationId={}",
                saved.getId(), saved.getAgentId(), saved.getAllocationId());
        return toSessionResponse(saved);
    }
```
`LucienServiceImpl.java` does not currently import `BusinessException` — add it at line 16 (right after the existing `ResourceNotFoundException` import on line 15, before the `SessionInactiveException` import on line 16):
```java
import com.recoverpro.server.common.exception.BusinessException;
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
mvn test -Dtest=LucienServiceImplTest
```
Expected: PASS, including all pre-existing tests in this file (nothing else should have broken).

- [ ] **Step 8: Commit**

```bash
git add server/src/main/resources/db/migration/V083__lucien_ambient_mode.sql \
        server/src/main/java/com/recoverpro/server/entity/ChatSession.java \
        server/src/main/java/com/recoverpro/server/dto/request/StartSessionRequest.java \
        server/src/main/java/com/recoverpro/server/service/impl/LucienServiceImpl.java \
        server/src/test/java/com/recoverpro/server/service/impl/LucienServiceImplTest.java
git commit -m "feat: add ambient interaction mode to Lucien sessions"
```

---

## Task 6: Ambient system prompt

**Files:**
- Modify: `server/src/main/java/com/recoverpro/server/prompt/DefaultSystemPrompt.java`

**Interfaces:**
- Produces: `AMBIENT_TEMPLATE`, `AMBIENT_FORCE_SPEAK_INSTRUCTION` constants, consumed by Task 8

- [ ] **Step 1: Write the failing test**

Create `server/src/test/java/com/recoverpro/server/prompt/DefaultSystemPromptAmbientTest.java`:
```java
package com.recoverpro.server.prompt;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DefaultSystemPromptAmbientTest {

    @Test
    void ambientTemplate_declaresTheSpeakSilentJsonContract() {
        assertThat(DefaultSystemPrompt.AMBIENT_TEMPLATE)
                .contains("\"speak\"")
                .contains("\"text\"")
                .doesNotContain("<tool_call>");
    }

    @Test
    void forceSpeakInstruction_mentionsHelpButton() {
        assertThat(DefaultSystemPrompt.AMBIENT_FORCE_SPEAK_INSTRUCTION)
                .containsIgnoringCase("help");
    }
}
```

This locks the JSON-contract keywords down as a regression guard — if someone edits the prompt later and accidentally drops the `speak`/`text` keys or reintroduces a `<tool_call>` instruction, this test catches it even though the prompt's actual behavior can only be verified against a live model.

- [ ] **Step 2: Run it to verify it fails**

```bash
mvn test -Dtest=DefaultSystemPromptAmbientTest
```
Expected: compile error, no `AMBIENT_TEMPLATE`/`AMBIENT_FORCE_SPEAK_INSTRUCTION` symbols yet.

- [ ] **Step 3: Add the constants**

In `DefaultSystemPrompt.java`, after `INTERVIEW_TEMPLATE` (after line 67):
```java

    /** Ambient mode — session is bound to a single allocation AND interactionMode=AMBIENT.
     * Lucien listens to the whole doorstep conversation continuously (one LucienServiceImpl#
     * ambientTurn call per FO/customer utterance) and speaks only when it judges there's a
     * genuinely important point, or when the FO forces a reply via the Help button.
     * ambientTurn() does not run LucienAgentLoop's ReAct tool loop — this prompt's only output
     * contract is the JSON object below, never a <tool_call> block. */
    public static final String AMBIENT_KEY = "LUCIEN_AMBIENT_VISIT_V1";

    public static final String AMBIENT_TEMPLATE = """
            You are Lucien, silently listening to {{AGENT_FIRST_NAME}}'s doorstep visit with a
            borrower right now. You receive the conversation one utterance at a time, from
            whoever just spoke (the field officer or the borrower) — not a script you drive
            turn-by-turn.

            Stay silent by default. Only speak when there is a genuinely important point:
            - the borrower makes a payment commitment, offer, or objection that needs a precise
              response
            - a compliance issue arises (e.g. calling-hours, harassment allegation)
            - the negotiation stalls and {{AGENT_FIRST_NAME}} would benefit from a concrete next
              line to say
            - {{AGENT_FIRST_NAME}} explicitly asks you something

            Otherwise, stay silent — most utterances need no reply at all.

            Respond with EXACTLY ONE JSON object and nothing else — no prose before or after it,
            no markdown code fences, no <tool_call> block:
            {"speak": true, "text": "what to say next"}
            or, when staying silent:
            {"speak": false, "text": null}

            Follow RBI Recovery Agent Code of Conduct at all times. Never share borrower PII
            beyond what {{AGENT_FIRST_NAME}} needs for this visit.
            """;

    /** Appended as a final user-turn instruction when the FO presses Help — overrides the
     * "stay silent by default" behavior above for this one turn only. */
    public static final String AMBIENT_FORCE_SPEAK_INSTRUCTION =
            "{{AGENT_FIRST_NAME}} just pressed the Help button and needs guidance right now. "
            + "You MUST respond with {\"speak\": true, ...} this turn — do not stay silent.";
```

- [ ] **Step 4: Run it to verify it passes**

```bash
mvn test -Dtest=DefaultSystemPromptAmbientTest
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/main/java/com/recoverpro/server/prompt/DefaultSystemPrompt.java \
        server/src/test/java/com/recoverpro/server/prompt/DefaultSystemPromptAmbientTest.java
git commit -m "feat: add ambient-mode system prompt with speak/silent JSON contract"
```

---

## Task 7: `AmbientReplyParser`

**Files:**
- Create: `server/src/main/java/com/recoverpro/server/lucien/ambient/AmbientReplyParser.java`
- Test: `server/src/test/java/com/recoverpro/server/lucien/ambient/AmbientReplyParserTest.java`

**Interfaces:**
- Produces: `AmbientReplyParser.parse(String rawContent) -> AmbientReplyParser.AmbientReply` where `AmbientReply` has `speak(): boolean` and `text(): String` (nullable). Consumed by Task 8.

- [ ] **Step 1: Write the failing tests**

`server/src/test/java/com/recoverpro/server/lucien/ambient/AmbientReplyParserTest.java`:
```java
package com.recoverpro.server.lucien.ambient;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AmbientReplyParserTest {

    private AmbientReplyParser parser;

    @BeforeEach
    void setUp() {
        parser = new AmbientReplyParser(new ObjectMapper());
    }

    @Test
    void parse_cleanSpeakTrue_returnsSpeakWithText() {
        var reply = parser.parse("{\"speak\": true, \"text\": \"Ask when he can pay.\"}");
        assertThat(reply.speak()).isTrue();
        assertThat(reply.text()).isEqualTo("Ask when he can pay.");
    }

    @Test
    void parse_cleanSpeakFalse_returnsSilent() {
        var reply = parser.parse("{\"speak\": false, \"text\": null}");
        assertThat(reply.speak()).isFalse();
        assertThat(reply.text()).isNull();
    }

    @Test
    void parse_jsonWrappedInMarkdownFence_stillExtracted() {
        var reply = parser.parse("```json\n{\"speak\": true, \"text\": \"Offer a 10% discount.\"}\n```");
        assertThat(reply.speak()).isTrue();
        assertThat(reply.text()).isEqualTo("Offer a 10% discount.");
    }

    @Test
    void parse_malformedJson_returnsSilentNotException() {
        var reply = parser.parse("Sure, here's my thought: {speak: true, text unquoted}");
        assertThat(reply.speak()).isFalse();
        assertThat(reply.text()).isNull();
    }

    @Test
    void parse_speakTrueWithBlankText_returnsSilent() {
        var reply = parser.parse("{\"speak\": true, \"text\": \"\"}");
        assertThat(reply.speak()).isFalse();
    }

    @Test
    void parse_emptyContent_returnsSilent() {
        var reply = parser.parse("");
        assertThat(reply.speak()).isFalse();
    }
}
```

- [ ] **Step 2: Run to verify failure**

```bash
mvn test -Dtest=AmbientReplyParserTest
```
Expected: compile error — `AmbientReplyParser` doesn't exist yet.

- [ ] **Step 3: Implement it**

`server/src/main/java/com/recoverpro/server/lucien/ambient/AmbientReplyParser.java`:
```java
package com.recoverpro.server.lucien.ambient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses the {"speak": bool, "text": "..."} contract LUCIEN_AMBIENT_VISIT_V1 requires from the
 * model. The model is a small local/GPU-hosted LLM, not a hosted API with guaranteed structured
 * output — it sometimes wraps the JSON in a markdown code fence or adds a stray sentence, so
 * this extracts the first {...} block rather than requiring the whole response to parse as JSON.
 * Anything that still fails to parse is treated as "stay silent" rather than surfaced as an
 * error — an ambient turn that mistakenly stays silent is far less harmful mid-visit than one
 * that crashes the request or accidentally speaks garbage to the borrower.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AmbientReplyParser {

    private static final Pattern JSON_OBJECT = Pattern.compile("\\{[\\s\\S]*\\}");

    private final ObjectMapper objectMapper;

    public AmbientReply parse(String rawContent) {
        if (rawContent == null || rawContent.isBlank()) {
            return AmbientReply.silent();
        }
        Matcher matcher = JSON_OBJECT.matcher(rawContent);
        if (!matcher.find()) {
            log.warn("Ambient reply had no JSON object, treating as silent: {}", rawContent);
            return AmbientReply.silent();
        }
        try {
            JsonNode node = objectMapper.readTree(matcher.group());
            boolean speak = node.path("speak").asBoolean(false);
            String text = node.path("text").isNull() ? null : node.path("text").asText(null);
            if (speak && (text == null || text.isBlank())) {
                log.warn("Ambient reply had speak=true but no text, treating as silent: {}", rawContent);
                return AmbientReply.silent();
            }
            return new AmbientReply(speak, speak ? text : null);
        } catch (Exception e) {
            log.warn("Malformed ambient reply JSON, treating as silent: {}", rawContent, e);
            return AmbientReply.silent();
        }
    }

    public record AmbientReply(boolean speak, String text) {
        public static AmbientReply silent() {
            return new AmbientReply(false, null);
        }
    }
}
```

- [ ] **Step 4: Run to verify pass**

```bash
mvn test -Dtest=AmbientReplyParserTest
```
Expected: PASS, all 6 cases.

- [ ] **Step 5: Commit**

```bash
git add server/src/main/java/com/recoverpro/server/lucien/ambient/AmbientReplyParser.java \
        server/src/test/java/com/recoverpro/server/lucien/ambient/AmbientReplyParserTest.java
git commit -m "feat: add AmbientReplyParser for Lucien's speak/silent JSON contract"
```

---

## Task 8: `LucienService.ambientTurn()`

**Files:**
- Create: `server/src/main/java/com/recoverpro/server/dto/request/AmbientTurnRequest.java`
- Create: `server/src/main/java/com/recoverpro/server/dto/response/AmbientTurnResponse.java`
- Modify: `server/src/main/java/com/recoverpro/server/service/LucienService.java`
- Modify: `server/src/main/java/com/recoverpro/server/service/impl/LucienServiceImpl.java`
- Modify: `server/src/test/java/com/recoverpro/server/service/impl/LucienServiceImplTest.java`

**Interfaces:**
- Consumes: `ChatSession.getInteractionMode()` (Task 5), `DefaultSystemPrompt.AMBIENT_TEMPLATE`/`AMBIENT_FORCE_SPEAK_INSTRUCTION` (Task 6), `AmbientReplyParser.parse()` (Task 7), `ModelClientPort.chat(List<LlamaMessage>) -> ModelClientResponse`, `ChatMessageRepository.findBySessionIdOrderByCreatedAtAsc(String)` (already exists)
- Produces: `LucienService.ambientTurn(String sessionId, AmbientTurnRequest request, boolean forceSpeak, UserPrincipal principal) -> AmbientTurnResponse`, consumed by Task 9 (controller)

- [ ] **Step 1: Write the failing tests**

Add to `LucienServiceImplTest.java`. First, add the two new mocks near the existing `@Mock` fields (after line 74):
```java
    @Mock private com.recoverpro.server.port.ModelClientPort modelClientPort;
    @Mock private com.recoverpro.server.lucien.ambient.AmbientReplyParser ambientReplyParser;
```

Update the `service = new LucienServiceImpl(...)` call in `setUp()` (lines 83-87) to append the two new constructor args at the end:
```java
        service = new LucienServiceImpl(sessionRepository, messageRepository, inputSafetyFilter,
                outputSafetyFilter, systemPromptBuilder, systemPromptService, agentContextService,
                contextAssembler, dataSanitizer, chatRateLimiter, tokenBudgetService, agentLoop,
                toolRegistry, confirmationService, orgIsolationGuard, allocationService,
                visitInterviewContextService, modelClientPort, ambientReplyParser);
```

Then add the tests:
```java
    @Test
    void ambientTurn_modelStaysSilent_persistsUserMessageOnlyAndReturnsNoSpeak() {
        ChatSession ambientSession = ChatSession.builder()
                .id("sess-1").agentId(agentId).organizationId(principal.getOrganizationId())
                .allocationId(UUID.randomUUID()).agentFirstName("Priya")
                .interactionMode("AMBIENT").isActive(true).totalMessages(0).build();
        when(sessionRepository.findByIdAndIsActiveTrue("sess-1")).thenReturn(Optional.of(ambientSession));
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc("sess-1")).thenReturn(List.of());
        when(modelClientPort.chat(any())).thenReturn(
                new com.recoverpro.server.port.ModelClientResponse("{\"speak\":false,\"text\":null}", 10, 5));
        when(ambientReplyParser.parse(anyString()))
                .thenReturn(com.recoverpro.server.lucien.ambient.AmbientReplyParser.AmbientReply.silent());

        var request = com.recoverpro.server.dto.request.AmbientTurnRequest.builder()
                .text("Customer says nothing, just opened the door.").build();

        var response = service.ambientTurn("sess-1", request, false, principal);

        assertThat(response.isSpeak()).isFalse();
        assertThat(response.getText()).isNull();
        verify(messageRepository, org.mockito.Mockito.times(1)).save(any(ChatMessage.class));
    }

    @Test
    void ambientTurn_modelDecidesToSpeak_persistsBothMessagesAndReturnsText() {
        ChatSession ambientSession = ChatSession.builder()
                .id("sess-2").agentId(agentId).organizationId(principal.getOrganizationId())
                .allocationId(UUID.randomUUID()).agentFirstName("Priya")
                .interactionMode("AMBIENT").isActive(true).totalMessages(0).build();
        when(sessionRepository.findByIdAndIsActiveTrue("sess-2")).thenReturn(Optional.of(ambientSession));
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc("sess-2")).thenReturn(List.of());
        when(modelClientPort.chat(any())).thenReturn(
                new com.recoverpro.server.port.ModelClientResponse(
                        "{\"speak\":true,\"text\":\"Ask if he can pay half today.\"}", 12, 8));
        when(ambientReplyParser.parse(anyString())).thenReturn(
                new com.recoverpro.server.lucien.ambient.AmbientReplyParser.AmbientReply(
                        true, "Ask if he can pay half today."));

        var request = com.recoverpro.server.dto.request.AmbientTurnRequest.builder()
                .text("Customer says I don't have the full amount.").build();

        var response = service.ambientTurn("sess-2", request, false, principal);

        assertThat(response.isSpeak()).isTrue();
        assertThat(response.getText()).isEqualTo("Ask if he can pay half today.");
        verify(messageRepository, org.mockito.Mockito.times(2)).save(any(ChatMessage.class));
    }

    @Test
    void ambientTurn_forceSpeak_addsHelpInstructionToPromptMessages() {
        ChatSession ambientSession = ChatSession.builder()
                .id("sess-3").agentId(agentId).organizationId(principal.getOrganizationId())
                .allocationId(UUID.randomUUID()).agentFirstName("Priya")
                .interactionMode("AMBIENT").isActive(true).totalMessages(0).build();
        when(sessionRepository.findByIdAndIsActiveTrue("sess-3")).thenReturn(Optional.of(ambientSession));
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc("sess-3")).thenReturn(List.of());
        when(modelClientPort.chat(any())).thenReturn(
                new com.recoverpro.server.port.ModelClientResponse(
                        "{\"speak\":true,\"text\":\"Try offering a payment plan.\"}", 12, 8));
        when(ambientReplyParser.parse(anyString())).thenReturn(
                new com.recoverpro.server.lucien.ambient.AmbientReplyParser.AmbientReply(
                        true, "Try offering a payment plan."));

        var request = com.recoverpro.server.dto.request.AmbientTurnRequest.builder()
                .text("Long silence, negotiation stalled.").build();

        service.ambientTurn("sess-3", request, true, principal);

        var captor = org.mockito.ArgumentCaptor.forClass(java.util.List.class);
        verify(modelClientPort).chat((List<com.recoverpro.server.client.LlamaMessage>) captor.capture());
        List<com.recoverpro.server.client.LlamaMessage> sentMessages = captor.getValue();
        assertThat(sentMessages.stream().anyMatch(m -> m.getContent().contains("Help button")))
                .isTrue();
    }

    @Test
    void ambientTurn_sessionNotInAmbientMode_throwsBusinessException() {
        ChatSession chatSession = ChatSession.builder()
                .id("sess-4").agentId(agentId).organizationId(principal.getOrganizationId())
                .allocationId(UUID.randomUUID()).agentFirstName("Priya")
                .interactionMode("CHAT").isActive(true).totalMessages(0).build();
        when(sessionRepository.findByIdAndIsActiveTrue("sess-4")).thenReturn(Optional.of(chatSession));

        var request = com.recoverpro.server.dto.request.AmbientTurnRequest.builder()
                .text("hello").build();

        assertThatThrownBy(() -> service.ambientTurn("sess-4", request, false, principal))
                .isInstanceOf(com.recoverpro.server.common.exception.BusinessException.class);
    }
```

- [ ] **Step 2: Run to verify failure**

```bash
mvn test -Dtest=LucienServiceImplTest
```
Expected: compile errors (no `AmbientTurnRequest`/`AmbientTurnResponse` classes, no `ambientTurn` method, constructor arg-count mismatch).

- [ ] **Step 3: Create the DTOs**

`server/src/main/java/com/recoverpro/server/dto/request/AmbientTurnRequest.java`:
```java
package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AmbientTurnRequest {

    /** The transcribed utterance for this turn — one VAD-segmented chunk from the frontend's
     * continuous mic capture, already run through SttClient. */
    @NotBlank
    private String text;

    /** Optional — "fo" or "customer" if the frontend can tell them apart, null otherwise.
     * Lucien is prompted to infer speaker structure without this if it's absent. */
    private String speakerHint;
}
```

`server/src/main/java/com/recoverpro/server/dto/response/AmbientTurnResponse.java`:
```java
package com.recoverpro.server.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class AmbientTurnResponse {

    private boolean speak;
    private String text;
}
```

- [ ] **Step 4: Add the interface method**

In `LucienService.java`, after `confirmAction` (after line 23):
```java

    /**
     * One turn of ambient (continuous doorstep listening) mode. Unlike chat(), this does not
     * always produce a reply — see LUCIEN_AMBIENT_VISIT_V1's speak/silent contract.
     *
     * @param forceSpeak true when the FO pressed the Help button — overrides the "stay silent
     *                    by default" instruction for this turn only.
     */
    AmbientTurnResponse ambientTurn(String sessionId, AmbientTurnRequest request,
                                     boolean forceSpeak, UserPrincipal principal);
```
Add the needed imports at the top: `com.recoverpro.server.dto.request.AmbientTurnRequest` and `com.recoverpro.server.dto.response.AmbientTurnResponse`.

- [ ] **Step 5: Add the two new constructor dependencies**

In `LucienServiceImpl.java`, after the `visitInterviewContextService` field (line 74):
```java
    private final ModelClientPort modelClientPort;
    private final AmbientReplyParser ambientReplyParser;
```
Add imports: `com.recoverpro.server.port.ModelClientPort`, `com.recoverpro.server.port.ModelClientResponse`, `com.recoverpro.server.lucien.ambient.AmbientReplyParser`, `com.recoverpro.server.dto.request.AmbientTurnRequest`, `com.recoverpro.server.dto.response.AmbientTurnResponse`. `@RequiredArgsConstructor` regenerates the constructor automatically with these appended last — matching the test's updated `new LucienServiceImpl(...)` call order from Step 1.

- [ ] **Step 6: Implement `ambientTurn()`**

Add to `LucienServiceImpl.java`:
```java
    private static final int AMBIENT_MAX_HISTORY_MESSAGES = 30;

    @Override
    @Transactional
    public AmbientTurnResponse ambientTurn(String sessionId, AmbientTurnRequest request,
                                            boolean forceSpeak, UserPrincipal principal) {
        ChatSession session = sessionRepository.findByIdAndIsActiveTrue(sessionId)
                .orElseThrow(() -> new SessionInactiveException(
                        "Session not found or no longer active: " + sessionId));
        if (!principal.getId().equals(session.getAgentId())) {
            throw new ResourceNotFoundException("Session not found: " + sessionId);
        }
        if (session.getAllocationId() == null || !"AMBIENT".equals(session.getInteractionMode())) {
            throw new BusinessException("This session is not in ambient-listening mode.");
        }

        ChatMessage userMsg = ChatMessage.builder()
                .session(session)
                .agentId(session.getAgentId())
                .organizationId(session.getOrganizationId())
                .role(ChatRole.USER)
                .content(request.getSpeakerHint() != null
                        ? "[" + request.getSpeakerHint() + "] " + request.getText()
                        : request.getText())
                .build();
        messageRepository.save(userMsg);
        sessionRepository.incrementMessageCount(session.getId());

        List<LlamaMessage> messages = new ArrayList<>();
        String systemPrompt = DefaultSystemPrompt.AMBIENT_TEMPLATE
                .replace("{{AGENT_FIRST_NAME}}", session.getAgentFirstName());
        messages.add(LlamaMessage.builder().role("system").content(systemPrompt).build());

        List<ChatMessage> history = messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId());
        int fromIndex = Math.max(0, history.size() - AMBIENT_MAX_HISTORY_MESSAGES);
        for (ChatMessage m : history.subList(fromIndex, history.size())) {
            messages.add(LlamaMessage.builder()
                    .role(m.getRole() == ChatRole.ASSISTANT ? "assistant" : "user")
                    .content(m.getContent())
                    .build());
        }

        if (forceSpeak) {
            messages.add(LlamaMessage.builder().role("user")
                    .content(DefaultSystemPrompt.AMBIENT_FORCE_SPEAK_INSTRUCTION
                            .replace("{{AGENT_FIRST_NAME}}", session.getAgentFirstName()))
                    .build());
        }

        ModelClientResponse modelResponse = modelClientPort.chat(messages);
        AmbientReplyParser.AmbientReply reply = ambientReplyParser.parse(modelResponse.content());

        if (reply.speak()) {
            ChatMessage assistantMsg = ChatMessage.builder()
                    .session(session)
                    .agentId(session.getAgentId())
                    .organizationId(session.getOrganizationId())
                    .role(ChatRole.ASSISTANT)
                    .content(reply.text())
                    .inputTokens(modelResponse.inputTokens())
                    .outputTokens(modelResponse.outputTokens())
                    .build();
            messageRepository.save(assistantMsg);
            sessionRepository.incrementMessageCount(session.getId());
        }

        return AmbientTurnResponse.builder().speak(reply.speak()).text(reply.text()).build();
    }
```

- [ ] **Step 7: Run to verify pass**

```bash
mvn test -Dtest=LucienServiceImplTest
```
Expected: PASS, including every pre-existing test in this file.

- [ ] **Step 8: Commit**

```bash
git add server/src/main/java/com/recoverpro/server/dto/request/AmbientTurnRequest.java \
        server/src/main/java/com/recoverpro/server/dto/response/AmbientTurnResponse.java \
        server/src/main/java/com/recoverpro/server/service/LucienService.java \
        server/src/main/java/com/recoverpro/server/service/impl/LucienServiceImpl.java \
        server/src/test/java/com/recoverpro/server/service/impl/LucienServiceImplTest.java
git commit -m "feat: implement LucienService.ambientTurn()"
```

---

## Task 9: Controller endpoints

**Files:**
- Modify: `server/src/main/java/com/recoverpro/server/controller/LucienController.java`
- Create: `server/src/test/java/com/recoverpro/server/controller/LucienAmbientControllerTest.java`

**Interfaces:**
- Consumes: `LucienService.ambientTurn(...)` (Task 8)
- Produces: `POST /api/v1/lucien/sessions/{sessionId}/ambient-turn`, `POST /api/v1/lucien/sessions/{sessionId}/help`

- [ ] **Step 1: Write the failing test**

`server/src/test/java/com/recoverpro/server/controller/LucienAmbientControllerTest.java`:
```java
package com.recoverpro.server.controller;

import com.recoverpro.server.client.SttClient;
import com.recoverpro.server.client.TtsClient;
import com.recoverpro.server.dto.request.AmbientTurnRequest;
import com.recoverpro.server.dto.response.AmbientTurnResponse;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.LucienService;
import com.recoverpro.server.service.VisitInterviewService;
import com.recoverpro.server.service.ai.TranslationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LucienAmbientControllerTest {

    @Mock private LucienService lucienService;
    @Mock private VisitInterviewService visitInterviewService;
    @Mock private TtsClient ttsClient;
    @Mock private SttClient sttClient;
    @Mock private TranslationService translationService;

    private LucienController controller;
    private UserPrincipal principal;

    @BeforeEach
    void setUp() {
        controller = new LucienController(
                lucienService, visitInterviewService, ttsClient, sttClient, translationService);
        User user = User.builder().id(UUID.randomUUID()).organizationId(UUID.randomUUID()).build();
        principal = new UserPrincipal(user);
    }

    @Test
    void ambientTurn_delegatesToServiceWithForceSpeakFalse() {
        AmbientTurnRequest request = AmbientTurnRequest.builder().text("hello").build();
        AmbientTurnResponse expected = AmbientTurnResponse.builder().speak(false).text(null).build();
        when(lucienService.ambientTurn(eq("sess-1"), eq(request), eq(false), eq(principal)))
                .thenReturn(expected);

        var response = controller.ambientTurn("sess-1", request, principal);

        assertThat(response.getBody().getData()).isEqualTo(expected);
    }

    @Test
    void help_delegatesToServiceWithForceSpeakTrue() {
        AmbientTurnRequest request = AmbientTurnRequest.builder().text("silence").build();
        AmbientTurnResponse expected = AmbientTurnResponse.builder()
                .speak(true).text("Try a payment plan.").build();
        when(lucienService.ambientTurn(eq("sess-2"), eq(request), eq(true), eq(principal)))
                .thenReturn(expected);

        var response = controller.help("sess-2", request, principal);

        assertThat(response.getBody().getData()).isEqualTo(expected);
        ArgumentCaptor<Boolean> forceSpeakCaptor = ArgumentCaptor.forClass(Boolean.class);
        verify(lucienService).ambientTurn(eq("sess-2"), eq(request), forceSpeakCaptor.capture(), eq(principal));
        assertThat(forceSpeakCaptor.getValue()).isTrue();
    }
}
```

- [ ] **Step 2: Run to verify failure**

```bash
mvn test -Dtest=LucienAmbientControllerTest
```
Expected: compile error — no `ambientTurn`/`help` methods on `LucienController` yet.

- [ ] **Step 3: Add the endpoints**

In `LucienController.java`, after `confirmAction` (after line 91):
```java

    @PostMapping("/sessions/{sessionId}/ambient-turn")
    @RequiresFeature(PlanFeatureMatrix.LUCIEN_AI)
    public ResponseEntity<ApiResponse<AmbientTurnResponse>> ambientTurn(
            @PathVariable String sessionId,
            @Valid @RequestBody AmbientTurnRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.debug("POST /api/v1/lucien/sessions/{}/ambient-turn", sessionId);
        AmbientTurnResponse response = lucienService.ambientTurn(sessionId, request, false, principal);
        return ResponseEntity.ok(ApiResponse.success(response, "Ambient turn processed."));
    }

    /** FO pressed the Help button — forces Lucien to respond this turn regardless of its own
     * silent/speak judgment. Same underlying path as ambientTurn(), forceSpeak=true. */
    @PostMapping("/sessions/{sessionId}/help")
    @RequiresFeature(PlanFeatureMatrix.LUCIEN_AI)
    public ResponseEntity<ApiResponse<AmbientTurnResponse>> help(
            @PathVariable String sessionId,
            @Valid @RequestBody AmbientTurnRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("POST /api/v1/lucien/sessions/{}/help", sessionId);
        AmbientTurnResponse response = lucienService.ambientTurn(sessionId, request, true, principal);
        return ResponseEntity.ok(ApiResponse.success(response, "Help response generated."));
    }
```
Add imports: `com.recoverpro.server.dto.request.AmbientTurnRequest`, `com.recoverpro.server.dto.response.AmbientTurnResponse`.

- [ ] **Step 4: Run to verify pass**

```bash
mvn test -Dtest=LucienAmbientControllerTest
```
Expected: PASS.

- [ ] **Step 5: Run the full backend test suite**

```bash
mvn test
```
Expected: PASS — this is the point in the plan where a full-suite run matters most, since Task 8 changed a widely-depended-on constructor.

- [ ] **Step 6: Commit**

```bash
git add server/src/main/java/com/recoverpro/server/controller/LucienController.java \
        server/src/test/java/com/recoverpro/server/controller/LucienAmbientControllerTest.java
git commit -m "feat: add /ambient-turn and /help endpoints to LucienController"
```

---

## Self-Review Notes

- **Spec coverage:** infra move to OCI+RunPod (Tasks 1-3), ambient session mode + speak-only-when-warranted decision + Help-button override (Tasks 5-9), the earlier-identified stray debug-file bug (Task 4) — all covered.
- **Deliberately deferred, not forgotten:** the actual mobile-app capture UI (continuous mic + VAD + calling these new endpoints) and multi-language activation (Hindi/Tamil/Kannada/Telugu — the existing `TtsClient`/`SttClient`/`translateForSpeech` code already targets exactly these 4) are real estimated work but a different codebase/stack (Expo/React Native) that wasn't explored in this session. Write that as its own plan once this one lands — per the writing-plans skill's guidance to split multi-subsystem specs rather than guess at unread code.
- **Type consistency check:** `AmbientTurnRequest`/`AmbientTurnResponse` field names and `AmbientReplyParser.AmbientReply` accessor names (`speak()`, `text()`) are used identically across Tasks 7, 8, and 9.

## Not in this plan (next plan, once this lands)

1. **Mobile capture UI** (`recoverpro/mobile/`, Expo/RN) — continuous mic capture, VAD-based utterance segmentation, calling `/transcribe` per utterance then `/ambient-turn`, a Help button calling `/help`, and audio playback (browser/device TTS for English, matching the existing `LucienPanel` pattern).
2. **Multi-language activation** — `TtsClient`/`SttClient` already target exactly Hindi/Tamil/Kannada/Telugu; the work left is (a) moving IndicF5 onto the RunPod GPU pod (currently ~8-9 min/reply on CPU, per `application.properties:167-171` — not viable), (b) removing the `TranslationService` "TEMPORARY" hack once IndicF5 is fast enough to speak Lucien's reply directly instead of pre-translating through an extra LLM call, (c) upgrading `WHISPER_MODEL_SIZE` from `small` to `large-v3` (or evaluating AI4Bharat's own ASR) for Dravidian-language accuracy, and (d) automatic language detection for ambient mode, since the current `/transcribe` and `/stt` both take an explicit `lang` param rather than auto-detecting.
