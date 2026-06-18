import type { PrismaClient } from "../src/generated/prisma/client";
import {
  placeholderEmail,
  upsertActivity,
  upsertAgreement,
  upsertClient,
  upsertDeliverable,
  upsertInvoice,
  upsertMeeting,
  upsertProject,
  upsertTask,
  upsertTimelineEvent,
} from "./seed-helpers";

const d = (iso: string) => new Date(iso);

export async function seedNorthopsData(
  prisma: PrismaClient,
  adminUserId: string
) {
  const counts = {
    clients: 0,
    projects: 0,
    agreements: 0,
    invoices: 0,
    meetings: 0,
    tasks: 0,
    deliverables: 0,
    timelineEvents: 0,
    activities: 0,
  };

  const track = async <T>(key: keyof typeof counts, fn: () => Promise<T>) => {
    await fn();
    counts[key]++;
  };

  // ─── NorthOps internal (company priorities, advisors — not client-facing) ───
  const northopsInternal = await upsertClient(prisma, {
    company: "NorthOps LLC",
    name: "Curran Advani",
    email: "internal@getnorthops.com",
    status: "internal",
  });
  counts.clients++;

  const internalProject = await upsertProject(prisma, northopsInternal.id, "Company Operations", {
    status: "active",
    description: [
      "NorthOps LLC — https://getnorthops.com",
      "Customized ERP, CRM, operations software, workflow automation, and internal business systems for SMBs.",
      "Core verticals: fire protection, construction, industrial manufacturing, architecture/design, solar/energy, operationally complex service businesses.",
      "Positioning: replace disconnected spreadsheets and fragmented software; build tailored systems around actual workflows.",
      "Typical project value: ~$5,000–$40,000+ setup; recurring maintenance/retainer where applicable.",
      "Current priority: close and implement core B2B clients; build fire-protection market share; improve repeatable sales and fulfillment systems.",
    ].join("\n"),
  });
  counts.projects++;

  const priorities = [
    "Successfully onboard SKAPS Industries",
    "Confirm Nielsen Studios contract execution, first payment, and June 22 kickoff",
    "Move Total Fire Protection from stakeholder interest to defined Fort Myers pilot or signed rollout",
    "Clarify Mynt Systems scope and decision process",
    "Build focused fire-protection sales pipeline (Summit, VSC, Ameripipe, Protegis, Clarke)",
    "Create repeatable sales and implementation SOPs",
    "Keep contact, meeting, proposal, invoice, and next-step records current",
    "Avoid relying on Curran as sole holder of client context",
  ];
  for (const title of priorities) {
    await upsertTask(prisma, title, {
      projectId: internalProject.id,
      createdById: adminUserId,
      assigneeId: adminUserId,
      status: "TODO",
      priority: "high",
      isClientVisible: false,
      description: "NorthOps company priority (internal).",
    });
    counts.tasks++;
  }

  await track("activities", () =>
    upsertActivity(prisma, "Advisor: Doug Erickson (UCSC faculty)", "COMMENT", {
      description:
        "Planned discussion about TFP proposal, private-equity strategy, and proposal review. Advisor — not a customer.",
      userId: adminUserId,
    })
  );
  await track("activities", () =>
    upsertActivity(prisma, "Mentor call: Devin (Kalibr CEO)", "COMMENT", {
      description:
        "Fundraising and SaaS mentorship call planned around 2026-06-09. Meeting completion status: Unknown.",
      userId: adminUserId,
      createdAt: d("2026-06-09"),
    })
  );

  // ─── 1. SKAPS Industries — signed client ───────────────────────────────────
  const skaps = await upsertClient(prisma, {
    company: "SKAPS Industries",
    name: "Kush Vyas",
    email: placeholderEmail("SKAPS Industries", "Kush Vyas"),
    status: "active",
  });
  counts.clients++;

  const skapsProject = await upsertProject(prisma, skaps.id, "Website + CMS Dashboard", {
    status: "implementation",
    budget: 15000,
    startDate: d("2026-06-05"),
    description: [
      "Industry: Industrial manufacturing / geosynthetic products.",
      "Status: Closed client — signed / implementation. Close timing ~2026-06-05 (user-stated).",
      "Scope: New website, internal CMS dashboard, product catalog, PDF/document management, blog publishing, distribution to LinkedIn/X/Threads, optional future 3D-rendered product pages.",
      "Contract value: ~$15,000 total. First installment: $6,000. Monthly milestone-based payments; remaining installment amounts: confirm from contract.",
      "Support: 60 days post-launch bug support; maintenance after 60 days at $150/hour.",
      "Ownership transfers to SKAPS after final payment. Client retains hosting, DNS, analytics, CMS access.",
      "Stack: Next.js, TypeScript, React, Framer Motion, Three.js, Node.js, Vercel, Cloudflare R2, private GitHub repo.",
      "Storage: Cloudflare R2 initially; potential later PDF migration to SKAPS internal server.",
      "Known concerns: client staff training, uptime/dependency risks, emergency support after initial period, nontechnical editing capabilities, avoiding overreliance on free hosting tiers.",
      "",
      "Contacts:",
      "- Kush Vyas — primary contact, decision-maker/project lead. Confirmed readiness if training guaranteed.",
      "- Deep Patel — technical contact (GitHub access, training, system handoff).",
      "- Sunil — stakeholder (title: Unknown).",
      "- Nayan — stakeholder (title: Unknown).",
    ].join("\n"),
  });
  counts.projects++;

  await track("agreements", () =>
    upsertAgreement(prisma, skaps.id, "Website + CMS — Master Agreement", {
      status: "SIGNED",
      value: 15000,
      signedAt: d("2026-06-05"),
      startDate: d("2026-06-05"),
      description:
        "Signed agreement ~$15,000. Milestone payments. 60-day post-launch support included. Maintenance $150/hr after. Ownership transfers after final payment. Curran signed revised agreement ~2026-05-21; final client signature timing was initially pending — verify execution date.",
    })
  );

  await track("invoices", () =>
    upsertInvoice(prisma, skaps.id, "INV-SKAPS-2026-001", {
      status: "SENT",
      amount: 6000,
      total: 6000,
      dueDate: d("2026-06-12"),
      notes: "First installment ($6,000). Payment received: Unknown — confirm.",
      lineItems: [
        {
          description: "First milestone payment — website + CMS project",
          quantity: 1,
          unitPrice: 6000,
          total: 6000,
        },
      ],
    })
  );

  const skapsDeliverables = [
    { title: "New marketing website", status: "IN_PROGRESS" as const },
    { title: "Internal CMS dashboard", status: "IN_PROGRESS" as const },
    { title: "Product catalog + PDF management", status: "PLANNED" as const },
    { title: "Blog publishing + social distribution", status: "PLANNED" as const },
    { title: "Client staff training program", status: "PLANNED" as const },
    { title: "Optional 3D product pages (future scope)", status: "PLANNED" as const },
  ];
  for (const item of skapsDeliverables) {
    await upsertDeliverable(prisma, skapsProject.id, item.title, {
      status: item.status,
      description: item.title.includes("3D")
        ? "Separate scope — optional future add-on."
        : undefined,
    });
    counts.deliverables++;
  }

  await track("meetings", () =>
    upsertMeeting(prisma, skaps.id, "SKAPS product demo", d("2026-05-20T03:30:00.000Z"), {
      duration: 60,
      participants: "Chaavan (presenter), Kush Vyas, Deep Patel, SKAPS stakeholders",
      summary: [
        "09:00 AM IST demo led by Chaavan.",
        "Topics: dashboard editing, correcting typos, adding products, product content management, optional 3D pages, DNS transition at project end, WordPress asset reuse, monthly hosting cost expectations, training.",
      ].join(" "),
      actionItems:
        "Guarantee training process; confirm repository/access ownership; define content migration responsibilities; document hosting and maintenance responsibilities.",
    })
  );

  await track("timelineEvents", () =>
    upsertTimelineEvent(prisma, skapsProject.id, "Client closed / first invoice", d("2026-06-05"), {
      type: "milestone",
      description: "SKAPS closed ~2026-06-05. First installment $6,000 invoiced. Confirm payment received.",
    })
  );
  await track("timelineEvents", () =>
    upsertTimelineEvent(prisma, skapsProject.id, "Contract revision signed (NorthOps)", d("2026-05-21"), {
      type: "milestone",
      description:
        "Curran signed revised agreement ~2026-05-21. Client signature timing was initially pending — verify final execution date.",
    })
  );

  const skapsTasks = [
    "Confirm implementation kickoff and development milestones",
    "Guarantee and document training process for SKAPS staff",
    "Confirm repository and GitHub access ownership (Deep Patel)",
    "Track first $6,000 payment receipt",
    "Define content migration responsibilities (WordPress assets)",
    "Document hosting, DNS, and maintenance responsibilities",
  ];
  for (const title of skapsTasks) {
    await upsertTask(prisma, title, {
      projectId: skapsProject.id,
      createdById: adminUserId,
      assigneeId: adminUserId,
      status: "TODO",
      priority: "high",
      isClientVisible: false,
    });
    counts.tasks++;
  }

  await track("activities", () =>
    upsertActivity(prisma, "SKAPS — client closed", "AGREEMENT_SIGNED", {
      clientId: skaps.id,
      userId: adminUserId,
      description: "SKAPS Industries closed ~2026-06-05. Implementation/onboarding in progress.",
      createdAt: d("2026-06-05"),
    })
  );

  // ─── 2. Total Fire Protection — advanced prospect (NOT signed) ─────────────
  const tfp = await upsertClient(prisma, {
    company: "Total Fire Protection",
    name: "Tim Van Dyke",
    email: placeholderEmail("Total Fire Protection", "Tim Van Dyke"),
    status: "prospect-advanced",
  });
  counts.clients++;

  const tfpProject = await upsertProject(prisma, tfp.id, "Multi-Location Operations Platform", {
    status: "proposal",
    budget: 40000,
    description: [
      "Abbreviation: TFP. Industry: Fire protection. Multi-location company (6+ locations). HQ: Grand Rapids, Michigan.",
      "Status: Advanced prospect — proposal, stakeholder alignment, rollout planning. NOT signed.",
      "Opportunity: Full multi-location operations platform, centralized business operations, CRM add-on, individual branch setup, standardized workflows.",
      "First rollout branch: Fort Myers. Key operational system: Hydrolist (parts, pricing, job workflows).",
      "Pricing discussed: $40,000 setup; $25,000 retainers (interpretation unclear — one retainer, multiple, or rollout fee?); $2,500/month maintenance.",
      "Strategic value: Strong fire-protection opportunity; multi-branch expansion; potential private-equity relevance.",
      "NorthOps validated platform concept at TFP HQ ~2026-06-01.",
      "",
      "Contacts:",
      "- Tim Van Dyke — Grand Rapids HQ, important buyer/operational stakeholder (title: Unknown). Values workflow visibility, reduced admin burden, branch coordination.",
      "- Courtney — stakeholder (title: Unknown).",
      "- Joe Horvath — VP, Acquisitions & Operations. Senior executive; influence over rollout, acquisitions, centralization.",
      "- Dustin — internal stakeholder (title: Unknown). RSVP'd to meeting but did not attend.",
      "- Jason — internal stakeholder (title: Unknown). RSVP'd but attempted to reschedule.",
      "",
      "Risks: multiple stakeholders, uneven attendance, need internal champion and executive alignment, rollout scope creep, unclear decision owner (HQ vs branches vs PE sponsor).",
      "Stakeholder-alignment risk: VP of Operations canceled/did not attend proposal meeting (exact date unknown). Uneven enthusiasm — not interpreted as rejection.",
    ].join("\n"),
  });
  counts.projects++;

  await track("agreements", () =>
    upsertAgreement(prisma, tfp.id, "Multi-Location Platform — Proposal", {
      status: "SENT",
      value: 40000,
      description: [
        "Proposal stage — NOT signed.",
        "Discussed: $40,000 setup, $25,000 retainers (meaning unclear), $2,500/month maintenance.",
        "Fort Myers pilot scope TBD. Hydrolist integration central to workflow.",
        "ROI to document: time saved, reduced duplicate entry, centralized reporting, branch consistency, faster pricing/parts workflows, acquisition integration.",
      ].join(" "),
    })
  );

  await track("meetings", () =>
    upsertMeeting(prisma, tfp.id, "Grand Rapids HQ — workflow validation", d("2026-06-01"), {
      participants: "Curran Advani, TFP HQ team",
      summary:
        "NorthOps traveled to Grand Rapids to validate platform and workflows at TFP headquarters. Fort Myers identified as likely first rollout branch. Company has at least six locations. Hydrolist confirmed as operationally important.",
      actionItems:
        "Confirm Fort Myers pilot scope; map Hydrolist workflows; document branch operational needs.",
    })
  );

  await track("meetings", () =>
    upsertMeeting(prisma, tfp.id, "TFP operational call", d("2026-06-04T21:30:00.000Z"), {
      duration: 60,
      participants: "Curran Advani, Tim Van Dyke, Joe Horvath, Courtney, additional stakeholders possible",
      summary: [
        "~17:30 local time. Topics: centralized rollout, operations, branch implementation, CRM, existing workflows, Hydrolist, pricing and rollout potential, acquisitions.",
        "Fireflies transcript exists externally — do not fabricate detailed statements.",
      ].join(" "),
      actionItems:
        "Reschedule missed stakeholder meetings; clarify buying committee and economic buyer; confirm rollout sequence and Fort Myers pilot; send revised proposal or implementation roadmap; assign internal TFP champion.",
    })
  );

  await track("meetings", () =>
    upsertMeeting(prisma, tfp.id, "TFP proposal meeting — stakeholder no-show", d("2026-06-10"), {
      participants: "Dustin (RSVP'd, did not attend), Jason (attempted reschedule), VP Operations (canceled/did not attend)",
      summary:
        "Proposal-related meeting. Senior operations stakeholder canceled or did not attend. Dustin RSVP'd without attending. Jason attempted to reschedule. Exact date: Unknown — stored as June 2026 placeholder. Stakeholder-alignment risk; not interpreted as rejection.",
    })
  );

  const tfpTasks = [
    "Reschedule missed TFP stakeholder meetings",
    "Clarify final buying committee and economic buyer",
    "Confirm Fort Myers pilot scope and rollout sequence",
    "Clarify exact pricing structure ($25k retainers interpretation)",
    "Document ROI case for TFP leadership",
    "Send revised proposal or implementation roadmap",
    "Identify and cultivate internal TFP champion",
  ];
  for (const title of tfpTasks) {
    await upsertTask(prisma, title, {
      projectId: tfpProject.id,
      createdById: adminUserId,
      assigneeId: adminUserId,
      status: "TODO",
      priority: "high",
      isClientVisible: false,
      description: "Internal next step — TFP prospect (not signed).",
    });
    counts.tasks++;
  }

  // ─── 3. Nielsen Studios — committed / contract status unconfirmed ───────────
  const nielsen = await upsertClient(prisma, {
    company: "Nielsen Studios",
    name: "Unknown",
    email: placeholderEmail("Nielsen Studios"),
    status: "committed",
  });
  counts.clients++;

  const nielsenProject = await upsertProject(prisma, nielsen.id, "Custom Business Operations System", {
    status: "onboarding",
    budget: 10000,
    startDate: d("2026-06-22"),
    description: [
      "Website: https://www.nielsen.team/",
      "Industry: Design / architecture / creative services.",
      "Status: Core customer or recently closed — contract execution NOT confirmed in this seed.",
      "Development partner arrangement with code ownership and escrow protections discussed.",
      "Pricing: $6,000 initial payment + $4,000 second payment. Second payment milestone: pull from proposal/contract — not invented here.",
      "Scheduled kickoff: 2026-06-22. Contract and payment status require confirmation.",
      "Contract protections discussed (verify final executed language): NorthOps owns IP until change-of-control or as specified; code escrow upon change of control; consolidated DocuSign document intended.",
      "Sales: Kayden led portions of sales process; Curran handled closing, strategy, agreement work.",
      "Individual contact names: Unknown — not invented.",
    ].join("\n"),
  });
  counts.projects++;

  await track("agreements", () =>
    upsertAgreement(prisma, nielsen.id, "Software Development Agreement", {
      status: "SENT",
      value: 10000,
      startDate: d("2026-06-22"),
      description:
        "Contract status unconfirmed. $6,000 initial + $4,000 second payment. IP ownership, code escrow, and change-of-control terms discussed — governed by final executed agreement only. Do not mark SIGNED without verification.",
    })
  );

  await track("invoices", () =>
    upsertInvoice(prisma, nielsen.id, "INV-NIELSEN-2026-001", {
      status: "DRAFT",
      amount: 6000,
      total: 6000,
      notes: "Initial payment ($6,000). Payment received: Unknown — confirm before sending.",
      lineItems: [
        {
          description: "Initial payment — software development agreement",
          quantity: 1,
          unitPrice: 6000,
          total: 6000,
        },
      ],
    })
  );

  await track("timelineEvents", () =>
    upsertTimelineEvent(prisma, nielsenProject.id, "Scheduled project kickoff", d("2026-06-22"), {
      type: "milestone",
      description:
        "Scheduled start date 2026-06-22. Contract execution and first payment status require confirmation.",
    })
  );

  const nielsenTasks = [
    "Confirm Nielsen Studios contract execution status",
    "Confirm first $6,000 payment received",
    "Confirm June 22, 2026 kickoff",
    "Confirm development timeline and second payment milestone from proposal",
    "Confirm code escrow process and repository access",
    "Confirm change-of-control definition in final agreement",
  ];
  for (const title of nielsenTasks) {
    await upsertTask(prisma, title, {
      projectId: nielsenProject.id,
      createdById: adminUserId,
      assigneeId: adminUserId,
      status: "TODO",
      priority: "high",
      isClientVisible: false,
    });
    counts.tasks++;
  }

  // ─── 4. Mynt Systems / Mynt Solar — discovery prospect ─────────────────────
  const mynt = await upsertClient(prisma, {
    company: "Mynt Systems / Mynt Solar",
    name: "Unknown",
    email: placeholderEmail("Mynt Systems"),
    status: "prospect",
  });
  counts.clients++;

  const myntProject = await upsertProject(prisma, mynt.id, "End-to-End CRM + ERP", {
    status: "discovery",
    description: [
      "Industry: Solar, energy, construction/facilities/operational services.",
      "Status: Prospect / early customer. Commercial status: Unknown. NOT signed.",
      "Company size note (unverified): ~$73M business volume/revenue — stored as unverified note only.",
      "Opportunity: End-to-end CRM/ERP, solar measurement tools, project operations, sales, customer management, job tracking, financial/operational coordination.",
      "Existing tools: Smartsheet, Google Sheets/Drive, Energy Toolbase, Excel, Aurora, Jonas Premier, Spyro, Slack.",
      "Desired UI: familiar to Smartsheet, Jonas Premier, Spyro users.",
      "Pain: fragmented systems, data duplication, disconnected project/customer workflows.",
      "Contacts: Unknown. Relationship: connection through Curran's father's company/IT context (internal note — not for client portal).",
    ].join("\n"),
  });
  counts.projects++;

  const myntTasks = [
    "Confirm Mynt decision-maker and discovery meeting date",
    "Map existing software workflows (Smartsheet, Jonas Premier, Spyro, Aurora, etc.)",
    "Identify systems to integrate vs replace",
    "Build phased scope proposal",
    "Confirm budget and pilot department",
    "Quantify ROI for Mynt leadership",
  ];
  for (const title of myntTasks) {
    await upsertTask(prisma, title, {
      projectId: myntProject.id,
      createdById: adminUserId,
      assigneeId: adminUserId,
      status: "TODO",
      priority: "medium",
      isClientVisible: false,
    });
    counts.tasks++;
  }

  // ─── 5. Namaste — closed lost ────────────────────────────────────────────────
  const namaste = await upsertClient(prisma, {
    company: "Namaste",
    name: "Unknown",
    email: placeholderEmail("Namaste"),
    status: "closed-lost",
  });
  counts.clients++;

  await upsertProject(prisma, namaste.id, "Restaurant Social Media (discontinued)", {
    status: "closed",
    description: [
      "Industry: Restaurant. Status: Lost client / churned. Deal stage: Closed lost.",
      "Historical service: restaurant marketing / social media.",
      "Client feedback: Curran should have communicated earlier, offered more restaurants, or increased pricing; might have stayed under different commercial terms.",
      "NorthOps is exiting restaurant social-media services — not in active ERP pipeline.",
      "Reason lost: offer structure, communication, business-model shift.",
      "Next steps: none (lessons learned only).",
    ].join("\n"),
  });
  counts.projects++;

  // ─── 6. Chocolat — former client ───────────────────────────────────────────
  const chocolat = await upsertClient(prisma, {
    company: "Chocolat",
    name: "Unknown",
    email: placeholderEmail("Chocolat"),
    status: "closed-lost",
  });
  counts.clients++;

  await upsertProject(prisma, chocolat.id, "Restaurant Social Media (ended)", {
    status: "closed",
    description: [
      "Industry: Restaurant. Status: Former client. Service ended.",
      "Results: ~1,400–1,500 new Instagram followers; one Reel ~52k views / 1k likes; one TikTok ~12k views / 800 likes; reported restaurant sales ~$61k by ~2026-05-24.",
      "Service: social media content, high-frequency posting, influencer marketing, potential DM automation.",
      "Problems: owner requested work stop; access/communication issues; missed early-morning emails; user banned from client email.",
      "Historical client only. NorthOps exiting restaurant social-media services.",
    ].join("\n"),
  });
  counts.projects++;

  // ─── 7. David Jackman — legacy marketing pilot ─────────────────────────────
  const jackman = await upsertClient(prisma, {
    company: "David Jackman (Restaurant Pilot)",
    name: "David Jackman",
    email: placeholderEmail("David Jackman"),
    status: "legacy-marketing",
  });
  counts.clients++;

  await upsertProject(prisma, jackman.id, "Performance-Based Marketing Pilot #2", {
    status: "proposal",
    startDate: d("2026-06-01"),
    endDate: d("2026-06-30"),
    description: [
      "Company: Unknown restaurant. Separate legacy service line — not main ERP pipeline.",
      "Agreement: Performance-Based Marketing Pilot #2, June 1–30, 2026.",
      "Compensation: 20% of additional revenue. Baseline/target: beat $70,000 (per agreement). Revenue source: Square POS.",
      "Exclusions: in-kind revenue, losses, other agreement exclusions.",
      "Client pays influencer fees; influencer meals comped.",
      "Content: Saturday nights when David present; Monday/Wednesday 12:00 and 4:00; 24-hour turnaround.",
      "Current status: Unknown.",
    ].join("\n"),
  });
  counts.projects++;

  // ─── 8. Fire-protection outreach prospects ─────────────────────────────────
  const fireProspects: {
    company: string;
    name: string;
    description: string;
    contactNotes?: string;
  }[] = [
    {
      company: "Summit Fire & Security",
      name: "Andre Dunn",
      contactNotes:
        "Sprinkler Operations Manager. 15+ years, NICET, Backflow Prevention, NFPA 25/13. Trains/mentors technicians. Outreach lead — June 2026. No confirmed meeting. Initial outreach should not sound like immediate sales pitch. Pain areas: technician training, inspections, code compliance, job operations, field-to-office handoff.",
      description: "Fire-protection outreach lead. Stage: outreach (~10% if probability required).",
    },
    {
      company: "VSC Fire & Security",
      name: "Unknown",
      description: "Fire-protection outreach target via LinkedIn. No confirmed contact or meeting.",
    },
    {
      company: "Ameripipe Supply",
      name: "Unknown",
      description: "Fire-protection outreach target. No confirmed contact or meeting.",
    },
    {
      company: "Protegis Fire & Safety",
      name: "Unknown",
      description: "Fire-protection outreach target. No confirmed contact or meeting.",
    },
    {
      company: "Clarke Fire Protection",
      name: "Unknown",
      description: "Fire-protection outreach target. No confirmed contact or meeting.",
    },
  ];

  for (const prospect of fireProspects) {
    const client = await upsertClient(prisma, {
      company: prospect.company,
      name: prospect.name,
      email: placeholderEmail(prospect.company, prospect.name !== "Unknown" ? prospect.name : undefined),
      status: "prospect",
    });
    counts.clients++;

    await upsertProject(prisma, client.id, "Fire-Protection Outreach", {
      status: "outreach",
      description: [prospect.description, prospect.contactNotes].filter(Boolean).join("\n"),
    });
    counts.projects++;
  }

  // ─── 9. UCSC — early prospect ──────────────────────────────────────────────
  const ucsc = await upsertClient(prisma, {
    company: "University of California, Santa Cruz",
    name: "Kimberly Chamlin",
    email: placeholderEmail("UCSC", "Kimberly Chamlin"),
    status: "prospect",
  });
  counts.clients++;

  const ucscProject = await upsertProject(prisma, ucsc.id, "Operational Automation", {
    status: "discovery",
    description: [
      "Opportunity: Internal accounting, finance, systems, and process automation.",
      "Deal stage: Early outreach / meetings.",
      "Contacts:",
      "- Bijuu — systems/financial operations (title: Unknown).",
      "- Margaret — accounting (title: Unknown).",
      "- Kimberly Chamlin — UCSC stakeholder; Kayden obtained meeting; Curran and intern planned to attend (role/title not invented).",
      "Meeting date: June 2026, exact date unknown. Status: Unknown.",
      "Next: confirm meeting dates, workflow pain, procurement constraints, consulting vs software vs automation.",
    ].join("\n"),
  });
  counts.projects++;

  await track("meetings", () =>
    upsertMeeting(prisma, ucsc.id, "UCSC operational automation — introductory meeting", d("2026-06-15"), {
      participants: "Kimberly Chamlin, Curran Advani, intern (planned), Kayden (originated meeting)",
      summary:
        "June 2026, exact date unknown — placeholder date used. Meeting completion status: Unknown. Early discovery for accounting/finance/systems automation.",
      actionItems:
        "Confirm meeting date; identify concrete workflow pain; determine procurement constraints; establish consulting vs software vs automation fit.",
    })
  );

  const ucscTasks = [
    "Confirm UCSC meeting date with Kimberly Chamlin",
    "Identify concrete accounting/finance workflow pain points",
    "Determine UCSC procurement constraints",
    "Establish whether opportunity is consulting, software, or automation",
  ];
  for (const title of ucscTasks) {
    await upsertTask(prisma, title, {
      projectId: ucscProject.id,
      createdById: adminUserId,
      assigneeId: adminUserId,
      status: "TODO",
      priority: "medium",
      isClientVisible: false,
    });
    counts.tasks++;
  }

  return counts;
}
