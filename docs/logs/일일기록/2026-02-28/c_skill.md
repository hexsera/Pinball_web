---
name: skill-creator
description: Create or update AgentSkills. Use when designing, structuring, or packaging skills with scripts, references, and assets.
---

> **[한글 번역]** YAML 프론트매터 (Frontmatter)
>
> - `name: skill-creator` → 이름: 스킬 생성기
> - `description:` → 설명: AgentSkill을 생성하거나 업데이트합니다. 스크립트, 참조 문서, 에셋을 포함하는 스킬을 설계, 구조화, 패키징할 때 사용하세요.
>
> **[의도 분석]**
> 이 YAML 프론트매터는 AI가 **"이 스킬을 언제 사용해야 하는지"** 판단하는 유일한 단서입니다.
> AI는 사용자가 대화 중에 "스킬을 만들어줘", "스킬을 수정해줘" 같은 말을 하면, 이 `description`을 읽고 이 스킬을 활성화할지 결정합니다.
> 쉽게 말해, **스킬의 "이름표"이자 "사용 설명서 표지"** 역할을 합니다.
> 프론트매터 아래의 본문(Body)은 스킬이 활성화된 **이후에만** 로딩되므로, 트리거 조건은 반드시 여기에 써야 합니다.

# Skill Creator

This skill provides guidance for creating effective skills.

> **[한글 번역]** 스킬 생성기
>
> 이 스킬은 효과적인 스킬을 만들기 위한 가이드를 제공합니다.
>
> **[의도 분석]**
> 이 문서 자체가 하나의 "메타 스킬(스킬을 만드는 스킬)"입니다.
> OpenClaw 프로젝트([FILE_README.md](FILE_README.md) 참고: `skills/skill-creator/`)에는 54개의 커뮤니티 스킬이 있는데, 이 문서는 그런 스킬들을 **새로 만들거나 개선할 때** AI가 따라야 할 절차를 정리한 것입니다.

## About Skills

Skills are modular, self-contained packages that extend Codex's capabilities by providing
specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific
domains or tasks—they transform Codex from a general-purpose agent into a specialized agent
equipped with procedural knowledge that no model can fully possess.

### What Skills Provide

1. Specialized workflows - Multi-step procedures for specific domains
2. Tool integrations - Instructions for working with specific file formats or APIs
3. Domain expertise - Company-specific knowledge, schemas, business logic
4. Bundled resources - Scripts, references, and assets for complex and repetitive tasks

> **[한글 번역]** 스킬이란?
>
> 스킬은 Codex(AI 에이전트)의 능력을 확장하는 **모듈화된, 독립적인 패키지**입니다.
> 특정 분야나 작업을 위한 전문 지식, 워크플로우, 도구를 제공합니다.
> 스킬을 "온보딩 가이드(신입사원 교육 매뉴얼)"라고 생각하면 됩니다.
> 스킬은 범용 AI를 **특정 분야의 전문가 AI**로 변환시켜 줍니다.
>
> ### 스킬이 제공하는 것
>
> 1. **전문화된 워크플로우** - 특정 분야의 다단계 절차
> 2. **도구 통합** - 특정 파일 형식이나 API 작업 지침
> 3. **도메인 전문지식** - 회사 고유의 지식, 스키마, 비즈니스 로직
> 4. **번들 리소스** - 복잡하고 반복적인 작업을 위한 스크립트, 참조 문서, 에셋
>
> **[의도 분석]**
> 이 섹션이 필요한 이유는 "스킬"이라는 개념을 명확히 정의하기 위해서입니다.
>
> AI는 원래 "범용(general-purpose)"입니다. 뭐든 어느 정도 할 수 있지만, 특정 회사의 DB 스키마나 특정 API 사용법 같은 **"절차적 지식(procedural knowledge)"**은 학습 데이터에 없습니다.
>
> 예를 들어:
> - "우리 회사 BigQuery에서 매출 데이터 뽑아줘" → AI가 테이블 구조를 모름
> - "이 PDF를 90도 회전시켜줘" → 매번 같은 코드를 새로 작성해야 함
>
> 스킬은 이런 **반복적이고 전문적인 지식을 미리 패키징**해두는 것입니다.
> OpenClaw 프로젝트에서는 이미 `skills/` 폴더에 54개의 스킬이 있습니다 ([FILE_README.md](FILE_README.md) 참고).

## Core Principles

### Concise is Key

The context window is a public good. Skills share the context window with everything else Codex needs: system prompt, conversation history, other Skills' metadata, and the actual user request.

**Default assumption: Codex is already very smart.** Only add context Codex doesn't already have. Challenge each piece of information: "Does Codex really need this explanation?" and "Does this paragraph justify its token cost?"

Prefer concise examples over verbose explanations.

### Set Appropriate Degrees of Freedom

Match the level of specificity to the task's fragility and variability:

**High freedom (text-based instructions)**: Use when multiple approaches are valid, decisions depend on context, or heuristics guide the approach.

**Medium freedom (pseudocode or scripts with parameters)**: Use when a preferred pattern exists, some variation is acceptable, or configuration affects behavior.

**Low freedom (specific scripts, few parameters)**: Use when operations are fragile and error-prone, consistency is critical, or a specific sequence must be followed.

Think of Codex as exploring a path: a narrow bridge with cliffs needs specific guardrails (low freedom), while an open field allows many routes (high freedom).

> **[한글 번역]** 핵심 원칙
>
> ### 간결함이 핵심이다
>
> 컨텍스트 윈도우는 공공재입니다. 스킬은 Codex가 필요로 하는 다른 모든 것과 컨텍스트 윈도우를 공유합니다: 시스템 프롬프트, 대화 기록, 다른 스킬의 메타데이터, 그리고 실제 사용자 요청.
>
> **기본 가정: Codex는 이미 매우 똑똑합니다.** Codex가 아직 모르는 정보만 추가하세요. 각 정보에 대해 스스로 물어보세요: "Codex가 정말 이 설명이 필요한가?" 그리고 "이 문단이 토큰 비용만큼의 가치가 있는가?"
>
> 장황한 설명보다 간결한 예시를 선호하세요.
>
> ### 적절한 자유도를 설정하라
>
> 작업의 깨지기 쉬운 정도와 변동성에 맞춰 구체성 수준을 맞추세요:
>
> - **높은 자유도 (텍스트 기반 지침)**: 여러 접근 방식이 유효하거나, 결정이 상황에 따라 달라지거나, 경험칙이 접근법을 안내할 때 사용
> - **중간 자유도 (의사코드 또는 매개변수가 있는 스크립트)**: 선호하는 패턴이 존재하고, 약간의 변형이 허용되거나, 설정이 동작에 영향을 줄 때 사용
> - **낮은 자유도 (구체적 스크립트, 적은 매개변수)**: 작업이 깨지기 쉽고 오류가 발생하기 쉽거나, 일관성이 중요하거나, 특정 순서를 따라야 할 때 사용
>
> Codex를 길을 탐험하는 사람이라고 생각하세요: 절벽이 있는 좁은 다리에는 구체적인 난간이 필요하고(낮은 자유도), 탁 트인 들판에서는 여러 경로가 가능합니다(높은 자유도).
>
> **[의도 분석]**
>
> **"간결함이 핵심이다"가 필요한 이유:**
> AI 모델에는 **"컨텍스트 윈도우(context window)"**라는 한계가 있습니다. 이것은 AI가 한 번에 읽고 기억할 수 있는 텍스트의 최대 크기입니다. 스킬 내용이 너무 길면 대화 기록이나 사용자 질문이 들어갈 공간이 줄어듭니다. 마치 **"책상 위 공간이 한정되어 있으니 필요한 것만 올려놓자"**라는 말과 같습니다.
>
> 예: "Python에서 리스트를 정렬하려면 sort()를 쓴다"는 AI가 이미 아는 내용이므로 스킬에 쓸 필요가 없습니다. 하지만 "우리 회사 DB에서 매출 테이블의 컬럼 이름은 revenue_q1, revenue_q2..."는 AI가 모르는 정보이므로 스킬에 포함해야 합니다.
>
> **"적절한 자유도"가 필요한 이유:**
> 모든 작업이 같은 수준의 엄격함을 필요로 하지 않습니다.
> - **데이터베이스 마이그레이션**처럼 순서가 중요한 작업 → 낮은 자유도 (구체적인 스크립트 제공)
> - **블로그 글 작성**처럼 창의성이 필요한 작업 → 높은 자유도 (대략적인 지침만 제공)
>
> 이 원칙은 스킬 작성자가 **"얼마나 상세하게 써야 하는가?"**를 판단하는 기준을 제공합니다.

### Anatomy of a Skill

Every skill consists of a required SKILL.md file and optional bundled resources:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation intended to be loaded into context as needed
    └── assets/           - Files used in output (templates, icons, fonts, etc.)
```

#### SKILL.md (required)

Every SKILL.md consists of:

- **Frontmatter** (YAML): Contains `name` and `description` fields. These are the only fields that Codex reads to determine when the skill gets used, thus it is very important to be clear and comprehensive in describing what the skill is, and when it should be used.
- **Body** (Markdown): Instructions and guidance for using the skill. Only loaded AFTER the skill triggers (if at all).

#### Bundled Resources (optional)

##### Scripts (`scripts/`)

Executable code (Python/Bash/etc.) for tasks that require deterministic reliability or are repeatedly rewritten.

- **When to include**: When the same code is being rewritten repeatedly or deterministic reliability is needed
- **Example**: `scripts/rotate_pdf.py` for PDF rotation tasks
- **Benefits**: Token efficient, deterministic, may be executed without loading into context
- **Note**: Scripts may still need to be read by Codex for patching or environment-specific adjustments

##### References (`references/`)

Documentation and reference material intended to be loaded as needed into context to inform Codex's process and thinking.

- **When to include**: For documentation that Codex should reference while working
- **Examples**: `references/finance.md` for financial schemas, `references/mnda.md` for company NDA template, `references/policies.md` for company policies, `references/api_docs.md` for API specifications
- **Use cases**: Database schemas, API documentation, domain knowledge, company policies, detailed workflow guides
- **Benefits**: Keeps SKILL.md lean, loaded only when Codex determines it's needed
- **Best practice**: If files are large (>10k words), include grep search patterns in SKILL.md
- **Avoid duplication**: Information should live in either SKILL.md or references files, not both. Prefer references files for detailed information unless it's truly core to the skill—this keeps SKILL.md lean while making information discoverable without hogging the context window. Keep only essential procedural instructions and workflow guidance in SKILL.md; move detailed reference material, schemas, and examples to references files.

##### Assets (`assets/`)

Files not intended to be loaded into context, but rather used within the output Codex produces.

- **When to include**: When the skill needs files that will be used in the final output
- **Examples**: `assets/logo.png` for brand assets, `assets/slides.pptx` for PowerPoint templates, `assets/frontend-template/` for HTML/React boilerplate, `assets/font.ttf` for typography
- **Use cases**: Templates, images, icons, boilerplate code, fonts, sample documents that get copied or modified
- **Benefits**: Separates output resources from documentation, enables Codex to use files without loading them into context

#### What to Not Include in a Skill

A skill should only contain essential files that directly support its functionality. Do NOT create extraneous documentation or auxiliary files, including:

- README.md
- INSTALLATION_GUIDE.md
- QUICK_REFERENCE.md
- CHANGELOG.md
- etc.

The skill should only contain the information needed for an AI agent to do the job at hand. It should not contain auxiliary context about the process that went into creating it, setup and testing procedures, user-facing documentation, etc. Creating additional documentation files just adds clutter and confusion.

> **[한글 번역]** 스킬의 구조
>
> 모든 스킬은 **필수 SKILL.md 파일**과 **선택적 번들 리소스**로 구성됩니다.
>
> ```
> skill-name/               (스킬 이름 폴더)
> ├── SKILL.md (필수)        ← AI가 읽는 메인 설명서
> │   ├── YAML 프론트매터 메타데이터 (필수)
> │   │   ├── name: (필수)   ← 스킬 이름
> │   │   └── description: (필수) ← 스킬 설명 (트리거 조건)
> │   └── 마크다운 본문 지침 (필수) ← 실제 사용법
> └── 번들 리소스 (선택)
>     ├── scripts/           ← 실행 가능한 코드 (Python/Bash 등)
>     ├── references/        ← 필요할 때 불러오는 참조 문서
>     └── assets/            ← 출력에 사용되는 파일 (템플릿, 아이콘, 폰트 등)
> ```
>
> #### SKILL.md (필수)
>
> - **프론트매터** (YAML): `name`과 `description` 필드를 포함. Codex가 스킬을 사용할지 판단하기 위해 읽는 **유일한** 필드이므로, 스킬이 무엇이고 언제 사용해야 하는지 명확하고 포괄적으로 설명하는 것이 매우 중요합니다.
> - **본문** (마크다운): 스킬 사용 지침과 가이드. 스킬이 트리거된 **이후에만** 로딩됩니다.
>
> #### 번들 리소스 (선택)
>
> ##### 스크립트 (`scripts/`)
> 결정론적 신뢰성이 필요하거나 반복적으로 다시 작성되는 작업을 위한 실행 가능 코드.
> - **포함 시기**: 같은 코드가 반복적으로 다시 작성되거나 결정론적 신뢰성이 필요할 때
> - **예시**: PDF 회전 작업을 위한 `scripts/rotate_pdf.py`
> - **장점**: 토큰 효율적, 결정론적, 컨텍스트에 로딩하지 않고 실행 가능
> - **참고**: 패치나 환경별 조정을 위해 Codex가 스크립트를 읽어야 할 수도 있음
>
> ##### 참조 문서 (`references/`)
> 필요할 때 컨텍스트에 로딩하여 Codex의 프로세스와 사고를 알려주는 문서 및 참조 자료.
> - **포함 시기**: Codex가 작업 중 참조해야 할 문서가 있을 때
> - **예시**: 금융 스키마용 `references/finance.md`, NDA 템플릿용 `references/mnda.md` 등
> - **활용**: DB 스키마, API 문서, 도메인 지식, 회사 정책, 상세 워크플로우 가이드
> - **장점**: SKILL.md를 가볍게 유지, Codex가 필요하다고 판단할 때만 로딩
> - **모범 사례**: 파일이 크면(1만 단어 초과) SKILL.md에 grep 검색 패턴을 포함
> - **중복 방지**: 정보는 SKILL.md 또는 references 파일 중 한 곳에만 있어야 함
>
> ##### 에셋 (`assets/`)
> 컨텍스트에 로딩되는 것이 아니라, Codex가 생성하는 **출력물에 사용**되는 파일.
> - **포함 시기**: 스킬이 최종 출력에 사용할 파일이 필요할 때
> - **예시**: 브랜드 에셋용 `assets/logo.png`, PPT 템플릿용 `assets/slides.pptx` 등
> - **활용**: 템플릿, 이미지, 아이콘, 보일러플레이트 코드, 폰트, 샘플 문서
>
> #### 스킬에 포함하지 말아야 할 것
> - README.md, INSTALLATION_GUIDE.md, QUICK_REFERENCE.md, CHANGELOG.md 등
> - AI 에이전트가 작업 수행에 필요한 정보만 포함해야 합니다. 스킬을 만든 과정, 설치/테스트 절차, 사용자용 문서 등은 넣지 마세요.
>
> **[의도 분석]**
>
> 이 섹션은 스킬의 **"파일 구조 설계도"**입니다. 왜 이렇게 세분화했을까요?
>
> **핵심 이유: 컨텍스트 윈도우 절약**
>
> AI는 한 번에 읽을 수 있는 텍스트 양에 한계가 있습니다. 모든 정보를 SKILL.md 하나에 몰아넣으면 그 스킬이 활성화될 때마다 엄청난 양의 텍스트가 컨텍스트를 차지합니다.
>
> 그래서 3종류로 나눕니다:
> 1. **scripts/** → AI가 읽지 않고 그냥 **실행**할 수 있음 (컨텍스트 0 소모)
> 2. **references/** → AI가 **필요할 때만** 읽음 (조건부 소모)
> 3. **assets/** → AI가 읽지 않고 출력에 **복사/사용**만 함 (컨텍스트 0 소모)
>
> 예를 들어, OpenClaw의 `skills/nano-pdf/` 스킬([FILE_README.md](FILE_README.md) 참고)은 PDF 처리를 담당합니다. PDF 회전 코드는 매번 같으므로 `scripts/`에 넣고, PDF API 문서는 `references/`에 넣고, PDF 템플릿은 `assets/`에 넣는 식입니다.
>
> **"포함하지 말아야 할 것"을 명시한 이유:**
> AI가 스킬을 만들 때 습관적으로 README.md나 CHANGELOG.md 같은 부수적인 파일을 생성하는 경향이 있습니다. 이런 파일은 사람에게는 유용하지만, AI 에이전트에게는 **혼란만 주는 불필요한 파일**입니다. 이 규칙은 AI가 "쓸데없는 파일을 만들지 마라"고 명확히 제한하는 것입니다.

### Progressive Disclosure Design Principle

Skills use a three-level loading system to manage context efficiently:

1. **Metadata (name + description)** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed by Codex (Unlimited because scripts can be executed without reading into context window)

#### Progressive Disclosure Patterns

Keep SKILL.md body to the essentials and under 500 lines to minimize context bloat. Split content into separate files when approaching this limit. When splitting out content into other files, it is very important to reference them from SKILL.md and describe clearly when to read them, to ensure the reader of the skill knows they exist and when to use them.

**Key principle:** When a skill supports multiple variations, frameworks, or options, keep only the core workflow and selection guidance in SKILL.md. Move variant-specific details (patterns, examples, configuration) into separate reference files.

**Pattern 1: High-level guide with references**

```markdown
# PDF Processing

## Quick start

Extract text with pdfplumber:
[code example]

## Advanced features

- **Form filling**: See [FORMS.md](FORMS.md) for complete guide
- **API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
- **Examples**: See [EXAMPLES.md](EXAMPLES.md) for common patterns
```

Codex loads FORMS.md, REFERENCE.md, or EXAMPLES.md only when needed.

**Pattern 2: Domain-specific organization**

For Skills with multiple domains, organize content by domain to avoid loading irrelevant context:

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md (revenue, billing metrics)
    ├── sales.md (opportunities, pipeline)
    ├── product.md (API usage, features)
    └── marketing.md (campaigns, attribution)
```

When a user asks about sales metrics, Codex only reads sales.md.

Similarly, for skills supporting multiple frameworks or variants, organize by variant:

```
cloud-deploy/
├── SKILL.md (workflow + provider selection)
└── references/
    ├── aws.md (AWS deployment patterns)
    ├── gcp.md (GCP deployment patterns)
    └── azure.md (Azure deployment patterns)
```

When the user chooses AWS, Codex only reads aws.md.

**Pattern 3: Conditional details**

Show basic content, link to advanced content:

```markdown
# DOCX Processing

## Creating documents

Use docx-js for new documents. See [DOCX-JS.md](DOCX-JS.md).

## Editing documents

For simple edits, modify the XML directly.

**For tracked changes**: See [REDLINING.md](REDLINING.md)
**For OOXML details**: See [OOXML.md](OOXML.md)
```

Codex reads REDLINING.md or OOXML.md only when the user needs those features.

**Important guidelines:**

- **Avoid deeply nested references** - Keep references one level deep from SKILL.md. All reference files should link directly from SKILL.md.
- **Structure longer reference files** - For files longer than 100 lines, include a table of contents at the top so Codex can see the full scope when previewing.

> **[한글 번역]** 점진적 공개 설계 원칙
>
> 스킬은 컨텍스트를 효율적으로 관리하기 위해 **3단계 로딩 시스템**을 사용합니다:
>
> 1. **메타데이터 (이름 + 설명)** - 항상 컨텍스트에 존재 (약 100단어)
> 2. **SKILL.md 본문** - 스킬이 트리거될 때 로딩 (5천 단어 미만)
> 3. **번들 리소스** - Codex가 필요할 때 로딩 (스크립트는 컨텍스트에 읽지 않고 실행 가능하므로 무제한)
>
> #### 점진적 공개 패턴
>
> SKILL.md 본문은 핵심만 유지하고 500줄 이하로 유지하여 컨텍스트 비대화를 최소화하세요. 이 한도에 가까워지면 내용을 별도 파일로 분리하세요. 분리할 때는 반드시 SKILL.md에서 참조하고 언제 읽어야 하는지 명확히 설명하세요.
>
> **핵심 원칙:** 스킬이 여러 변형, 프레임워크, 옵션을 지원할 때, SKILL.md에는 핵심 워크플로우와 선택 안내만 유지하세요. 변형별 상세 내용은 별도 참조 파일로 이동하세요.
>
> **패턴 1: 상위 수준 가이드 + 참조 파일**
> → 기본적인 빠른 시작 가이드만 SKILL.md에 두고, 고급 기능은 별도 파일로 분리
>
> **패턴 2: 도메인별 구성**
> → BigQuery 스킬이라면, finance.md / sales.md / product.md로 분리하여 사용자가 "매출 지표"를 물어볼 때 sales.md만 로딩
>
> **패턴 3: 조건부 상세 정보**
> → 기본 내용을 보여주고, 고급 내용은 링크로 안내 (REDLINING.md, OOXML.md 등)
>
> **중요 지침:**
> - 참조 파일은 SKILL.md에서 **한 단계 깊이**까지만 유지 (깊은 중첩 금지)
> - 100줄 이상의 참조 파일은 상단에 **목차**를 포함
>
> **[의도 분석]**
>
> 이 섹션은 이 문서에서 가장 중요한 설계 원칙 중 하나입니다.
>
> **"점진적 공개(Progressive Disclosure)"란?**
> 정보를 한꺼번에 다 보여주지 않고, **필요한 시점에 필요한 만큼만** 보여주는 설계 방식입니다.
>
> 웹사이트의 "더보기" 버튼을 생각하면 됩니다. 처음에는 요약만 보여주고, 관심 있으면 클릭해서 더 읽는 방식이죠.
>
> AI 스킬에서도 같은 원리입니다:
> - **1단계**: AI에게 "이런 스킬이 있어" 정도만 알려줌 (메타데이터, 약 100단어)
> - **2단계**: 사용자가 관련 질문을 하면 "이 스킬을 이렇게 써" 라는 본문을 로딩 (5천 단어 미만)
> - **3단계**: 실제로 작업하면서 필요한 구체적 참조 문서만 추가 로딩
>
> **왜 이렇게 해야 하나요?**
> OpenClaw에는 54개의 스킬이 있습니다([FILE_README.md](FILE_README.md) 참고). 만약 54개 스킬의 모든 내용이 한꺼번에 AI의 컨텍스트에 로딩되면, AI가 실제 사용자 대화를 처리할 공간이 없어집니다. 점진적 공개는 이 **"공간 부족 문제"를 해결**하는 핵심 전략입니다.
>
> **3가지 패턴의 실용적 의미:**
> - **패턴 1**: "일단 기본만 보여주고, 상세 내용은 따로 파일로" → 가장 기본적인 분리 방법
> - **패턴 2**: "분야별로 파일을 나눠서, 해당 분야만 로딩" → 여러 도메인을 다루는 스킬에 적합
> - **패턴 3**: "기본 기능은 바로 설명, 고급 기능은 링크로" → 초보자/고급자 모두 만족

## Skill Creation Process

Skill creation involves these steps:

1. Understand the skill with concrete examples
2. Plan reusable skill contents (scripts, references, assets)
3. Initialize the skill (run init_skill.py)
4. Edit the skill (implement resources and write SKILL.md)
5. Package the skill (run package_skill.py)
6. Iterate based on real usage

Follow these steps in order, skipping only if there is a clear reason why they are not applicable.

> **[한글 번역]** 스킬 생성 프로세스
>
> 스킬 생성은 다음 단계로 이루어집니다:
>
> 1. 구체적인 예시로 스킬 이해하기
> 2. 재사용 가능한 스킬 내용 계획하기 (scripts, references, assets)
> 3. 스킬 초기화하기 (init_skill.py 실행)
> 4. 스킬 편집하기 (리소스 구현 및 SKILL.md 작성)
> 5. 스킬 패키징하기 (package_skill.py 실행)
> 6. 실제 사용 기반으로 반복 개선하기
>
> 이 단계를 순서대로 따르되, 적용되지 않는 명확한 이유가 있을 때만 건너뛸 수 있습니다.
>
> **[의도 분석]**
> 이것은 스킬 만들기의 **전체 로드맵**입니다. AI가 스킬을 만들 때 "아무렇게나" 만들지 않도록 **정해진 순서**를 강제합니다. 마치 요리 레시피처럼, 재료 준비(이해) → 계획 → 조리(구현) → 포장(패키징) → 맛보기(반복 개선) 순서입니다.

### Skill Naming

- Use lowercase letters, digits, and hyphens only; normalize user-provided titles to hyphen-case (e.g., "Plan Mode" -> `plan-mode`).
- When generating names, generate a name under 64 characters (letters, digits, hyphens).
- Prefer short, verb-led phrases that describe the action.
- Namespace by tool when it improves clarity or triggering (e.g., `gh-address-comments`, `linear-address-issue`).
- Name the skill folder exactly after the skill name.

> **[한글 번역]** 스킬 이름 짓기
>
> - 소문자, 숫자, 하이픈만 사용. 사용자가 제공한 제목은 하이픈 케이스로 변환 (예: "Plan Mode" → `plan-mode`)
> - 이름은 64자 미만으로 생성
> - 동작을 설명하는 짧은 동사 구문 선호
> - 도구별로 네임스페이스 사용 (예: `gh-address-comments`, `linear-address-issue`)
> - 스킬 폴더 이름은 스킬 이름과 정확히 동일하게
>
> **[의도 분석]**
> 이름 규칙이 있는 이유는 **일관성**과 **자동 트리거** 때문입니다. OpenClaw의 `skills/` 폴더를 보면([FILE_README.md](FILE_README.md) 참고) `nano-pdf`, `gh-issues`, `spotify-player` 등 모두 이 규칙을 따릅니다. AI가 사용자의 요청을 보고 적절한 스킬을 자동으로 찾으려면, 이름에 **동사+도구** 조합이 포함되어 있어야 합니다.

### Step 1: Understanding the Skill with Concrete Examples

Skip this step only when the skill's usage patterns are already clearly understood. It remains valuable even when working with an existing skill.

To create an effective skill, clearly understand concrete examples of how the skill will be used. This understanding can come from either direct user examples or generated examples that are validated with user feedback.

For example, when building an image-editor skill, relevant questions include:

- "What functionality should the image-editor skill support? Editing, rotating, anything else?"
- "Can you give some examples of how this skill would be used?"
- "I can imagine users asking for things like 'Remove the red-eye from this image' or 'Rotate this image'. Are there other ways you imagine this skill being used?"
- "What would a user say that should trigger this skill?"

To avoid overwhelming users, avoid asking too many questions in a single message. Start with the most important questions and follow up as needed for better effectiveness.

Conclude this step when there is a clear sense of the functionality the skill should support.

> **[한글 번역]** 1단계: 구체적인 예시로 스킬 이해하기
>
> 스킬의 사용 패턴이 이미 명확히 이해된 경우에만 이 단계를 건너뛰세요. 기존 스킬 작업 시에도 이 단계는 여전히 유용합니다.
>
> 효과적인 스킬을 만들려면, 스킬이 어떻게 사용될지에 대한 구체적인 예시를 명확히 이해해야 합니다. 이 이해는 사용자가 직접 제공한 예시 또는 사용자 피드백으로 검증된 생성 예시에서 올 수 있습니다.
>
> 예를 들어, image-editor 스킬을 만들 때 관련 질문들:
> - "image-editor 스킬이 어떤 기능을 지원해야 하나요? 편집, 회전, 그 외?"
> - "이 스킬이 어떻게 사용될지 예시를 줄 수 있나요?"
> - "사용자가 '이 이미지에서 적목 현상 제거해줘' 또는 '이 이미지 회전시켜줘'라고 요청하는 걸 상상할 수 있는데, 다른 사용 방법도 있나요?"
> - "어떤 말을 했을 때 이 스킬이 트리거되어야 하나요?"
>
> 사용자를 압도하지 않기 위해, 한 메시지에 너무 많은 질문을 하지 마세요.
>
> 스킬이 지원해야 할 기능에 대한 명확한 감이 잡히면 이 단계를 마무리합니다.
>
> **[의도 분석]**
> 이 단계는 **"뭘 만들지 정확히 파악하기"** 단계입니다.
>
> 프로그래밍에서 가장 흔한 실수는 "뭘 만들어야 하는지 정확히 모른 채 코딩을 시작하는 것"입니다. AI도 마찬가지입니다. 이 단계에서 AI는 사용자에게 질문을 해서 **구체적인 사용 시나리오**를 수집합니다.
>
> 핵심은 **"사용자가 뭐라고 말했을 때 이 스킬이 작동해야 하는가?"**를 파악하는 것입니다. 이것이 나중에 `description` 필드(트리거 조건)를 작성하는 기반이 됩니다.

### Step 2: Planning the Reusable Skill Contents

To turn concrete examples into an effective skill, analyze each example by:

1. Considering how to execute on the example from scratch
2. Identifying what scripts, references, and assets would be helpful when executing these workflows repeatedly

Example: When building a `pdf-editor` skill to handle queries like "Help me rotate this PDF," the analysis shows:

1. Rotating a PDF requires re-writing the same code each time
2. A `scripts/rotate_pdf.py` script would be helpful to store in the skill

Example: When designing a `frontend-webapp-builder` skill for queries like "Build me a todo app" or "Build me a dashboard to track my steps," the analysis shows:

1. Writing a frontend webapp requires the same boilerplate HTML/React each time
2. An `assets/hello-world/` template containing the boilerplate HTML/React project files would be helpful to store in the skill

Example: When building a `big-query` skill to handle queries like "How many users have logged in today?" the analysis shows:

1. Querying BigQuery requires re-discovering the table schemas and relationships each time
2. A `references/schema.md` file documenting the table schemas would be helpful to store in the skill

To establish the skill's contents, analyze each concrete example to create a list of the reusable resources to include: scripts, references, and assets.

> **[한글 번역]** 2단계: 재사용 가능한 스킬 내용 계획하기
>
> 구체적인 예시를 효과적인 스킬로 전환하려면, 각 예시를 다음과 같이 분석합니다:
>
> 1. 그 예시를 처음부터 어떻게 실행할지 고려
> 2. 이 워크플로우를 반복 실행할 때 어떤 스크립트, 참조 문서, 에셋이 유용할지 파악
>
> **예시 1 - PDF 편집기 스킬:**
> "이 PDF 회전시켜줘" 같은 요청 처리용
> → PDF 회전은 매번 같은 코드를 다시 쓰게 됨
> → `scripts/rotate_pdf.py` 스크립트를 스킬에 저장하면 유용
>
> **예시 2 - 프론트엔드 웹앱 빌더 스킬:**
> "할 일 앱 만들어줘" 같은 요청 처리용
> → 매번 같은 HTML/React 보일러플레이트가 필요
> → `assets/hello-world/` 템플릿을 스킬에 저장하면 유용
>
> **예시 3 - BigQuery 스킬:**
> "오늘 로그인한 사용자 몇 명이야?" 같은 요청 처리용
> → 매번 테이블 스키마를 다시 찾아야 함
> → `references/schema.md` 파일을 스킬에 저장하면 유용
>
> **[의도 분석]**
> 이 단계는 **"어떤 재료가 필요한지 목록 만들기"** 단계입니다.
>
> 1단계에서 "뭘 만들지" 파악했다면, 2단계에서는 "그걸 만들려면 뭐가 필요하지?"를 분석합니다.
>
> 핵심 질문은: **"이 작업을 10번 반복한다면, 매번 똑같이 반복하는 부분은 뭔가?"**
> - 매번 같은 코드를 쓴다 → **scripts/**에 넣기
> - 매번 같은 문서를 찾아본다 → **references/**에 넣기
> - 매번 같은 템플릿/파일을 복사한다 → **assets/**에 넣기
>
> 이것은 프로그래밍의 **DRY 원칙(Don't Repeat Yourself, 반복하지 마라)**과 같은 개념입니다.

### Step 3: Initializing the Skill

At this point, it is time to actually create the skill.

Skip this step only if the skill being developed already exists, and iteration or packaging is needed. In this case, continue to the next step.

When creating a new skill from scratch, always run the `init_skill.py` script. The script conveniently generates a new template skill directory that automatically includes everything a skill requires, making the skill creation process much more efficient and reliable.

Usage:

```bash
scripts/init_skill.py <skill-name> --path <output-directory> [--resources scripts,references,assets] [--examples]
```

Examples:

```bash
scripts/init_skill.py my-skill --path skills/public
scripts/init_skill.py my-skill --path skills/public --resources scripts,references
scripts/init_skill.py my-skill --path skills/public --resources scripts --examples
```

The script:

- Creates the skill directory at the specified path
- Generates a SKILL.md template with proper frontmatter and TODO placeholders
- Optionally creates resource directories based on `--resources`
- Optionally adds example files when `--examples` is set

After initialization, customize the SKILL.md and add resources as needed. If you used `--examples`, replace or delete placeholder files.

> **[한글 번역]** 3단계: 스킬 초기화하기
>
> 이 시점에서 실제로 스킬을 생성합니다.
>
> 개발 중인 스킬이 이미 존재하고, 반복 개선이나 패키징만 필요한 경우에만 이 단계를 건너뛰세요.
>
> 새 스킬을 처음부터 만들 때는, 항상 `init_skill.py` 스크립트를 실행하세요. 이 스크립트는 스킬에 필요한 모든 것을 자동으로 포함하는 새 템플릿 스킬 디렉토리를 생성합니다.
>
> 사용법:
> ```bash
> scripts/init_skill.py <스킬이름> --path <출력디렉토리> [--resources scripts,references,assets] [--examples]
> ```
>
> 이 스크립트가 하는 일:
> - 지정된 경로에 스킬 디렉토리를 생성
> - 올바른 프론트매터와 TODO 플레이스홀더가 포함된 SKILL.md 템플릿 생성
> - `--resources`에 따라 선택적으로 리소스 디렉토리 생성
> - `--examples` 설정 시 예제 파일 추가
>
> 초기화 후, SKILL.md를 커스터마이즈하고 필요한 리소스를 추가하세요.
>
> **[의도 분석]**
> 이 단계는 **"프로젝트 뼈대 자동 생성"** 단계입니다.
>
> 마치 `npx create-react-app my-app`이 React 프로젝트의 기본 구조를 만들어주듯이, `init_skill.py`는 스킬의 기본 구조를 자동으로 만들어줍니다.
>
> 왜 자동 생성 스크립트를 쓸까요?
> - AI가 폴더 구조를 직접 만들면 실수할 수 있음 (파일 누락, 잘못된 형식 등)
> - 스크립트를 사용하면 **항상 올바른 구조**가 보장됨
> - YAML 프론트매터 형식 같은 규칙을 AI가 기억할 필요 없이 자동 생성

### Step 4: Edit the Skill

When editing the (newly-generated or existing) skill, remember that the skill is being created for another instance of Codex to use. Include information that would be beneficial and non-obvious to Codex. Consider what procedural knowledge, domain-specific details, or reusable assets would help another Codex instance execute these tasks more effectively.

#### Learn Proven Design Patterns

Consult these helpful guides based on your skill's needs:

- **Multi-step processes**: See references/workflows.md for sequential workflows and conditional logic
- **Specific output formats or quality standards**: See references/output-patterns.md for template and example patterns

These files contain established best practices for effective skill design.

#### Start with Reusable Skill Contents

To begin implementation, start with the reusable resources identified above: `scripts/`, `references/`, and `assets/` files. Note that this step may require user input. For example, when implementing a `brand-guidelines` skill, the user may need to provide brand assets or templates to store in `assets/`, or documentation to store in `references/`.

Added scripts must be tested by actually running them to ensure there are no bugs and that the output matches what is expected. If there are many similar scripts, only a representative sample needs to be tested to ensure confidence that they all work while balancing time to completion.

If you used `--examples`, delete any placeholder files that are not needed for the skill. Only create resource directories that are actually required.

#### Update SKILL.md

**Writing Guidelines:** Always use imperative/infinitive form.

##### Frontmatter

Write the YAML frontmatter with `name` and `description`:

- `name`: The skill name
- `description`: This is the primary triggering mechanism for your skill, and helps Codex understand when to use the skill.
  - Include both what the Skill does and specific triggers/contexts for when to use it.
  - Include all "when to use" information here - Not in the body. The body is only loaded after triggering, so "When to Use This Skill" sections in the body are not helpful to Codex.
  - Example description for a `docx` skill: "Comprehensive document creation, editing, and analysis with support for tracked changes, comments, formatting preservation, and text extraction. Use when Codex needs to work with professional documents (.docx files) for: (1) Creating new documents, (2) Modifying or editing content, (3) Working with tracked changes, (4) Adding comments, or any other document tasks"

Do not include any other fields in YAML frontmatter.

##### Body

Write instructions for using the skill and its bundled resources.

> **[한글 번역]** 4단계: 스킬 편집하기
>
> 새로 생성하거나 기존의 스킬을 편집할 때, 이 스킬이 **다른 Codex 인스턴스가 사용하기 위해** 만들어진다는 점을 기억하세요. Codex에게 유용하고 비자명한(non-obvious) 정보를 포함하세요. 다른 Codex 인스턴스가 이 작업을 더 효과적으로 수행하는 데 도움이 될 절차적 지식, 도메인 특화 세부사항, 또는 재사용 가능한 에셋이 무엇인지 고려하세요.
>
> #### 검증된 설계 패턴 학습
> 스킬의 필요에 따라 다음 가이드를 참고하세요:
> - **다단계 프로세스**: references/workflows.md에서 순차 워크플로우와 조건부 로직 확인
> - **특정 출력 형식이나 품질 기준**: references/output-patterns.md에서 템플릿 및 예시 패턴 확인
>
> #### 재사용 가능한 스킬 내용부터 시작
> 위에서 파악한 재사용 리소스(`scripts/`, `references/`, `assets/`)부터 구현을 시작하세요. 이 단계에서 사용자 입력이 필요할 수 있습니다.
>
> 추가한 스크립트는 반드시 **실제 실행하여 테스트**해야 합니다. 유사한 스크립트가 많으면 대표적인 샘플만 테스트해도 됩니다.
>
> #### SKILL.md 업데이트
>
> **작성 지침:** 항상 명령형/부정사형을 사용하세요.
>
> **프론트매터:**
> - `name`: 스킬 이름
> - `description`: 스킬의 **주요 트리거 메커니즘**. 스킬이 무엇을 하는지와 언제 사용해야 하는지를 모두 포함. "사용 시기" 정보는 반드시 여기에 — 본문에는 넣지 마세요 (본문은 트리거 후에만 로딩되므로).
>
> **본문:** 스킬 및 번들 리소스 사용 지침을 작성하세요.
>
> **[의도 분석]**
> 이 단계는 **실제 구현 단계**입니다. 여기서 가장 중요한 포인트는:
>
> **1. "다른 AI를 위해 쓴다"는 관점:**
> 이 스킬의 독자는 사람이 아니라 **또 다른 AI 인스턴스**입니다. 따라서 "사람이라면 당연히 아는 것"이 아니라 "AI가 모를 수 있는 것"을 기준으로 정보를 넣어야 합니다.
>
> **2. description은 "트리거 조건"이다:**
> `description` 필드는 단순한 설명이 아니라, AI가 "이 스킬을 지금 써야 하나?"를 판단하는 **유일한 기준**입니다. 만약 본문에만 "이 스킬은 .docx 파일 작업 시 사용하세요"라고 쓰면, AI는 그걸 볼 수 없습니다 (본문은 트리거 후에만 로딩되니까). 반드시 description에 써야 합니다.
>
> **3. 스크립트 테스트 의무:**
> AI가 만든 스크립트가 실제로 동작하는지 확인하라는 규칙입니다. AI가 코드를 생성할 때 가끔 버그가 있을 수 있으므로, 반드시 실행해서 확인해야 합니다.

### Step 5: Packaging a Skill

Once development of the skill is complete, it must be packaged into a distributable .skill file that gets shared with the user. The packaging process automatically validates the skill first to ensure it meets all requirements:

```bash
scripts/package_skill.py <path/to/skill-folder>
```

Optional output directory specification:

```bash
scripts/package_skill.py <path/to/skill-folder> ./dist
```

The packaging script will:

1. **Validate** the skill automatically, checking:
   - YAML frontmatter format and required fields
   - Skill naming conventions and directory structure
   - Description completeness and quality
   - File organization and resource references

2. **Package** the skill if validation passes, creating a .skill file named after the skill (e.g., `my-skill.skill`) that includes all files and maintains the proper directory structure for distribution. The .skill file is a zip file with a .skill extension.

   Security restriction: symlinks are rejected and packaging fails when any symlink is present.

If validation fails, the script will report the errors and exit without creating a package. Fix any validation errors and run the packaging command again.

> **[한글 번역]** 5단계: 스킬 패키징하기
>
> 스킬 개발이 완료되면, 사용자와 공유할 수 있는 배포용 `.skill` 파일로 패키징해야 합니다. 패키징 프로세스는 자동으로 유효성을 먼저 검증합니다.
>
> ```bash
> scripts/package_skill.py <스킬폴더경로>
> ```
>
> 출력 디렉토리를 지정할 수도 있습니다:
> ```bash
> scripts/package_skill.py <스킬폴더경로> ./dist
> ```
>
> 패키징 스크립트가 하는 일:
>
> 1. **자동 유효성 검증:**
>    - YAML 프론트매터 형식과 필수 필드
>    - 스킬 이름 규칙과 디렉토리 구조
>    - 설명의 완성도와 품질
>    - 파일 구성과 리소스 참조
>
> 2. **검증 통과 시 패키징:** 스킬 이름으로 된 `.skill` 파일 생성 (예: `my-skill.skill`). 모든 파일을 포함하고 올바른 디렉토리 구조를 유지합니다. `.skill` 파일은 `.skill` 확장자를 가진 zip 파일입니다.
>
>    보안 제한: 심볼릭 링크(symlink)가 있으면 패키징이 실패합니다.
>
> 유효성 검증 실패 시, 오류를 보고하고 패키지를 생성하지 않습니다.
>
> **[의도 분석]**
> 이 단계는 **"완성품 포장"** 단계입니다.
>
> `.skill` 파일은 사실 **zip 파일**입니다 (확장자만 .skill로 바꾼 것). 마치 `.apk`가 Android 앱의 압축 파일이듯이, `.skill`은 AI 스킬의 압축 파일입니다.
>
> **유효성 검증을 먼저 하는 이유:**
> 잘못된 형식의 스킬이 배포되면 AI가 제대로 읽지 못합니다. 그래서 패키징 전에 자동으로 "이 스킬이 규칙에 맞게 만들어졌는가?"를 검사합니다. 마치 앱스토어에 앱을 올리기 전에 심사를 받는 것과 비슷합니다.
>
> **심볼릭 링크를 거부하는 이유:**
> 보안 때문입니다. 심볼릭 링크는 다른 파일을 가리키는 "바로가기"인데, 악의적으로 시스템 파일을 가리킬 수 있습니다. 그래서 패키징할 때 심볼릭 링크가 있으면 아예 거부합니다.

### Step 6: Iterate

After testing the skill, users may request improvements. Often this happens right after using the skill, with fresh context of how the skill performed.

**Iteration workflow:**

1. Use the skill on real tasks
2. Notice struggles or inefficiencies
3. Identify how SKILL.md or bundled resources should be updated
4. Implement changes and test again

> **[한글 번역]** 6단계: 반복 개선하기
>
> 스킬을 테스트한 후, 사용자가 개선을 요청할 수 있습니다. 이것은 보통 스킬을 사용한 직후에 발생합니다.
>
> **반복 개선 워크플로우:**
> 1. 실제 작업에 스킬 사용
> 2. 어려움이나 비효율성 발견
> 3. SKILL.md나 번들 리소스를 어떻게 업데이트해야 하는지 파악
> 4. 변경 사항 구현 및 다시 테스트
>
> **[의도 분석]**
> 이 단계는 **"실전 피드백 반영"** 단계입니다.
>
> 소프트웨어 개발에서 "애자일(Agile)" 방법론의 핵심은 **"만들고 → 써보고 → 고치기"**를 반복하는 것입니다. AI 스킬도 마찬가지입니다.
>
> 처음 만든 스킬이 완벽할 수는 없습니다. 실제로 써보면:
> - "이 부분 설명이 부족해서 AI가 헤맸네" → SKILL.md 보완
> - "이 스크립트가 특정 상황에서 오류가 나네" → scripts/ 수정
> - "이 참조 문서에 빠진 정보가 있네" → references/ 추가
>
> 이런 식으로 계속 개선하는 과정이 6단계입니다.

---

> ## 전체 문서 종합 분석
>
> ### 이 문서의 정체
> 이 문서(`c_skill.md`)는 OpenClaw 프로젝트의 `skills/skill-creator/` 스킬에 해당하는 **"스킬을 만드는 스킬"**입니다. ([FILE_README.md](FILE_README.md)의 `skills/skill-creator/` 항목 참고)
>
> ### 전체 흐름 요약
> ```
> [사용자: "새 스킬 만들어줘"]
>       ↓
> AI가 description을 보고 이 스킬을 트리거
>       ↓
> 1단계: 사용자와 대화하며 "뭘 만들지" 파악
> 2단계: "어떤 파일이 필요한지" 분류 (scripts/references/assets)
> 3단계: init_skill.py로 뼈대 생성
> 4단계: 실제 내용 채우기 + SKILL.md 작성
> 5단계: package_skill.py로 .skill 파일 생성
> 6단계: 사용해보고 개선 반복
> ```
>
> ### 핵심 설계 철학
> 1. **컨텍스트 윈도우는 한정된 자원** → 간결하게 써야 함
> 2. **점진적 공개** → 필요한 것만 필요한 때에 로딩
> 3. **반복을 없애라** → 재사용 가능한 리소스를 미리 패키징
> 4. **AI를 위한 문서** → 사람이 아닌 AI가 읽는 문서이므로 AI 관점에서 작성