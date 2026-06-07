const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const JD = `
BrightPlan — Applied AI Engineer (Remote, $125,000–$155,000)

About the role:
BrightPlan seeks an engineer to develop AI-powered product features for their financial wellness platform. The role emphasizes practical generative AI implementation rather than research-focused work.

Primary Responsibilities:
- Develop and improve AI product features working across product and engineering teams
- Design and optimize prompts for enhanced response quality
- Build Python services and APIs supporting AI workflows
- Work with PostgreSQL and vector databases for AI applications
- Implement features using FastAPI systems
- Leverage AI-assisted development tools for productivity

Key Requirements:
- Minimum 3 years software engineering experience
- Strong Python proficiency
- Demonstrated expertise with AI coding tools, particularly Claude Code
- Backend services or API development background
- LLM API integration or generative AI application experience
- Effective cross-functional collaboration ability

Preferred Qualifications:
- FastAPI framework experience
- Prompt evaluation or LLM testing knowledge
- Production SaaS AI integration background
- Fintech or B2B SaaS experience

Application Note: Candidates should include a brief description of one AI-powered feature, service, or system they helped build or support in production.

Benefits: 401(k) with matching, health/dental/vision insurance, paid time off, life insurance, performance bonuses, and equity participation.
`.trim();

async function main() {
  const opp = await p.opportunity.create({
    data: {
      company:    'BrightPlan',
      role:       'Applied AI Engineer',
      stage:      'inbox',
      salaryMin:  125000,
      salaryMax:  155000,
      workType:   'full_time',
      source:     'manual',
      applyUrl:   'https://www.indeed.com/viewjob?jk=5d0d10e524a368b0',
      jdText:     JD,
    },
  });
  console.log(`Created: ${opp.id}`);
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
