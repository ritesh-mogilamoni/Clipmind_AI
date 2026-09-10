import logging
import json
import urllib.request
import urllib.error
from typing import List, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


def format_timestamp(seconds: float) -> str:
    """Formats seconds into MM:SS or HH:MM:SS string."""
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def extract_key_moments(segments: List[Dict[str, Any]], duration_seconds: float = 0) -> List[Dict[str, Any]]:
    """
    Extracts semantic key moments, chapter milestones, and topic transition points based on actual video content.
    """
    if not segments:
        return [
            {
                "timestamp": "00:00",
                "start_seconds": 0.0,
                "title": "Video Introduction",
                "description": "Initial presentation and introduction.",
            }
        ]

    # Combine full transcript timeline for semantic LLM analysis
    transcript_with_timestamps = ""
    for seg in segments:
        ts = format_timestamp(seg.get("start", 0))
        transcript_with_timestamps += f"[{ts}] {seg.get('text', '')}\n"

    # Preserve full timeline distribution if transcript is very long
    if len(transcript_with_timestamps) > 7500:
        stride = len(segments) / 70
        sampled_segs = [segments[int(i * stride)] for i in range(70)]
        transcript_with_timestamps = "".join([f"[{format_timestamp(s.get('start',0))}] {s.get('text','')}\n" for s in sampled_segs])

    groq_key = settings.groq_api_key
    openai_key = settings.openai_api_key

    candidates = []
    if groq_key and groq_key.strip() and not groq_key.startswith("your_"):
        candidates.extend([
            ("https://api.groq.com/openai/v1/chat/completions", "openai/gpt-oss-120b", groq_key),
            ("https://api.groq.com/openai/v1/chat/completions", "qwen/qwen3.8-27b", groq_key),
            ("https://api.groq.com/openai/v1/chat/completions", "openai/gpt-oss-20b", groq_key),
            ("https://api.groq.com/openai/v1/chat/completions", "qwen/qwen3.6-27b", groq_key),
            ("https://api.groq.com/openai/v1/chat/completions", "llama-3.3-70b-versatile", groq_key),
            ("https://api.groq.com/openai/v1/chat/completions", "llama-3.1-8b-instant", groq_key),
        ])
    if openai_key and openai_key.strip() and not openai_key.startswith("your_"):
        candidates.append(("https://api.openai.com/v1/chat/completions", "gpt-4o-mini", openai_key))

    if candidates and len(transcript_with_timestamps) > 15:
        system_prompt = (
            "You are ClipMind AI, an intelligent video chapter and highlight extractor. "
            "Analyze the timestamped transcript from beginning to end and identify all distinct semantic topic transitions, concept definitions, major explanations, demonstrations, and milestone moments. "
            "Base every key moment on actual subject shifts in what the speaker is discussing (not on arbitrary time intervals). "
            "Return a JSON object with key 'key_moments' containing an array of objects. "
            "Each object MUST have:\n"
            "- 'timestamp': string in format MM:SS or HH:MM:SS\n"
            "- 'start_seconds': numeric start second float\n"
            "- 'title': concise, descriptive topic title (3-6 words) representing the concept or section\n"
            "- 'description': 1-2 sentence informative explanation of the concept discussed\n"
            "Return ONLY valid JSON."
        )

        payload_dict = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Video Transcript Timeline:\n{transcript_with_timestamps}"},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        for api_url, model_name, api_key in candidates:
            try:
                logger.info(f"Calling Cloud AI ({api_url}) with model '{model_name}' for Semantic Key Moments extraction...")
                current_payload = dict(payload_dict)
                current_payload["model"] = model_name

                req = urllib.request.Request(
                    api_url,
                    data=json.dumps(current_payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    },
                    method="POST"
                )

                with urllib.request.urlopen(req, timeout=35) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        content = data["choices"][0]["message"]["content"]
                        parsed = json.loads(content)
                        
                        raw_moments = []
                        if isinstance(parsed, list):
                            raw_moments = parsed
                        elif isinstance(parsed, dict):
                            raw_moments = (
                                parsed.get("key_moments")
                                or parsed.get("keyMoments")
                                or parsed.get("moments")
                                or parsed.get("chapters")
                                or parsed.get("highlights")
                                or []
                            )

                        valid_moments = []
                        for m in raw_moments:
                            if isinstance(m, dict) and (m.get("title") or m.get("description")):
                                ts = str(m.get("timestamp") or "00:00")
                                start_sec = m.get("start_seconds")
                                if start_sec is None:
                                    parts = [int(p) for p in ts.split(":") if p.isdigit()]
                                    if len(parts) == 2:
                                        start_sec = parts[0] * 60 + parts[1]
                                    elif len(parts) == 3:
                                        start_sec = parts[0] * 3600 + parts[1] * 60 + parts[2]
                                    else:
                                        start_sec = 0.0
                                valid_moments.append({
                                    "timestamp": ts,
                                    "start_seconds": float(start_sec),
                                    "title": str(m.get("title") or "Key Highlight").strip(),
                                    "description": str(m.get("description") or "").strip(),
                                })

                        if len(valid_moments) >= 2:
                            logger.info(f"Successfully extracted {len(valid_moments)} semantic key moments using '{model_name}'!")
                            return valid_moments
            except Exception as e:
                logger.warning(f"Key moments extraction with model '{model_name}' failed: {e}")

    # Fallback: Semantic Topic Shift Detector
    logger.info("Detecting semantic topic transitions from transcript...")
    key_moments = []
    transition_markers = (
        "first", "second", "third", "next", "now let's", "important", "definition",
        "component", "finally", "for example", "understanding", "in conclusion",
        "let's look at", "we will discuss", "to begin with", "here we have", "another",
        "step", "feature", "summary", "overview"
    )

    for idx, seg in enumerate(segments):
        start_sec = float(seg.get("start", 0.0))
        text_snippet = seg.get("text", "").strip()
        lower_text = text_snippet.lower()
        
        is_transition = any(lower_text.startswith(m) or f" {m} " in lower_text for m in transition_markers)
        
        last_sec = key_moments[-1]["start_seconds"] if key_moments else -999.0
        if (is_transition or idx == 0) and (start_sec - last_sec >= 30.0):
            words = [w for w in text_snippet.split() if len(w) > 2]
            dynamic_title = " ".join(words[:4]).title() if len(words) >= 3 else f"Topic Transition {len(key_moments) + 1}"
            
            key_moments.append({
                "timestamp": format_timestamp(start_sec),
                "start_seconds": start_sec,
                "title": dynamic_title,
                "description": text_snippet if len(text_snippet) < 160 else text_snippet[:157] + "...",
            })

    if len(key_moments) < 3 and len(segments) >= 3:
        key_moments = []
        stride = max(1, len(segments) // 5)
        for i in range(0, len(segments), stride):
            s = segments[i]
            s_sec = float(s.get("start", 0.0))
            words = [w for w in s.get("text", "").split() if len(w) > 2]
            key_moments.append({
                "timestamp": format_timestamp(s_sec),
                "start_seconds": s_sec,
                "title": " ".join(words[:4]).title() if len(words) >= 3 else f"Section {len(key_moments) + 1}",
                "description": s.get("text", "")[:150],
            })

    return key_moments
