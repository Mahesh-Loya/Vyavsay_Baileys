# AI Voice Call System Research for Vyavsay Assist

Date: 2026-04-10
Branch: feature/hackathon-ai-voice-agent

## 1) Goal
Build a human-like AI voice calling system where the agent can:
- handle inbound and outbound customer calls
- perform business actions during the call (appointment booking, follow-up task creation, location sharing, escalation)
- produce complete post-call logs (transcript, intent/actions, summary, outcome)
- integrate into the existing Vyavsay Assist stack (Fastify + Supabase + existing CRM/task pipeline)

## 2) Existing Project Fit (Current Reality)
Current platform already has strong foundations for this:
- AI intent + task extraction pipeline in backend service layer
- task persistence and lead management already operational
- appointment logic already present in conversation pipeline
- reminder scheduling infrastructure already present
- WhatsApp follow-up channel already operational via Baileys

Implication:
- You do NOT need to build business logic from zero.
- You mainly need to add a real-time voice transport layer + call session orchestration + observability layer.

## 3) Capability Requirements (Must Have)
- low-latency turn-taking with interruption handling
- call controls: answer, hangup, transfer, DTMF handling
- tool/function calling to backend APIs
- robust call logging with replayable event timeline
- fallback behavior during model/provider degradation
- outbound message follow-up after call (WhatsApp/SMS with booking details or location)

## 4) Options Landscape

## Option A: Managed Voice-Agent Platform (Vapi / Retell) + Telephony Provider
Architecture:
- telephony and turn-taking managed by platform
- platform calls your backend webhooks for actions
- your Fastify app remains source of truth for leads/tasks/appointments

Pros:
- fastest time-to-demo
- minimal audio infra complexity
- built-in call monitoring tooling in platform dashboards
- easier to get natural conversational behavior quickly

Cons:
- vendor lock-in risk
- per-minute platform markup on top of LLM + telephony
- less low-level control of audio pipeline and routing internals
- migration complexity later if you want to self-host core real-time stack

Feasibility:
- Build complexity: Low
- Hackathon readiness: Very high
- Long-term platform control: Medium-Low

Best when:
- priority is speed and polished demo quality in days, not infra control

---

## Option B: Twilio Media Streams + Your Own Realtime Orchestrator + OpenAI Realtime
Architecture:
- Twilio handles PSTN/SIP call ingress/egress
- Media Streams WebSocket carries mulaw 8k audio frames to your backend
- your real-time service bridges Twilio audio and OpenAI Realtime session
- tool calls route to existing Fastify APIs

Pros:
- strong ecosystem and production maturity
- deep call-control customization
- direct ownership of orchestration and observability
- easier to optimize costs/tool logic over time

Cons:
- significantly more engineering than managed platforms
- audio framing, buffering, barge-in, and stream control must be implemented carefully
- requires strong error/retry handling for two streaming systems (telephony + model)

Feasibility:
- Build complexity: Medium-High
- Hackathon readiness: Medium (possible with strict scope)
- Long-term control: High

Best when:
- you want a product-grade architecture you own, and can spend engineering effort

---

## Option C: OpenAI Realtime SIP Direct (with SIP trunk provider)
Architecture:
- SIP trunk points directly to OpenAI SIP endpoint
- webhook receives incoming call event
- app accepts/rejects call and monitors events via WebSocket
- tool calls hit your backend APIs

Pros:
- minimal media-bridge complexity
- potentially lower moving parts than custom Twilio stream bridge
- strong fit if SIP flow is stable in target regions/providers

Cons:
- SIP trunk interoperability and regional telco details must be tested deeply
- fewer ecosystem examples than Twilio-heavy patterns
- still requires robust webhook security and call lifecycle handling

Feasibility:
- Build complexity: Medium
- Hackathon readiness: Medium-High
- Long-term control: High

Best when:
- you want fewer components than Twilio-stream bridge and are comfortable with SIP setup

---

## Option D: LiveKit Agents + SIP Trunk (Twilio/Other)
Architecture:
- LiveKit handles real-time media orchestration and agent runtime model plumbing
- telephony bridged through LiveKit SIP trunks/dispatch
- your backend exposed as tools for CRM actions

Pros:
- excellent real-time framework and agent abstractions
- good for future multimodal expansion (web voice/video + call center)
- robust telephony feature set and routing primitives

Cons:
- additional platform to learn/operate
- likely overkill for first hackathon version if only phone voice is needed
- cost model adds another layer

Feasibility:
- Build complexity: Medium-High
- Hackathon readiness: Medium
- Long-term extensibility: Very High

Best when:
- roadmap includes advanced multi-agent or multimodal interactions beyond PSTN calls

---

## Option E: Fully Self-Hosted Voice Stack (SIP + STT + LLM + TTS)
Architecture:
- self-managed SIP/PBX + custom media pipeline + model providers

Pros:
- full control, no platform lock-in
- potentially best unit economics at very large scale

Cons:
- highest complexity and highest operational risk
- slowest path to reliable natural conversation
- not suitable for near-term hackathon delivery

Feasibility:
- Build complexity: Very High
- Hackathon readiness: Low
- Long-term control: Very High

Best when:
- large dedicated infra team and strict vendor constraints

## 5) Comparative Feasibility Matrix

Scoring: 1 (worst) to 5 (best)

| Option | Build Speed | Demo Quality Speed | Control | Scalability Path | Ops Complexity | Overall for Hackathon |
|---|---:|---:|---:|---:|---:|---:|
| A Managed (Vapi/Retell) | 5 | 5 | 2 | 3 | 4 | 5 |
| B Twilio + Custom Orchestrator | 3 | 3 | 5 | 5 | 2 | 3 |
| C OpenAI SIP Direct | 4 | 4 | 4 | 4 | 3 | 4 |
| D LiveKit Agents + SIP | 3 | 3 | 4 | 5 | 3 | 3 |
| E Fully Self-Hosted | 1 | 1 | 5 | 5 | 1 | 1 |

## 6) Recommendation

For your stated goal (showing strong hackathon innovation without destabilizing main):

Primary recommendation:
- Phase 1 (hackathon branch): Option C or Option A
  - Option C if you want technical depth + ownership
  - Option A if you want fastest polished demo

Secondary recommendation (post-hackathon hardening):
- move toward Option B for deeper ownership if call volume and customization grow

Why this is best for Vyavsay Assist:
- your backend already has business action logic (appointments/tasks/leads)
- the missing piece is real-time voice session handling, not CRM semantics
- fastest wins come from connecting voice transport to existing tools

## 7) Proposed Voice System Design (Project-Specific)

Core services to add:
- voice-gateway service:
  - telephony webhooks (incoming call events)
  - call lifecycle API (accept/reject/hangup/transfer)
  - stream broker between telephony and model
- voice-agent orchestration:
  - tool router to existing task/lead/catalog APIs
  - guardrails and confidence thresholds
  - fallback scripts on errors/timeouts
- voice-observability:
  - transcript timeline
  - action audit log
  - per-turn latency and errors

Data model additions:
- wb_calls
  - id, user_id, provider, provider_call_id, direction, from_number, to_number
  - status, started_at, ended_at, duration_sec
  - recording_url, summary, outcome, sentiment
- wb_call_events
  - id, call_id, ts, event_type, payload_json
- wb_call_transcript_segments
  - id, call_id, ts_start, ts_end, speaker, text, confidence
- wb_call_actions
  - id, call_id, action_name, action_args_json, action_result_json, success, latency_ms

Action tool contract examples:
- create_appointment(customer_phone, iso_datetime, service, notes)
- create_task(title, due_date, priority, customer_phone)
- share_location(customer_phone, maps_url, channel_preference)
- handoff_to_human(reason, queue)

Location sharing pattern:
- during call, tool prepares map link and confirmation text
- after caller confirms, send WhatsApp follow-up via existing pipeline
- if WhatsApp not available, fallback to SMS provider

## 8) Non-Functional Requirements and Risks

Latency targets:
- partial ASR display: under 500 ms
- first agent spoken response chunk: under 1.2 s ideal
- barge-in interruption response: under 300 ms reaction

Reliability patterns:
- circuit breakers around model/tool endpoints
- deterministic fallback prompts when tool calls fail
- call-safe state machine with idempotent event handling

Compliance and legal considerations (must validate with counsel):
- call recording consent language at call start
- storage retention policies for transcripts/recordings
- outbound calling consent and DND/telemarketing restrictions per operating region
- PII minimization and role-based access in dashboard

## 9) Cost Model Framework

Total cost per minute approximately:
- telephony minute cost (inbound/outbound)
- model realtime audio token cost
- optional STT/TTS if using split pipeline
- platform margin (if managed option)
- storage cost for recordings/transcripts

Use this formula:
- cost_per_call = (minutes * telephony_rate) + (minutes * ai_rate) + logging_storage + platform_fee

Recommendation:
- run a 100-call pilot and compute blended real cost before large rollout
- include retries/failed call overhead in the denominator

## 10) Hackathon Implementation Plan (Practical)

Week 1 scope for branch demo:
1. inbound call handling with one number
2. voice Q&A for inventory and pricing
3. tool call: appointment booking into existing wb_tasks
4. tool call: location share via WhatsApp follow-up message
5. post-call summary + transcript + actions page in dashboard

Must-have guardrails for demo:
- explicit fallback line when uncertain
- hard timeout per tool call
- profanity/abuse safe response policy
- one-click human handoff trigger

## 11) Decision Guide

Choose A (Managed) if:
- you need best demo in least engineering time
- you accept platform lock-in for now

Choose C (OpenAI SIP Direct) if:
- you want stronger technical story and control
- you can test SIP compatibility early with your target telco/provider

Choose B later if:
- you need fine-grained media control and custom cost/performance tuning at scale

## 12) Source Notes Used in This Research

- OpenAI Realtime guide: https://developers.openai.com/api/docs/guides/realtime
- OpenAI Realtime SIP guide: https://developers.openai.com/api/docs/guides/realtime-sip
- Twilio Media Streams overview: https://www.twilio.com/docs/voice/media-streams
- Twilio Media Streams WebSocket messages: https://www.twilio.com/docs/voice/media-streams/websocket-messages
- LiveKit Agents intro: https://docs.livekit.io/agents/
- LiveKit telephony intro: https://docs.livekit.io/telephony/
- Vapi docs intro: https://docs.vapi.ai/
- Vapi tools intro: https://docs.vapi.ai/assistants/tools
- Retell docs intro: https://docs.retellai.com/
- Exotel API intro: https://developer.exotel.com/api/
- Plivo voice docs: https://www.plivo.com/docs/voice

---

## Final Practical Verdict

For Vyavsay Assist hackathon branch, build either:
- managed fast-track demo (Option A), or
- OpenAI SIP direct ownership-track demo (Option C).

Both can deliver your exact ask (human-like calls + booking/location actions + full logs) while keeping main branch clean.
