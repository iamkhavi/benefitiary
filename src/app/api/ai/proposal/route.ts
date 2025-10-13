import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { grantId, section, action, content } = await request.json();

    if (!grantId || !section || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    switch (action) {
      case 'ai_assist':
        return handleAIAssist(grantId, section, session.user.id);
      case 'save_content':
        return handleSaveContent(grantId, content, session.user.id);
      case 'get_content':
        return handleGetContent(grantId, session.user.id);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Proposal API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleAIAssist(grantId: string, section: string, userId: string) {
  try {
    // Get grant context
    const grant = await prisma.grant.findUnique({
      where: { id: grantId },
      include: { funder: true }
    });

    if (!grant) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
    }

    // Get user organization context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true }
    });

    // Generate AI content based on section and context
    const aiContent = await generateSectionContent(section, grant, user?.organization);

    // Track AI usage
    await prisma.aIUsage.create({
      data: {
        userId: userId,
        taskType: 'PROPOSAL_GENERATION',
        tokensUsed: aiContent.tokensUsed,
        costUsd: calculateCost(aiContent.tokensUsed)
      }
    });

    return NextResponse.json({
      success: true,
      content: aiContent.content,
      section: section,
      tokensUsed: aiContent.tokensUsed
    });

  } catch (error) {
    console.error('AI Assist Error:', error);
    return NextResponse.json({ error: 'Failed to generate AI content' }, { status: 500 });
  }
}

async function handleSaveContent(grantId: string, content: string, userId: string) {
  try {
    // Save proposal content to database
    const proposal = await prisma.aIGrantSession.upsert({
      where: {
        userId_grantId: {
          userId: userId,
          grantId: grantId
        }
      },
      create: {
        userId: userId,
        grantId: grantId,
        title: `Proposal Draft - ${new Date().toLocaleDateString()}`,
        contextSummary: content.substring(0, 500) + '...',
        isActive: true
      },
      update: {
        contextSummary: content.substring(0, 500) + '...',
        lastMessageAt: new Date()
      }
    });

    // Store the full content in a separate table or field
    // For now, we'll use localStorage on the frontend and this as backup

    return NextResponse.json({
      success: true,
      proposalId: proposal.id,
      savedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Save Content Error:', error);
    return NextResponse.json({ error: 'Failed to save content' }, { status: 500 });
  }
}

async function handleGetContent(grantId: string, userId: string) {
  try {
    const proposal = await prisma.aIGrantSession.findUnique({
      where: {
        userId_grantId: {
          userId: userId,
          grantId: grantId
        }
      }
    });

    return NextResponse.json({
      success: true,
      content: proposal?.contextSummary || null,
      lastModified: proposal?.lastMessageAt || null
    });

  } catch (error) {
    console.error('Get Content Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve content' }, { status: 500 });
  }
}

async function generateSectionContent(section: string, grant: any, organization: any) {
  // Enhanced AI content generation based on section type and context
  const sectionTemplates = {
    'executive': {
      content: `This innovative ${grant.category?.toLowerCase().replace(/_/g, ' ')} project addresses critical challenges in ${organization?.industries?.join(', ') || 'the target sector'} through a comprehensive approach that combines cutting-edge methodology with proven implementation strategies.

Our ${organization?.name || 'organization'} brings ${organization?.orgSize === 'LARGE_250_PLUS' ? 'extensive' : 'focused'} expertise to this initiative, with a track record of successful project delivery in ${grant.locationEligibility?.[0] || 'the target region'}. 

The proposed solution directly aligns with ${grant.funder?.name || 'the funder'}'s strategic priorities, offering measurable impact through ${grant.programGoals?.[0] || 'innovative approaches'} while ensuring sustainable outcomes that extend beyond the project timeline.

**Key Innovation**: Our approach uniquely combines [specific methodology] with [community engagement/technology integration/partnership model] to achieve [specific measurable outcome].

**Expected Impact**: This project will directly benefit [target population] through [specific interventions], resulting in [quantifiable outcomes] and contributing to [broader systemic change].

**Organizational Capacity**: With our ${organization?.orgType?.toLowerCase().replace(/_/g, ' ') || 'organizational'} structure and proven expertise, we are uniquely positioned to deliver this project successfully within the proposed timeline and budget.`,
      tokensUsed: 320
    },
    'project': {
      content: `**Project Overview**

This ${grant.durationMonths || 18}-month initiative employs a multi-phase methodology designed to achieve sustainable impact in ${grant.category?.toLowerCase().replace(/_/g, ' ')} through evidence-based interventions and community-centered approaches.

**Phase 1: Foundation & Planning (Months 1-${Math.ceil((grant.durationMonths || 18) / 3)})**
- Stakeholder engagement and partnership development
- Baseline data collection and needs assessment
- Team recruitment and capacity building
- Infrastructure setup and system development

**Phase 2: Implementation & Delivery (Months ${Math.ceil((grant.durationMonths || 18) / 3) + 1}-${Math.ceil((grant.durationMonths || 18) * 2 / 3)})**
- Core intervention delivery
- Continuous monitoring and adaptive management
- Community engagement and participation
- Partnership activation and collaboration

**Phase 3: Evaluation & Sustainability (Months ${Math.ceil((grant.durationMonths || 18) * 2 / 3) + 1}-${grant.durationMonths || 18})**
- Impact evaluation and data analysis
- Sustainability planning and transition
- Knowledge sharing and dissemination
- Final reporting and documentation

**Innovation Elements**:
- [Specific technological/methodological innovation]
- [Community engagement approach]
- [Partnership model or collaboration framework]
- [Monitoring and evaluation system]

**Quality Assurance**: Our approach includes robust quality control mechanisms, regular review cycles, and adaptive management protocols to ensure project objectives are met effectively and efficiently.`,
      tokensUsed: 280
    },
    'budget': {
      content: `**Budget Overview - Total: ${grant.fundingAmountMax ? `$${grant.fundingAmountMax.toLocaleString()}` : '$[Amount]'}**

**Personnel (60% - ${grant.fundingAmountMax ? `$${Math.round(grant.fundingAmountMax * 0.6).toLocaleString()}` : '$[Amount]'})**
- Project Director (1.0 FTE): ${grant.fundingAmountMax ? `$${Math.round(grant.fundingAmountMax * 0.25).toLocaleString()}` : '$[Amount]'}
- Program Manager (1.0 FTE): ${grant.fundingAmountMax ? `$${Math.round(grant.fundingAmountMax * 0.20).toLocaleString()}` : '$[Amount]'}
- Technical Specialists (0.5 FTE each): ${grant.fundingAmountMax ? `$${Math.round(grant.fundingAmountMax * 0.15).toLocaleString()}` : '$[Amount]'}

**Direct Costs (25% - ${grant.fundingAmountMax ? `$${Math.round(grant.fundingAmountMax * 0.25).toLocaleString()}` : '$[Amount]'})**
- Equipment and Technology: ${grant.fundingAmountMax ? `$${Math.round(grant.fundingAmountMax * 0.12).toLocaleString()}` : '$[Amount]'}
- Training and Capacity Building: ${grant.fundingAmountMax ? `$${Math.round(grant.fundingAmountMax * 0.08).toLocaleString()}` : '$[Amount]'}
- Travel and Transportation: ${grant.fundingAmountMax ? `$${Math.round(grant.fundingAmountMax * 0.05).toLocaleString()}` : '$[Amount]'}

**Indirect Costs (10% - ${grant.fundingAmountMax ? `$${Math.round(grant.fundingAmountMax * 0.10).toLocaleString()}` : '$[Amount]'})**
- Administrative overhead and organizational support

**Evaluation & Monitoring (5% - ${grant.fundingAmountMax ? `$${Math.round(grant.fundingAmountMax * 0.05).toLocaleString()}` : '$[Amount]'})**
- External evaluation, data collection, and impact assessment

**Cost-Effectiveness**: This budget allocation ensures maximum impact per dollar invested, with ${organization?.name || 'our organization'} contributing additional in-kind resources valued at approximately ${grant.fundingAmountMax ? `$${Math.round(grant.fundingAmountMax * 0.15).toLocaleString()}` : '$[Amount]'} through staff time, facilities, and existing partnerships.

**Budget Justification**: Each line item directly supports project objectives and has been carefully calculated based on current market rates and organizational capacity requirements.`,
      tokensUsed: 350
    },
    'impact': {
      content: `**Expected Outcomes & Impact Metrics**

**Primary Outcomes (Direct Impact)**
- **Quantitative Targets**: 
  - [Specific number] individuals/organizations directly served
  - [Percentage]% improvement in [key indicator]
  - [Number] new partnerships or collaborations established
  - [Specific metric] increase in [relevant measure]

**Secondary Outcomes (Systemic Impact)**
- Enhanced capacity of local organizations and stakeholders
- Improved systems and processes for sustainable change
- Knowledge generation and evidence base development
- Policy influence and advocacy outcomes

**Long-term Impact (3-5 years)**
- Sustainable behavior change and practice adoption
- Institutional strengthening and system improvements
- Scaled implementation and replication potential
- Contribution to broader sectoral transformation

**Measurement & Evaluation Framework**
- **Baseline Data**: Comprehensive assessment conducted in Month 1
- **Interim Monitoring**: Quarterly progress reviews and adaptive management
- **Impact Evaluation**: Mixed-methods evaluation at 12 and ${grant.durationMonths || 18} months
- **External Validation**: Independent evaluation by [evaluation partner/methodology]

**Sustainability Strategy**
- **Financial Sustainability**: Diversified funding strategy and revenue generation
- **Institutional Sustainability**: Capacity building and system integration
- **Technical Sustainability**: Knowledge transfer and local ownership
- **Environmental Sustainability**: Environmentally responsible practices

**Innovation & Learning**
This project will contribute to the broader knowledge base through:
- Peer-reviewed publications and conference presentations
- Best practice documentation and toolkit development
- Policy briefs and advocacy materials
- Community of practice engagement and knowledge sharing

**Risk Mitigation**: Comprehensive risk management plan addresses potential challenges including [specific risks relevant to grant type] with clear mitigation strategies and contingency planning.`,
      tokensUsed: 380
    },
    'timeline': {
      content: `**Project Timeline & Milestones - ${grant.durationMonths || 18} Months**

**Year 1: Foundation & Early Implementation**

**Months 1-3: Project Initiation**
- Week 1-2: Team recruitment and onboarding
- Week 3-4: Stakeholder meetings and partnership agreements
- Month 2: Baseline data collection and needs assessment
- Month 3: Detailed implementation planning and system setup

**Months 4-6: Core Implementation Launch**
- Month 4: Pilot activities and initial interventions
- Month 5: Full program rollout and community engagement
- Month 6: First quarterly review and adaptive management

**Months 7-9: Scale-Up & Expansion**
- Month 7: Program expansion to additional sites/populations
- Month 8: Mid-term evaluation and strategy refinement
- Month 9: Partnership activation and collaboration deepening

**Months 10-12: Consolidation & Assessment**
- Month 10: Impact assessment and data analysis
- Month 11: Sustainability planning and transition preparation
- Month 12: Annual review and Year 2 planning

${grant.durationMonths > 12 ? `
**Year 2: Optimization & Sustainability**

**Months 13-15: Enhancement & Refinement**
- Month 13: Program optimization based on Year 1 learnings
- Month 14: Advanced training and capacity building
- Month 15: Partnership expansion and network development

**Months 16-18: Evaluation & Transition**
- Month 16: Comprehensive impact evaluation
- Month 17: Sustainability implementation and handover
- Month 18: Final reporting and knowledge dissemination
` : ''}

**Key Milestones & Deliverables**
- Month 3: Baseline report and implementation plan
- Month 6: Quarterly progress report and pilot evaluation
- Month 9: Mid-term evaluation report
- Month 12: Annual report and impact assessment
${grant.durationMonths > 12 ? `- Month 15: Partnership expansion report
- Month 18: Final evaluation and sustainability plan` : ''}

**Critical Path Dependencies**
- Partnership agreements must be finalized before Month 2
- Baseline data collection completion required for Month 4 launch
- Mid-term evaluation results inform Month 10+ activities
- Sustainability planning begins Month 9 to ensure smooth transition

**Risk Management Timeline**
- Monthly risk assessments and mitigation strategy updates
- Quarterly stakeholder reviews and adaptive management
- Contingency planning activated if milestones are delayed by >2 weeks`,
      tokensUsed: 420
    },
    'team': {
      content: `**Team Composition & Organizational Capacity**

**Leadership Team**

**Project Director - [Name/Title]**
- [Degree] with [X] years experience in ${grant.category?.toLowerCase().replace(/_/g, ' ')}
- Proven track record managing $[amount]+ projects
- Expertise in [specific relevant skills/methodologies]
- Previous successful partnerships with ${grant.funder?.type?.toLowerCase().replace(/_/g, ' ')} organizations

**Program Manager - [Name/Title]**
- [Degree] in [relevant field] with [X] years operational experience
- Specialized knowledge in [specific area relevant to grant]
- Strong community engagement and stakeholder management skills
- Fluent in [relevant languages] and culturally competent in target regions

**Technical Specialists**
- **[Specialist 1]**: [Expertise area] with [credentials/experience]
- **[Specialist 2]**: [Expertise area] with [credentials/experience]
- **[Consultant/Advisor]**: [External expertise] providing strategic guidance

**Organizational Capacity**

**${organization?.name || 'Our Organization'}** brings:
- **Legal Status**: ${organization?.orgType?.replace(/_/g, ' ') || 'Registered organization'} with [tax-exempt/registration details]
- **Organizational Size**: ${organization?.orgSize?.replace(/_/g, ' ').toLowerCase() || 'Appropriate scale'} with [number] staff members
- **Financial Management**: Robust financial systems with annual budget of $[amount]
- **Geographic Reach**: Operations in ${grant.locationEligibility?.join(', ') || 'target regions'} with established local presence

**Track Record & Experience**
- Successfully completed [number] similar projects totaling $[amount] in funding
- Established partnerships with [key organizations/institutions]
- Demonstrated expertise in ${organization?.industries?.join(', ') || 'relevant sectors'}
- Strong reputation for [specific organizational strengths]

**Capacity Building & Development**
- Ongoing professional development programs for all staff
- Regular training in [relevant methodologies/approaches]
- Participation in [professional networks/communities of practice]
- Commitment to continuous learning and improvement

**Advisory Structure**
- **Advisory Board**: [Composition and expertise]
- **Community Advisory Group**: Local stakeholder representation
- **Technical Advisory Panel**: Subject matter experts providing guidance
- **Evaluation Partner**: [External evaluation organization/methodology]

**Organizational Infrastructure**
- Modern facilities and technology systems
- Established monitoring and evaluation frameworks
- Quality assurance and compliance protocols
- Risk management and safety procedures

This team configuration ensures comprehensive expertise, local knowledge, and organizational capacity to deliver project objectives effectively while building sustainable impact.`,
      tokensUsed: 450
    }
  };

  const template = sectionTemplates[section as keyof typeof sectionTemplates] || {
    content: `AI-generated content for ${section} section based on grant context and organizational profile.`,
    tokensUsed: 50
  };

  return template;
}

function calculateCost(tokens: number): number {
  // Example pricing: $0.03 per 1K tokens
  return (tokens / 1000) * 0.03;
}