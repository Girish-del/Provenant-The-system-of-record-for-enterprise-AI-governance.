/* eslint-disable no-console */
// Idempotent seed. Run as the OWNER role (DATABASE_URL=aegis superuser) so it can
// write the global content library and bypass RLS for demo-tenant rows:
//   DATABASE_URL=postgresql://aegis:aegis@localhost:5432/aegis \
//   DIRECT_URL=postgresql://aegis:aegis@localhost:5432/aegis \
//   pnpm --filter @aegis/db db:seed
import { prisma, forOrg } from './client';
import { frameworks, crosswalks, euAiActQuestionnaire } from '@aegis/content';

async function seedContent(): Promise<void> {
  for (const fw of frameworks) {
    const framework = await prisma.framework.upsert({
      where: { key: fw.key },
      create: { key: fw.key, name: fw.name, version: fw.version, description: fw.description },
      update: { name: fw.name, version: fw.version, description: fw.description },
    });
    for (const c of fw.controls) {
      await prisma.control.upsert({
        where: { frameworkId_code: { frameworkId: framework.id, code: c.code } },
        create: {
          frameworkId: framework.id,
          code: c.code,
          title: c.title,
          description: c.description,
          category: c.category,
        },
        update: { title: c.title, description: c.description, category: c.category },
      });
    }
  }

  for (const x of crosswalks) {
    const from = await prisma.control.findFirst({
      where: { code: x.fromCode, framework: { key: x.fromFramework } },
    });
    const to = await prisma.control.findFirst({
      where: { code: x.toCode, framework: { key: x.toFramework } },
    });
    if (from && to) {
      await prisma.controlCrosswalk.upsert({
        where: { fromControlId_toControlId: { fromControlId: from.id, toControlId: to.id } },
        create: { fromControlId: from.id, toControlId: to.id, relationship: x.relationship },
        update: { relationship: x.relationship },
      });
    }
  }

  const q = euAiActQuestionnaire;
  const framework = await prisma.framework.findUnique({ where: { key: q.framework } });
  const questionnaire = await prisma.questionnaire.upsert({
    where: { key: q.key },
    create: { key: q.key, name: q.name, version: q.version, frameworkId: framework?.id },
    update: { name: q.name, version: q.version, frameworkId: framework?.id },
  });
  // Questions are an ordered list; replace wholesale for idempotency.
  await prisma.question.deleteMany({ where: { questionnaireId: questionnaire.id } });
  for (const qq of q.questions) {
    await prisma.question.create({
      data: {
        questionnaireId: questionnaire.id,
        key: qq.key,
        order: qq.order,
        text: qq.text,
        type: qq.type,
        logic: qq.impliesTierWhenTrue ? { impliesTierWhenTrue: qq.impliesTierWhenTrue } : undefined,
      },
    });
  }
  console.log(
    `Content: ${frameworks.length} frameworks, ${crosswalks.length} crosswalks, 1 questionnaire (${q.questions.length} questions).`,
  );
}

async function seedDemoTenant(): Promise<void> {
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-acme' },
    create: { name: 'Acme Corp (demo)', slug: 'demo-acme', region: 'eu-central-1' },
    update: {},
  });
  const user = await prisma.user.upsert({
    where: { email: 'admin@acme.demo' },
    create: { email: 'admin@acme.demo', name: 'Demo Admin' },
    update: {},
  });

  await forOrg(org.id, async (tx) => {
    const membership = await tx.membership.findFirst({ where: { userId: user.id } });
    if (!membership) {
      await tx.membership.create({ data: { orgId: org.id, userId: user.id, role: 'ADMIN' } });
    }
    if ((await tx.useCase.count()) === 0) {
      await tx.useCase.createMany({
        data: [
          { orgId: org.id, name: 'Resume Screener', purpose: 'Rank job applicants', lifecycle: 'IN_PRODUCTION', riskTier: 'HIGH', ownerId: user.id },
          { orgId: org.id, name: 'Support Copilot', purpose: 'Assist support agents', lifecycle: 'IN_REVIEW', riskTier: 'LIMITED', ownerId: user.id },
          { orgId: org.id, name: 'Marketing Copy Gen', purpose: 'Generate marketing copy', lifecycle: 'IN_PRODUCTION', riskTier: 'MINIMAL', ownerId: user.id },
        ],
      });
    }
  });
  console.log(`Demo tenant: ${org.slug} (${org.id}), admin admin@acme.demo`);
}

async function main(): Promise<void> {
  await seedContent();
  await seedDemoTenant();
  console.log('Seed complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
