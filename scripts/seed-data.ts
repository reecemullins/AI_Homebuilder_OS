import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: 'Demo Builder Inc.',
      type: 'OPERATOR',
      settings: {
        defaultState: 'GA',
        targetMarkets: ['Marietta', 'Alpharetta', 'Roswell', 'Kennesaw'],
      },
    },
  });

  console.log('Created organization:', org.id);

  // Create user
  const user = await prisma.user.create({
    data: {
      clerkId: 'demo_user_1',
      email: 'demo@builderos.com',
      name: 'John Demo',
      role: 'OWNER',
      organizationId: org.id,
    },
  });

  console.log('Created user:', user.id);

  // Create floor plans
  const floorPlans = await Promise.all([
    prisma.floorPlan.create({
      data: {
        name: 'Craftsman 2400',
        sqft: 2400,
        beds: 4,
        baths: 2.5,
        stories: 2,
        garage: 2,
        baseCost: 185000,
      },
    }),
    prisma.floorPlan.create({
      data: {
        name: 'Modern 2800',
        sqft: 2800,
        beds: 4,
        baths: 3,
        stories: 2,
        garage: 3,
        baseCost: 220000,
      },
    }),
    prisma.floorPlan.create({
      data: {
        name: 'Traditional 2200',
        sqft: 2200,
        beds: 3,
        baths: 2,
        stories: 1,
        garage: 2,
        baseCost: 165000,
      },
    }),
    prisma.floorPlan.create({
      data: {
        name: 'Ranch 1800',
        sqft: 1800,
        beds: 3,
        baths: 2,
        stories: 1,
        garage: 2,
        baseCost: 145000,
      },
    }),
  ]);

  console.log('Created floor plans:', floorPlans.length);

  // Create lots
  const lots = await Promise.all([
    prisma.lot.create({
      data: {
        organizationId: org.id,
        address: '123 Oak Street',
        city: 'Marietta',
        county: 'Cobb',
        state: 'GA',
        zip: '30060',
        latitude: 33.9526,
        longitude: -84.5499,
        acreage: 0.45,
        source: 'MLS',
        sourceId: 'MLS12345',
        listPrice: 75000,
        schoolRating: 8,
        zoningCompatible: true,
        utilities: { water: true, sewer: true, electric: true, gas: true },
        daysOnMarket: 14,
        overallScore: 85,
        status: 'PURCHASED',
      },
    }),
    prisma.lot.create({
      data: {
        organizationId: org.id,
        address: '456 Pine Avenue',
        city: 'Alpharetta',
        county: 'Fulton',
        state: 'GA',
        zip: '30009',
        latitude: 34.0754,
        longitude: -84.2941,
        acreage: 0.38,
        source: 'WHOLESALER',
        listPrice: 82000,
        schoolRating: 9,
        zoningCompatible: true,
        utilities: { water: true, sewer: true, electric: true, gas: true },
        daysOnMarket: 7,
        overallScore: 78,
        status: 'PURCHASED',
      },
    }),
    prisma.lot.create({
      data: {
        organizationId: org.id,
        address: '789 Elm Drive',
        city: 'Roswell',
        county: 'Fulton',
        state: 'GA',
        zip: '30075',
        latitude: 34.0232,
        longitude: -84.3616,
        acreage: 0.52,
        source: 'MLS',
        sourceId: 'MLS67890',
        listPrice: 68000,
        schoolRating: 7,
        zoningCompatible: true,
        utilities: { water: true, sewer: true, electric: true, gas: false },
        daysOnMarket: 45,
        overallScore: 72,
        status: 'PURCHASED',
      },
    }),
  ]);

  console.log('Created lots:', lots.length);

  // Create builds
  const builds = await Promise.all([
    prisma.build.create({
      data: {
        organizationId: org.id,
        lotId: lots[0].id,
        floorPlanId: floorPlans[0].id,
        landCost: 75000,
        budgetHard: 185000,
        budgetSoft: 20000,
        budgetTotal: 280000,
        actualHard: 64750,
        actualSoft: 7000,
        projectedSalePrice: 385000,
        status: 'FRAMING',
        startDate: new Date('2024-01-15'),
        estimatedComplete: new Date('2024-03-15'),
      },
    }),
    prisma.build.create({
      data: {
        organizationId: org.id,
        lotId: lots[1].id,
        floorPlanId: floorPlans[1].id,
        landCost: 82000,
        budgetHard: 220000,
        budgetSoft: 25000,
        budgetTotal: 327000,
        actualHard: 33000,
        actualSoft: 4000,
        projectedSalePrice: 450000,
        status: 'FOUNDATION',
        startDate: new Date('2024-02-01'),
        estimatedComplete: new Date('2024-04-20'),
      },
    }),
  ]);

  console.log('Created builds:', builds.length);

  // Create subcontractors
  const subs = await Promise.all([
    prisma.subcontractor.create({
      data: {
        organizationId: org.id,
        companyName: 'ABC Framing Co.',
        contactName: 'John Smith',
        phone: '(770) 555-0101',
        email: 'john@abcframing.com',
        trades: ['FRAMING'],
        crewSize: 6,
        maxConcurrent: 2,
        serviceRadius: 30,
        reliabilityScore: 0.92,
        onTimeRate: 0.95,
        qualityRating: 0.88,
        totalJobs: 24,
        completedJobs: 24,
        status: 'PREFERRED',
        w9OnFile: true,
      },
    }),
    prisma.subcontractor.create({
      data: {
        organizationId: org.id,
        companyName: 'Elite Electric',
        contactName: 'Mike Johnson',
        phone: '(770) 555-0202',
        email: 'mike@eliteelectric.com',
        trades: ['ELECTRICAL'],
        crewSize: 4,
        maxConcurrent: 3,
        serviceRadius: 40,
        reliabilityScore: 0.85,
        onTimeRate: 0.88,
        qualityRating: 0.90,
        totalJobs: 18,
        completedJobs: 18,
        status: 'APPROVED',
        w9OnFile: true,
      },
    }),
    prisma.subcontractor.create({
      data: {
        organizationId: org.id,
        companyName: 'Pro Plumbing Services',
        contactName: 'Dave Wilson',
        phone: '(770) 555-0303',
        email: 'dave@proplumbing.com',
        trades: ['PLUMBING'],
        crewSize: 3,
        maxConcurrent: 2,
        serviceRadius: 25,
        reliabilityScore: 0.78,
        onTimeRate: 0.75,
        qualityRating: 0.82,
        totalJobs: 12,
        completedJobs: 12,
        status: 'APPROVED',
        w9OnFile: true,
      },
    }),
    prisma.subcontractor.create({
      data: {
        organizationId: org.id,
        companyName: 'Cool Air HVAC',
        contactName: 'Tom Brown',
        phone: '(770) 555-0404',
        email: 'tom@coolairhvac.com',
        trades: ['HVAC'],
        crewSize: 4,
        maxConcurrent: 2,
        serviceRadius: 35,
        reliabilityScore: 0.88,
        onTimeRate: 0.92,
        qualityRating: 0.85,
        totalJobs: 15,
        completedJobs: 15,
        status: 'PREFERRED',
        w9OnFile: true,
      },
    }),
  ]);

  console.log('Created subcontractors:', subs.length);

  // Create suppliers
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        organizationId: org.id,
        name: 'BuildPro Lumber',
        category: 'LUMBER',
        contactName: 'Sales Team',
        phone: '(770) 555-1000',
        email: 'sales@buildprolumber.com',
        avgLeadTime: 3,
        onTimeRate: 0.92,
        qualityRating: 0.88,
        paymentTerms: 30,
        creditLimit: 50000,
        volumeDiscounts: [
          { threshold: 10000, discountPct: 3 },
          { threshold: 25000, discountPct: 5 },
          { threshold: 50000, discountPct: 8 },
        ],
      },
    }),
    prisma.supplier.create({
      data: {
        organizationId: org.id,
        name: 'Metro Concrete Supply',
        category: 'CONCRETE',
        contactName: 'Dispatch',
        phone: '(770) 555-2000',
        email: 'dispatch@metroconcrete.com',
        avgLeadTime: 1,
        onTimeRate: 0.95,
        qualityRating: 0.90,
        paymentTerms: 15,
      },
    }),
  ]);

  console.log('Created suppliers:', suppliers.length);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
