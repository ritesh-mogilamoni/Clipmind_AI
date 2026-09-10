import logging
import json
import urllib.request
import urllib.error
from typing import Dict, Any, List
from app.core.config import settings

logger = logging.getLogger(__name__)


def _format_short_summary(val: Any) -> str:
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, list):
        return " ".join([str(item).strip() for item in val if str(item).strip()]).strip()
    if isinstance(val, dict):
        return " ".join([str(v).strip() for v in val.values() if str(v).strip()]).strip()
    return str(val).strip()


def _format_detailed_summary(val: Any) -> str:
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, dict):
        sections = []
        for k, v in val.items():
            clean_title = str(k).strip()
            if isinstance(v, list):
                bullet_lines = "\n".join([f"- {str(item).strip()}" for item in v if str(item).strip()])
                sections.append(f"**{clean_title}**:\n{bullet_lines}")
            elif isinstance(v, dict):
                inner_lines = "\n".join([f"- {ik}: {str(iv).strip()}" for ik, iv in v.items()])
                sections.append(f"**{clean_title}**:\n{inner_lines}")
            else:
                sections.append(f"**{clean_title}**:\n{str(v).strip()}")
        return "\n\n".join(sections)
    if isinstance(val, list):
        sections = []
        for item in val:
            if isinstance(item, dict):
                title = item.get("title") or item.get("heading") or item.get("section") or "Topic"
                content = item.get("content") or item.get("description") or item.get("text") or ""
                if isinstance(content, list):
                    content = "\n".join([f"- {str(c).strip()}" for c in content])
                sections.append(f"**{title}**:\n{str(content).strip()}")
            else:
                sections.append(f"- {str(item).strip()}")
        return "\n\n".join(sections)
    return str(val).strip()


def generate_summaries_and_keywords(title: str, transcript_text: str, segments: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generates short summary, detailed summary, and key topics/keywords using Groq API / OpenAI LLM.
    Dynamically generates contextual topic headings derived directly from video subject matter.
    """
    groq_key = settings.groq_api_key
    openai_key = settings.openai_api_key

    # Define candidate cloud LLM endpoints and models
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

    system_prompt = (
        "You are ClipMind AI, an expert video summarization assistant. "
        "Analyze the provided video transcript and title, then produce a JSON response with the following keys:\n"
        "- short_summary: A concise 3-5 sentence executive summary explaining the specific topic, core message, and main focus of the video.\n"
        "- detailed_summary: A well-structured multi-section breakdown with dynamic, content-specific section titles based on the actual subject matter of the video (e.g. for GIS: 'Definition and Core Functions', 'Four Main Components', 'Advantages Over Paper Maps'; for a coding lecture: 'Syntax & Concepts', 'Code Examples'; for a meeting: 'Key Decisions & Action Items'). Structure each section with a clear title followed by descriptive bullet points or paragraphs.\n"
        "- keywords: An array of 5-8 relevant topic keywords or key phrases extracted from the video content.\n"
        "Return ONLY valid JSON."
    )

    clean_transcript = (transcript_text or "").strip()[:8000]
    user_prompt = f"Video Title: {title}\nTranscript:\n{clean_transcript if clean_transcript else title}"

    payload_dict = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
    }

    for api_url, model_name, api_key in candidates:
        try:
            logger.info(f"Calling Cloud LLM API ({api_url}) with model '{model_name}'...")
            current_payload = dict(payload_dict)
            current_payload["model"] = model_name
            current_payload["response_format"] = {"type": "json_object"}
            
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

            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    
                    short_sum = _format_short_summary(parsed.get("short_summary"))
                    detailed_sum = _format_detailed_summary(parsed.get("detailed_summary"))
                    
                    if short_sum and detailed_sum:
                        logger.info(f"Successfully generated dynamic summaries using '{model_name}'!")
                        raw_kw = parsed.get("keywords", [])
                        if isinstance(raw_kw, str):
                            raw_kw = [k.strip() for k in raw_kw.split(",") if k.strip()]
                        cleaned_kw = [str(k).lstrip("#").strip() for k in raw_kw if str(k).strip()]
                        return {
                            "short_summary": short_sum,
                            "detailed_summary": detailed_sum,
                            "keywords": cleaned_kw or [title.strip()],
                        }
        except urllib.error.HTTPError as http_err:
            error_body = ""
            try:
                error_body = http_err.read().decode("utf-8")
            except Exception:
                pass
            logger.warning(f"HTTPError {http_err.code} from LLM model '{model_name}': {error_body}")
        except Exception as e:
            logger.warning(f"LLM model '{model_name}' failed: {e}")

    # Fallback Content-Driven Summarizer Engine (if cloud API is unreachable)
    logger.info("Generating content-driven fallback summary from transcript...")
    clean_title = title.replace("_", " ").replace("-", " ").strip()
    full_text = clean_transcript
    
    # Extract clean sentence topics
    raw_lines = [seg.get("text", "").strip() for seg in segments if seg.get("text", "").strip()]
    if not raw_lines and full_text:
        raw_lines = [s.strip() for s in full_text.replace("\n", ". ").split(". ") if len(s.strip()) > 10]

    fillers = ("here's how", "let's get started", "in this video", "welcome back", "okay so", "sir bye bye", "hello guys", "hi there guys", "welcome to another")
    meaningful_lines = [l for l in raw_lines if not any(l.lower().startswith(f) for f in fillers)]
    if not meaningful_lines:
        meaningful_lines = raw_lines

    stopwords = {
        "this", "that", "with", "from", "have", "your", "they", "will", "what", "about", "there", "would",
        "which", "their", "like", "also", "some", "them", "then", "into", "than", "been", "only", "other",
        "more", "here", "just", "video", "audio", "please", "could", "should", "you", "they", "here's",
        "well", "session", "class", "offline", "1080p", "guys", "buddy", "buddys", "welcome", "another",
        "take", "look", "going", "take", "taking", "sample", "link", "online", "recording"
    }

    from collections import Counter
    words = [w.strip(".,!?:;\"'()[]{}") for w in (clean_title + " " + full_text).split()]
    filtered_words = [w.capitalize() for w in words if len(w) > 3 and w.lower() not in stopwords and w.isalnum()]
    word_counts = Counter(filtered_words)
    top_keywords = [word for word, count in word_counts.most_common(8)]

    if meaningful_lines:
        num_items = len(meaningful_lines)
        chunk1 = meaningful_lines[:max(1, num_items // 3)]
        chunk2 = meaningful_lines[max(1, num_items // 3):max(2, (num_items * 2) // 3)]
        chunk3 = meaningful_lines[max(2, (num_items * 2) // 3):]

        p1_summary = " ".join(chunk1[:2]) if chunk1 else "Key introductory concepts and overview."
        p2_summary = " ".join(chunk2[:2]) if chunk2 else "Detailed explanations and discussion points."
        p3_summary = " ".join(chunk3[:2]) if chunk3 else "Conclusions and practical applications."

        kw_topic = ", ".join(top_keywords[:3]) if top_keywords else "key subject matter"
        short_summary = f"This recording covers '{clean_title}'. It provides an overview of {kw_topic}, examining core concepts, practical applications, and main takeaways."

        h1 = f"{top_keywords[0]} & Overview" if len(top_keywords) >= 1 else "Core Concepts"
        h2 = f"{top_keywords[1]} Analysis" if len(top_keywords) >= 2 else "Detailed Discussion"
        h3 = f"{top_keywords[2]} & Applications" if len(top_keywords) >= 3 else "Key Takeaways"

        detailed_summary = (
            f"**{h1}**:\n{p1_summary}\n\n"
            f"**{h2}**:\n{p2_summary}\n\n"
            f"**{h3}**:\n{p3_summary}"
        )
    else:
        short_summary = f"Summary for '{clean_title}'. The video provides presentation content and analysis."
        detailed_summary = f"**{clean_title} Overview**:\nDetailed breakdown for '{clean_title}'.\n\n**Takeaways**:\nReview timestamped transcript and key moments above."

    return {
        "short_summary": short_summary,
        "detailed_summary": detailed_summary,
        "keywords": top_keywords or [clean_title.capitalize()],
    }
