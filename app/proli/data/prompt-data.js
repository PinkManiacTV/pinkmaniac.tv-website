window.PL_FORMATS = [
  {
    "id": "task-brief-format",
    "title": "Task brief format",
    "description": "Define a clear assignment before the AI starts. Fill in the brackets.",
    "category": "Writing",
    "body": "# Task brief\n\n## Goal\n[What should the final output achieve?]\n\n## Audience\n[Who will read or use this?]\n\n## Tone\n[e.g. professional, direct, friendly]\n\n## Language\n[e.g. English, Dutch]\n\n## Length\n[e.g. max 500 words, one page]\n\n## Must include\n- [Required point 1]\n- [Required point 2]\n\n## Must avoid\n- [e.g. jargon, filler, unsupported claims]\n\n## Deliverable\n[Describe the exact output format: email, report, list, etc.]"
  },
  {
    "id": "output-refinement-format",
    "title": "Output refinement format",
    "description": "Paste AI output and specify what to improve in the next version.",
    "category": "Writing",
    "body": "# Output refinement\n\nReview the text below and produce an improved version.\n\n## What works\n- [Keep this aspect]\n\n## What to change\n- [Specific issue 1]\n- [Specific issue 2]\n\n## Rules for the revision\n- Keep the core message and facts.\n- Do not add new information unless I ask for it.\n- Apply the same language as the original.\n\n## Text to revise\n[PASTE THE AI OUTPUT HERE]"
  },
  {
    "id": "expert-role-format",
    "title": "Expert role format",
    "description": "Set a clear role, task, and boundaries before the AI responds.",
    "category": "Prompting",
    "body": "# Role and task\n\n## Role\nYou are [ROLE: e.g. an experienced copywriter, a patient teacher, a critical editor].\n\n## Task\n[Describe exactly what you want done.]\n\n## Context\n[Relevant background the AI needs to know.]\n\n## Output format\n[How the answer should be structured: bullets, paragraphs, steps, etc.]\n\n## Boundaries\n- Do not [constraint 1].\n- Always [requirement 1].\n- If information is missing, ask before assuming."
  }
];

window.PL_PROMPTS = [
  {
    "id": "context-gathering-step-1",
    "title": "Context gathering, step 1",
    "description": "Part 1 of 2. AI asks 10 questions first. Use with step 2 after you answer.",
    "category": "Context gathering",
    "body": "# Instruction for context gathering\n\nBefore you generate the final output, complete the following steps:\n\n## 1. Ask targeted questions\n- Ask exactly 10 focused questions to better understand the assignment context.\n- Focus on information essential for a better result (audience, core goal, tone, background information, or specific constraints).\n\n## 2. Format of the questions\n- Present the questions as a numbered list (1 through 10).\n\n## 3. Wait for answers\n- Do not generate the final output after asking the questions.\n- End your message and explicitly wait for my answers. Only continue with the actual task after I have answered."
  },
  {
    "id": "context-gathering-step-2",
    "title": "Context gathering, step 2",
    "description": "Part 2 of 2. Paste your step 1 answers, then AI asks 3 to 5 follow-up questions.",
    "category": "Context gathering",
    "body": "# Instruction for deepening context gathering\n\nHere are my answers. Before you generate the final output, complete the following steps:\n\n## 1. Ask deepening questions\n- Analyze the answers I just provided.\n- Based on this new information, ask 3 to 5 targeted follow-up questions to sharpen the context further.\n- Focus on specific details, removing assumptions, or gaps that still block a perfect result.\n\n## 2. Format of the questions\n- Present the follow-up questions as a numbered list.\n\n## 3. Wait for answers\n- Do not generate the final output after asking these questions.\n- End your message and explicitly wait for my answers. Only continue with the actual task after I have answered the follow-up questions as well."
  },
  {
    "id": "writing-and-formatting-rules",
    "title": "Writing and formatting rules",
    "description": "Strict style rules for all generated text. Attach to any writing task.",
    "category": "Writing",
    "body": "# Writing and formatting instructions\n\nFollow the rules below strictly when generating all text:\n\n## 1. Headings (sentence case)\n- In titles and subheadings, capitalize only the first word.\n- Wrong: \"Plan Van Aanpak Komend Seizoen\"\n- Correct: \"Plan van aanpak komend seizoen\"\n\n## 2. Exception: abbreviations\n- Write common and well-known abbreviations entirely in capital letters.\n- Common examples: ICT, AI, ELO, AVG, DG (Digital Literacy).\n- Note: this rule overrides the heading rule. Abbreviations always keep their capitals, even inside titles.\n- Example: \"New guidelines for DG and the ELO\"\n\n## 3. Use of \"and\" (no ampersand)\n- Always use the full word \"and\".\n- Never use the character \"&\".\n\n## 4. No emojis or em dashes\n- Do not use emojis or emoticons in the output.\n- Never use em dashes (—). Use a comma, period, or rephrase the sentence instead."
  },
  {
    "id": "assumption-check",
    "title": "Assumption check",
    "description": "Lightweight alternative to full context gathering. Surface hidden assumptions before the AI starts.",
    "category": "Prompting",
    "body": "Before you answer or produce any output, complete this step only:\n\n## 1. List your assumptions\n- State exactly 5 assumptions you are making about this task.\n- Include assumptions about audience, goal, tone, context, and constraints.\n\n## 2. Flag uncertainty\n- Mark each assumption as \"likely correct\" or \"uncertain\".\n\n## 3. Wait for confirmation\n- Do not continue with the task yet.\n- Ask me to confirm, correct, or reject each assumption.\n- Only proceed after I respond.\n\nTask:\n[PASTE YOUR TASK HERE]"
  },
  {
    "id": "feedback-without-rewrite",
    "title": "Feedback without rewrite",
    "description": "Get structured critique first, with no rewritten text. Pairs well with the output refinement format.",
    "category": "Writing",
    "body": "Review the text below and give feedback only. Do not rewrite the text.\n\nStructure your response as follows:\n\n## What works well\n- [2 to 4 specific points]\n\n## What needs improvement\n- [2 to 4 specific points, with clear reasons]\n\n## Suggested changes\n- [Concrete suggestions, but do not apply them yet]\n\n## Open questions\n- [Anything unclear that affects quality]\n\nRules:\n- Be direct and specific.\n- Do not produce a revised version of the text.\n- Wait for my response before rewriting anything.\n\nText:\n[PASTE YOUR TEXT HERE]"
  },
  {
    "id": "plain-language-summary",
    "title": "Plain language summary",
    "description": "Turn long or complex input into a short, readable summary for any audience.",
    "category": "Writing",
    "body": "Summarize the text below in plain language.\n\n## Audience\n[Who should understand this summary? e.g. colleagues, parents, general public]\n\n## Rules\n- Maximum 7 bullet points.\n- Each bullet: one clear idea, max 20 words.\n- No jargon unless the audience expects it.\n- Do not add new information.\n- Use the same language as the input unless I specify otherwise.\n\n## Optional closing line\n- One sentence: what the reader should remember or do next.\n\nText:\n[PASTE YOUR TEXT HERE]"
  }
];
