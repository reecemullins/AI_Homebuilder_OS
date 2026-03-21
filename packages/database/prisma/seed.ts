import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create organization
  const org = await prisma.organization.create({
    data: {
      id: 'org-dev-001',
      name: 'BuilderOS Dev Company',
      type: 'OPERATOR',
      settings: {
        region: 'atlanta',
        defaultState: 'GA',
      },
    },
  });
  console.log(`Created organization: ${org.name}`);

  // Create dev user
  const user = await prisma.user.create({
    data: {
      id: 'dev-user',
      clerkId: 'dev-user',
      email: 'dev@builderos.local',
      name: 'Dev User',
      role: 'OWNER',
      organizationId: org.id,
    },
  });
  console.log(`Created user: ${user.name}`);

  // Create sample lots
  const lots = await Promise.all([
    prisma.lot.create({
      data: {
        organizationId: org.id,
        address: '123 Peachtree Rd',
        city: 'Alpharetta',
        county: 'Fulton',
        state: 'GA',
        zip: '30009',
        latitude: 34.0754,
        longitude: -84.2941,
        acreage: 0.45,
        source: 'MLS',
        sourceId: 'MLS-2024-001',
        listPrice: 125000,
        status: 'REVIEWING',
        overallScore: 8.2,
        schoolRating: 8.5,
        compScore: 7.8,
        marginEstimate: 0.22,
        scoreBreakdown: {
          school: 8.5,
          comps: 7.8,
          margin: 8.0,
          location: 8.5,
        },
      },
    }),
    prisma.lot.create({
      data: {
        organizationId: org.id,
        address: '456 Roswell Rd',
        city: 'Marietta',
        county: 'Cobb',
        state: 'GA',
        zip: '30062',
        latitude: 33.9526,
        longitude: -84.5499,
        acreage: 0.38,
        source: 'WHOLESALER',
        listPrice: 95000,
        status: 'NEW',
        overallScore: 7.1,
        schoolRating: 7.0,
        compScore: 7.5,
        marginEstimate: 0.19,
        scoreBreakdown: {
          school: 7.0,
          comps: 7.5,
          margin: 6.8,
          location: 7.1,
        },
      },
    }),
    prisma.lot.create({
      data: {
        organizationId: org.id,
        address: '789 Johnson Ferry Rd',
        city: 'Sandy Springs',
        county: 'Fulton',
        state: 'GA',
        zip: '30328',
        latitude: 33.9304,
        longitude: -84.3733,
        acreage: 0.52,
        source: 'MLS',
        sourceId: 'MLS-2024-003',
        listPrice: 185000,
        status: 'UNDER_CONTRACT',
        overallScore: 9.1,
        schoolRating: 9.2,
        compScore: 9.0,
        marginEstimate: 0.26,
        scoreBreakdown: {
          school: 9.2,
          comps: 9.0,
          margin: 9.1,
          location: 9.0,
        },
      },
    }),
  ]);
  console.log(`Created ${lots.length} lots`);

  // Create floor plan
  const floorPlan = await prisma.floorPlan.create({
    data: {
      name: 'The Peachtree - 4BR/3BA',
      sqft: 2400,
      beds: 4,
      baths: 3,
      stories: 2,
      garage: 2,
      baseCost: 280000,
    },
  });
  console.log(`Created floor plan: ${floorPlan.name}`);

  // Create a build
  const build = await prisma.build.create({
    data: {
      organizationId: org.id,
      lotId: lots[2].id,
      floorPlanId: floorPlan.id,
      landCost: 185000,
      budgetHard: 280000,
      budgetSoft: 35000,
      budgetTotal: 500000,
      actualHard: 42000,
      actualSoft: 8500,
      status: 'FOUNDATION',
      startDate: new Date('2026-02-15'),
      estimatedComplete: new Date('2026-08-15'),
      projectedSalePrice: 625000,
    },
  });
  console.log(`Created build for lot: ${lots[2].address}`);

  // Create subcontractors
  const subs = await Promise.all([
    prisma.subcontractor.create({
      data: {
        organizationId: org.id,
        companyName: 'Atlanta Concrete Pros',
        contactName: 'Mike Johnson',
        phone: '770-555-0101',
        email: 'mike@atlconcrete.com',
        trades: ['CONCRETE'],
        crewSize: 6,
        maxConcurrent: 2,
        serviceRadius: 30,
        reliabilityScore: 0.92,
        onTimeRate: 0.95,
        qualityRating: 0.88,
        responseRate: 0.90,
        totalJobs: 45,
        completedJobs: 43,
        status: 'PREFERRED',
        pricingTier: 'MARKET',
        w9OnFile: true,
      },
    }),
    prisma.subcontractor.create({
      data: {
        organizationId: org.id,
        companyName: 'Georgia Framing Co',
        contactName: 'Carlos Martinez',
        phone: '770-555-0202',
        email: 'carlos@gaframing.com',
        trades: ['FRAMING'],
        crewSize: 8,
        maxConcurrent: 3,
        serviceRadius: 40,
        reliabilityScore: 0.85,
        onTimeRate: 0.82,
        qualityRating: 0.90,
        responseRate: 0.88,
        totalJobs: 32,
        completedJobs: 30,
        status: 'APPROVED',
        pricingTier: 'MARKET',
        w9OnFile: true,
      },
    }),
    prisma.subcontractor.create({
      data: {
        organizationId: org.id,
        companyName: 'Peach State Electric',
        contactName: 'David Lee',
        phone: '770-555-0303',
        email: 'david@peachelectric.com',
        trades: ['ELECTRICAL'],
        crewSize: 4,
        maxConcurrent: 2,
        serviceRadius: 25,
        reliabilityScore: 0.78,
        onTimeRate: 0.75,
        qualityRating: 0.82,
        responseRate: 0.70,
        totalJobs: 18,
        completedJobs: 16,
        status: 'APPROVED',
        pricingTier: 'BUDGET',
        w9OnFile: true,
      },
    }),
    prisma.subcontractor.create({
      data: {
        organizationId: org.id,
        companyName: 'Southern Plumbing Solutions',
        contactName: 'James Wilson',
        phone: '770-555-0404',
        email: 'james@southernplumbing.com',
        trades: ['PLUMBING'],
        crewSize: 5,
        maxConcurrent: 2,
        serviceRadius: 35,
        reliabilityScore: 0.88,
        onTimeRate: 0.90,
        qualityRating: 0.85,
        responseRate: 0.92,
        totalJobs: 28,
        completedJobs: 27,
        status: 'PREFERRED',
        pricingTier: 'MARKET',
        w9OnFile: true,
      },
    }),
  ]);
  console.log(`Created ${subs.length} subcontractors`);

  // Create build tasks
  const tasks = await Promise.all([
    prisma.buildTask.create({
      data: {
        buildId: build.id,
        name: 'Site Clearing & Grading',
        phase: 'SITE_WORK',
        trade: 'EXCAVATION',
        scheduledStart: new Date('2026-02-15'),
        scheduledEnd: new Date('2026-02-18'),
        actualStart: new Date('2026-02-15'),
        actualEnd: new Date('2026-02-17'),
        duration: 3,
        status: 'COMPLETE',
        budgetAmount: 8500,
        actualAmount: 8200,
      },
    }),
    prisma.buildTask.create({
      data: {
        buildId: build.id,
        name: 'Foundation Pour',
        phase: 'FOUNDATION',
        trade: 'CONCRETE',
        subcontractorId: subs[0].id,
        scheduledStart: new Date('2026-02-20'),
        scheduledEnd: new Date('2026-02-28'),
        actualStart: new Date('2026-02-20'),
        duration: 7,
        status: 'IN_PROGRESS',
        budgetAmount: 25000,
        actualAmount: 12000,
      },
    }),
    prisma.buildTask.create({
      data: {
        buildId: build.id,
        name: 'Framing',
        phase: 'FRAMING',
        trade: 'FRAMING',
        subcontractorId: subs[1].id,
        scheduledStart: new Date('2026-03-10'),
        scheduledEnd: new Date('2026-03-28'),
        duration: 14,
        status: 'SCHEDULED',
        budgetAmount: 45000,
      },
    }),
    prisma.buildTask.create({
      data: {
        buildId: build.id,
        name: 'Rough Electrical',
        phase: 'ROUGH_INS',
        trade: 'ELECTRICAL',
        subcontractorId: subs[2].id,
        scheduledStart: new Date('2026-04-01'),
        scheduledEnd: new Date('2026-04-07'),
        duration: 5,
        status: 'NOT_STARTED',
        budgetAmount: 12000,
      },
    }),
    prisma.buildTask.create({
      data: {
        buildId: build.id,
        name: 'Rough Plumbing',
        phase: 'ROUGH_INS',
        trade: 'PLUMBING',
        subcontractorId: subs[3].id,
        scheduledStart: new Date('2026-04-01'),
        scheduledEnd: new Date('2026-04-07'),
        duration: 5,
        status: 'NOT_STARTED',
        budgetAmount: 15000,
      },
    }),
  ]);
  console.log(`Created ${tasks.length} build tasks`);

  // Create inspections
  await Promise.all([
    prisma.inspection.create({
      data: {
        buildId: build.id,
        type: 'FOOTING',
        jurisdiction: 'Fulton County',
        status: 'PASSED',
        result: 'PASS',
        passedAt: new Date('2026-02-19'),
        preAuditScore: 0.95,
      },
    }),
    prisma.inspection.create({
      data: {
        buildId: build.id,
        type: 'FOUNDATION',
        jurisdiction: 'Fulton County',
        scheduledDate: new Date('2026-03-05'),
        status: 'SCHEDULED',
        preAuditScore: 0.88,
        preAuditIssues: [
          { item: 'Anchor bolt spacing', severity: 'warning', recommendation: 'Verify 6ft max spacing per IRC R403.1.6' },
        ],
      },
    }),
  ]);
  console.log('Created inspections');

  // Create supplier
  await prisma.supplier.create({
    data: {
      organizationId: org.id,
      name: '84 Lumber - Alpharetta',
      category: 'LUMBER',
      contactName: 'Sarah Thompson',
      phone: '770-555-0501',
      email: 'sarah@84lumber.com',
      avgLeadTime: 3,
      onTimeRate: 0.92,
      qualityRating: 0.88,
      paymentTerms: 30,
    },
  });
  console.log('Created supplier');

  console.log('\nSeed complete! You can now use the app with:');
  console.log('  API: curl -H "Authorization: Bearer dev-token" http://localhost:3001/api/v1/lots');
  console.log('  Web: http://localhost:3000/dashboard');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
