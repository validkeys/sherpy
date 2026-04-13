---
name: executive-summary
description: Generates an executive summary from planning artifacts for non-technical stakeholders. Auto-discovers business requirements, technical requirements, and timeline from the docs/ folder structure. Outputs a comprehensive summary covering business problem, solution, features, timeline, success metrics, risks, and resources.
---

# Executive Summary

Generates an executive-focused summary document from Sherpy planning artifacts. Provides non-technical stakeholders with a clear understanding of the business problem, solution approach, timeline, and success criteria.

## Usage

```
/executive-summary [project-directory]
```

If no directory is given, use the current working directory.

## Required Artifacts

The skill auto-discovers these files from the standard Sherpy folder structure:

| File | Location | Purpose |
|------|----------|---------|
| `business-requirements.yaml` | `docs/planning/` | Business problem, features, success metrics |
| `technical-requirements.yaml` | `docs/planning/` | Technical context, risks, dependencies |
| `timeline.yaml` | `docs/delivery/` | Delivery timeline and milestones |

## Process

### Step 1: Scan for Required Artifacts

Check the project directory for required files in standard locations. Display status:

```
## Executive Summary — Dependency Check

Scanning for required artifacts...

 ✓  docs/planning/business-requirements.yaml
 ✓  docs/planning/technical-requirements.yaml
 ✓  docs/delivery/timeline.yaml

3 of 3 required files found.
```

**Legend:** ✓ found · ✗ missing

### Step 2: Handle Missing Files

If any required files are missing, ask:

> "Missing required files: timeline.yaml
>
> Options:
> 1. **Continue with partial data** — Generate summary with available information (missing sections will be marked as [Not Available])
> 2. **Exit** — Complete missing artifacts first (run /delivery-timeline to generate timeline.yaml)
>
> What would you like to do?"

Wait for user response:
- If user chooses **1 (Continue)**: Proceed with available data, mark missing sections clearly
- If user chooses **2 (Exit)**: Display which skills to run and exit gracefully

### Step 3: Load and Parse Artifacts

Read all available files and extract:

**From business-requirements.yaml:**
- Project name and description
- Business goals and problem statement
- Target users and personas
- Core features and capabilities
- Success criteria and KPIs
- Scope and constraints

**From technical-requirements.yaml:**
- Solution architecture overview
- Technical risks and dependencies
- External integrations
- Compliance and security requirements
- Resource requirements (team, infrastructure)

**From timeline.yaml (if available):**
- Milestone delivery dates
- Production deploy date
- Total project duration
- QA and review phases

### Step 4: Generate Executive Summary

Create `docs/summaries/executive-summary.md` with this structure:

```markdown
# Executive Summary

*Generated: [timestamp]*
*Project: [project-name]*

---

## Business Problem

[Describe the problem being solved. Extract from business requirements: problem statement, business goals, and why this matters. Focus on business impact, not technical details. 2-3 paragraphs maximum.]

**Current State:** [What's the current situation or pain point]

**Business Impact:** [How this problem affects the business - costs, inefficiencies, missed opportunities]

---

## Solution Overview

[High-level description of the proposed solution. Non-technical language. Explain what we're building and how it addresses the business problem. 2-3 paragraphs.]

**Approach:** [Key aspects of the solution]

**Benefits:** [How this solution improves the current state]

---

## Key Features & Capabilities

[User-facing and business-facing features. Extract from business requirements functional_requirements and features sections. Group logically.]

### [Feature Category 1]
- **[Feature Name]** - [What it enables/provides]
- **[Feature Name]** - [What it enables/provides]

### [Feature Category 2]
- **[Feature Name]** - [What it enables/provides]
- **[Feature Name]** - [What it enables/provides]

[Continue for all major feature groups]

---

## Timeline & Milestones

[Delivery schedule with key milestones. Extract from timeline.yaml if available, otherwise use milestones.yaml estimates.]

**Project Start:** [Start date]
**Production Deploy:** [Target production date]
**Total Duration:** [Weeks/months]

### Key Milestones

| Milestone | Target Date | Key Deliverables |
|-----------|-------------|------------------|
| [M0: Name] | [Date] | [Primary deliverable] |
| [M1: Name] | [Date] | [Primary deliverable] |
| [M2: Name] | [Date] | [Primary deliverable] |
| ... | ... | ... |

### Delivery Phases

- **Development:** [Duration] - [Date range]
- **QA & Testing:** [Duration] - [X rounds, Y days each]
- **Signoff & Deploy:** [Date]

---

## Success Metrics

[How success will be measured. Extract from business requirements success_criteria and measurable_outcomes.]

### Primary Metrics
- **[Metric Name]:** [Target] - [What this measures]
- **[Metric Name]:** [Target] - [What this measures]

### Secondary Metrics
- **[Metric Name]:** [Target] - [What this measures]
- **[Metric Name]:** [Target] - [What this measures]

**Measurement Approach:** [How and when metrics will be evaluated]

---

## Risks & Dependencies

[Key risks and external dependencies that could impact delivery. Extract from technical requirements risks, constraints, and external_dependencies sections.]

### Technical Risks
| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| [Risk description] | [High/Med/Low] | [How we're addressing it] |
| [Risk description] | [High/Med/Low] | [How we're addressing it] |

### External Dependencies
- **[Dependency Name]:** [What we depend on, who owns it, status]
- **[Dependency Name]:** [What we depend on, who owns it, status]

### Assumptions
- [Key assumption 1]
- [Key assumption 2]

---

## Resource Requirements

[Team, infrastructure, and other resources needed. Extract from technical requirements and business requirements.]

### Team
- **Development Team:** [Size, roles, time commitment]
- **QA/Testing:** [Size, time commitment]
- **Product/Design:** [Size, time commitment]
- **DevOps/Infrastructure:** [Size, time commitment]

### Infrastructure
- [Key infrastructure requirements - servers, databases, services]
- [Estimated costs if available]

### Timeline Commitment
- **Total Project Duration:** [Duration]
- **Team Capacity Required:** [FTE count or percentage]

---

## Conclusion

[2-3 sentence summary tying together problem, solution, timeline, and expected outcome.]

---

*For detailed technical specifications, see `docs/planning/technical-requirements.yaml`.*
*For detailed implementation plan, see `docs/implementation/milestones.yaml`.*
```

### Step 5: Handle Missing Data Gracefully

When required files are missing, insert clear placeholders:

```markdown
## Timeline & Milestones

[Not Available - `timeline.yaml` not found. Run `/delivery-timeline` to generate delivery timeline.]

**Estimated Duration:** [If milestones.yaml exists, sum milestone estimates]
**Target Completion:** TBD
```

Or for partial data:

```markdown
## Risks & Dependencies

### Technical Risks
[Not Available - detailed risk analysis requires `technical-requirements.yaml`]

### External Dependencies
- [List any dependencies mentioned in available documents]
```

### Step 6: Confirmation

After generating the summary, display:

```
## Executive Summary Generated ✓

**Location:** docs/summaries/executive-summary.md
**Size:** [file size]

Summary includes:
  ✓ Business problem statement
  ✓ Solution overview
  ✓ Key features & capabilities
  ✓ Timeline & milestones
  ✓ Success metrics
  ✓ Risks & dependencies
  ✓ Resource requirements

The summary is ready for stakeholder review and communication.
```

## Content Extraction Logic

### Business Problem Section

**Source:** `business-requirements.yaml`

Extract from these fields:
- `description` or `overview` - Overall context
- `business_goals.primary_goal` - Main business driver
- `problem_statement` - Explicit problem description
- `why` or `rationale` - Why this matters

**Structure:**
1. **Current State** - What exists today, what's not working
2. **Business Impact** - Costs, inefficiencies, risks of status quo

**Writing Guidelines:**
- Use business language, not technical jargon
- Quantify impact when possible (costs, time, users affected)
- Focus on business value, not technical challenges
- Keep it concrete and specific

**Example:**
> "Customer support teams currently lack visibility into real-time system status, requiring manual checks across multiple dashboards and resulting in delayed incident response. This fragmentation leads to an average 45-minute MTTR and costs approximately $150K annually in lost productivity and customer churn."

### Solution Overview Section

**Source:** `business-requirements.yaml` + `technical-requirements.yaml`

Extract from:
- `solution_overview` or `proposed_solution`
- `architecture.approach` - High-level technical approach (translate to business terms)
- `key_capabilities` - What the system will do

**Structure:**
1. **Approach** - What we're building (non-technical)
2. **Benefits** - How it solves the problem

**Writing Guidelines:**
- Translate technical concepts to business value
- Focus on outcomes, not implementation
- Explain how the solution addresses the problem
- Highlight differentiators or key advantages

**Example:**
> "We will build a unified monitoring dashboard that aggregates system health metrics, alerts, and incident history in a single interface. The solution enables support teams to identify and respond to incidents within minutes, reducing MTTR by 70% and improving customer satisfaction."

### Key Features Section

**Source:** `business-requirements.yaml`

Extract from:
- `functional_requirements` - Specific capabilities
- `features` or `capabilities` - Feature list
- `user_stories` - User-facing functionality

**Categorization:**
- Group related features together
- Use business-friendly category names
- Focus on what users can do, not how it works

**Categories might include:**
- User Management
- Data & Analytics
- Integrations
- Automation
- Reporting
- Security & Compliance

**Format each feature:**
```markdown
- **[Feature Name]** - [Business value / what it enables]
```

**Example:**
```markdown
### Monitoring & Alerting
- **Real-Time Status Dashboard** - View system health across all services at a glance
- **Smart Alert Routing** - Automatically notify the right team based on alert severity and service ownership
- **Historical Trends** - Identify patterns and predict potential issues before they impact users
```

### Timeline & Milestones Section

**Source:** `timeline.yaml` (preferred) or `milestones.yaml` (fallback)

**From timeline.yaml:**
- Extract `workback.project_start`
- Extract `workback.production_deploy`
- Extract milestone dates from the timeline
- Extract QA rounds and durations

**From milestones.yaml (if timeline unavailable):**
- Sum `estimated_duration` for total
- List milestone sequence
- Note this is preliminary without QA/PR time

**Presentation:**
- Use a table for clear milestone visualization
- Highlight key delivery dates
- Show development vs QA vs deploy phases
- Make it scannable

### Success Metrics Section

**Source:** `business-requirements.yaml`

Extract from:
- `success_criteria` - Explicit success measures
- `measurable_outcomes` - Quantifiable targets
- `kpis` or `metrics` - Tracking measures

**Categorize as:**
- **Primary Metrics** - Must-achieve targets (often tied to business goals)
- **Secondary Metrics** - Nice-to-have improvements

**Format:**
```markdown
- **[Metric Name]:** [Target value] - [What this measures and why it matters]
```

**Example:**
```markdown
### Primary Metrics
- **Mean Time to Resolution (MTTR):** < 15 minutes - Measures incident response speed and system reliability
- **Customer Satisfaction Score:** > 4.5/5.0 - Indicates user satisfaction with support response
```

### Risks & Dependencies Section

**Source:** `technical-requirements.yaml`

Extract from:
- `risks` - Technical and project risks
- `external_dependencies` - Third-party services, APIs, teams
- `constraints` - Limitations or requirements
- `assumptions` - What we're assuming to be true

**Risk Table Columns:**
- **Risk** - Clear description of what could go wrong
- **Impact** - High/Medium/Low severity
- **Mitigation** - How we're addressing it

**Dependencies Format:**
```markdown
- **[Dependency Name]:** [What it provides, who owns it, current status]
```

**Example:**
```markdown
### External Dependencies
- **Stripe Payment API:** Payment processing service, owned by Finance team, production-ready
- **SendGrid Email Service:** Transactional emails, third-party SaaS, requires account setup (in progress)
```

### Resource Requirements Section

**Source:** `technical-requirements.yaml` + `business-requirements.yaml` + `timeline.yaml`

Extract from:
- `resources` section in technical requirements
- `team` or `stakeholders` in business requirements
- Timeline duration for capacity calculation

**Structure:**
- **Team** - Roles, size, time commitment
- **Infrastructure** - Key technical resources needed
- **Timeline Commitment** - Total duration and capacity

**Example:**
```markdown
### Team
- **Development Team:** 3 engineers (2 backend, 1 frontend), full-time for 8 weeks
- **QA/Testing:** 1 QA engineer, 2 weeks during QA phases
- **Product:** 0.5 FTE for requirements and acceptance
- **DevOps:** 0.25 FTE for infrastructure setup and deployment

### Infrastructure
- PostgreSQL database (AWS RDS)
- Redis cache cluster
- Kubernetes cluster (existing infrastructure)
- Estimated cloud costs: $500/month
```

## Error Handling

### File Not Found

If a required file doesn't exist:
- Check standard `docs/` locations first
- Check root directory as fallback
- Display exact path attempted
- Suggest which Sherpy skill generates the file

### Invalid YAML

If a file can't be parsed:
- Display clear parsing error
- Show file path and line number
- Suggest regenerating the file

### Missing Required Fields

If expected fields are missing:
- Use "[Not Specified]" placeholders
- Continue with available data
- Note missing information in confirmation

## Output Location

Always output to: `docs/summaries/executive-summary.md`

Create directories if they don't exist:
```bash
mkdir -p docs/summaries
```

## Writing Style Guidelines

### Tone
- Professional and clear
- Non-technical language
- Focus on business value
- Confident but realistic about risks

### Audience
- C-level executives
- Product managers
- Business stakeholders
- Non-technical decision makers

### Avoid
- Technical jargon without explanation
- Implementation details
- Code or command references
- Acronyms without definition

### Include
- Business impact and value
- Clear timelines and commitments
- Measurable outcomes
- Risk acknowledgment with mitigation

## Integration with Sherpy Flow

This skill is designed to be called as the **last part of Step 10** in `/sherpy-flow`, after `/developer-summary`. It should:
- Run after all planning artifacts are complete
- Auto-discover files from the organized folder structure
- Not fail if optional sections are missing
- Generate the summary without user interaction when all files are present

## Examples

See the main Sherpy documentation for example outputs.

## Related Skills

- `/developer-summary` - Generate developer-focused technical summary
- `/sherpy-flow` - Full planning workflow (includes this skill at the end)
- `/business-requirements-interview` - Generates business-requirements.yaml
- `/technical-requirements-interview` - Generates technical-requirements.yaml
- `/delivery-timeline` - Generates timeline.yaml
