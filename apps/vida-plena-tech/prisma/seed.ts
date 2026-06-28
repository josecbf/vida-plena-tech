/**
 * Seed da demo Vida Plena Tech.
 *
 * Cria 1 tenant, 2 campus, a hierarquia de liderança, 4 GCs, 30 pessoas
 * (visitantes/frequentadores/membros), algumas famílias, batismos/TD,
 * 3 eventos e encontros de GC com presenças variadas.
 *
 * Idempotente: limpa as tabelas antes de semear. Rode com `pnpm db:seed`.
 */
import {
  PrismaClient,
  EclesiasticalStatus,
  RoleKey,
  ScopeType,
  Sex,
  ContactType,
  AttendanceStatus,
  LeadershipUnitType,
  LeadershipMemberRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo1234";

// Gera CPFs válidos e únicos de forma determinística (dígitos verificadores
// corretos). Evita violar a unique (tenantId, cpf) no seed.
function generateCpf(seq: number): string {
  const base = String(100000000 + seq).slice(-9); // 9 dígitos
  const digit = (nums: string, startWeight: number) => {
    let sum = 0;
    for (let i = 0; i < nums.length; i++) sum += parseInt(nums[i]) * (startWeight - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = digit(base, 10);
  const d2 = digit(base + d1, 11);
  return `${base}${d1}${d2}`;
}

async function clear() {
  // Ordem respeitando FKs.
  await prisma.growthGroupAttendance.deleteMany();
  await prisma.growthGroupMeeting.deleteMany();
  await prisma.growthGroupInviteLink.deleteMany();
  await prisma.growthGroupMembership.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.timelineEntry.deleteMany();
  await prisma.personStatusHistory.deleteMany();
  await prisma.pastoralNote.deleteMany();
  await prisma.consentRecord.deleteMany();
  await prisma.contactMethod.deleteMany();
  await prisma.address.deleteMany();
  await prisma.householdMember.deleteMany();
  await prisma.household.deleteMany();
  await prisma.externalMapping.deleteMany();
  await prisma.importBatchItem.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.domainEvent.deleteMany();
  await prisma.domainEventOutbox.deleteMany();
  await prisma.roleAssignment.deleteMany();
  await prisma.tenantMembership.deleteMany();
  await prisma.leadershipUnitMember.deleteMany();
  await prisma.leadershipUnit.deleteMany();
  await prisma.growthGroup.deleteMany();
  await prisma.person.deleteMany();
  await prisma.moduleSubscription.deleteMany();
  await prisma.campus.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

async function main() {
  console.log("Limpando dados anteriores…");
  await clear();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Criando tenant e campus…");
  const tenant = await prisma.tenant.create({
    data: {
      slug: "vida-plena",
      name: "Comunidade Vida Plena",
      tagline: "uma igreja que se importa",
    },
  });

  for (const key of ["people", "groups", "events"]) {
    await prisma.moduleSubscription.create({
      data: { tenantId: tenant.id, moduleKey: key, active: true },
    });
  }
  await prisma.moduleSubscription.create({
    data: { tenantId: tenant.id, moduleKey: "teaching", active: false },
  });

  const sede = await prisma.campus.create({
    data: { tenantId: tenant.id, name: "Sede", city: "São Paulo" },
  });
  const zonaSul = await prisma.campus.create({
    data: { tenantId: tenant.id, name: "Zona Sul", city: "São Paulo" },
  });

  // ── Helpers ────────────────────────────────────────────────────────────
  let cpfIdx = 0;
  const nextCpf = () => generateCpf(cpfIdx++);

  async function createPerson(opts: {
    fullName: string;
    status: EclesiasticalStatus;
    campusId: string;
    sex?: Sex;
    cpf?: string | null;
    email?: string;
    phone?: string;
    baptized?: boolean;
    td?: boolean;
    birthYear?: number;
  }) {
    const p = await prisma.person.create({
      data: {
        tenantId: tenant.id,
        campusId: opts.campusId,
        fullName: opts.fullName,
        status: opts.status,
        sex: opts.sex,
        cpf: opts.cpf ?? null,
        birthDate: opts.birthYear ? new Date(`${opts.birthYear}-05-15`) : null,
        isBaptized: !!opts.baptized,
        baptismDate: opts.baptized ? new Date("2019-04-21") : null,
        hasTD: !!opts.td,
        tdDate: opts.td ? new Date("2021-08-10") : null,
        source: "ADMIN_CREATED",
      },
    });
    if (opts.email)
      await prisma.contactMethod.create({
        data: { tenantId: tenant.id, personId: p.id, type: ContactType.EMAIL, value: opts.email, isPrimary: true },
      });
    if (opts.phone)
      await prisma.contactMethod.create({
        data: { tenantId: tenant.id, personId: p.id, type: ContactType.WHATSAPP, value: opts.phone },
      });
    await prisma.personStatusHistory.create({
      data: { tenantId: tenant.id, personId: p.id, toStatus: opts.status, reason: "Seed" },
    });
    await prisma.timelineEntry.create({
      data: { tenantId: tenant.id, personId: p.id, type: "PERSON_CREATED", title: "Cadastro criado" },
    });
    return p;
  }

  async function createUser(opts: {
    email: string;
    name: string;
    role: RoleKey;
    scopeType?: ScopeType;
    scopeId?: string;
    personId?: string;
  }) {
    const user = await prisma.user.create({
      data: { email: opts.email, name: opts.name, passwordHash },
    });
    const membership = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        personId: opts.personId ?? null,
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });
    await prisma.roleAssignment.create({
      data: {
        tenantId: tenant.id,
        membershipId: membership.id,
        role: opts.role,
        scopeType: opts.scopeType ?? "TENANT",
        scopeId: opts.scopeId ?? null,
      },
    });
    return membership;
  }

  // ── Liderança (pessoas + logins) ───────────────────────────────────────
  console.log("Criando hierarquia de liderança…");

  // Pastores (também são pessoas)
  const seniorPerson = await createPerson({
    fullName: "Pr. Daniel Souza",
    status: "MEMBER",
    campusId: sede.id,
    sex: "MALE",
    cpf: nextCpf(),
    email: "senior@vidaplena.org",
    baptized: true,
    td: true,
    birthYear: 1975,
  });
  const areaPastorPerson = await createPerson({
    fullName: "Pra. Marta Ribeiro",
    status: "MEMBER",
    campusId: sede.id,
    sex: "FEMALE",
    cpf: nextCpf(),
    email: "pastor@vidaplena.org",
    baptized: true,
    td: true,
    birthYear: 1980,
  });
  const coordPerson = await createPerson({
    fullName: "Carlos Mendes",
    status: "MEMBER",
    campusId: sede.id,
    sex: "MALE",
    cpf: nextCpf(),
    email: "coordenador@vidaplena.org",
    baptized: true,
    td: true,
    birthYear: 1985,
  });
  const sup1Person = await createPerson({
    fullName: "Juliana Castro",
    status: "MEMBER",
    campusId: sede.id,
    sex: "FEMALE",
    cpf: nextCpf(),
    email: "supervisor@vidaplena.org",
    baptized: true,
    td: true,
    birthYear: 1988,
  });
  const sup2Person = await createPerson({
    fullName: "Rafael Lima",
    status: "MEMBER",
    campusId: zonaSul.id,
    sex: "MALE",
    cpf: nextCpf(),
    email: "supervisor2@vidaplena.org",
    baptized: true,
    birthYear: 1986,
  });

  // Logins de liderança
  const adminUser = await prisma.user.create({
    data: { email: "admin@vidaplena.org", name: "Administração", passwordHash },
  });
  const adminMembership = await prisma.tenantMembership.create({
    data: { tenantId: tenant.id, userId: adminUser.id, status: "ACTIVE", acceptedAt: new Date() },
  });
  await prisma.roleAssignment.create({
    data: { tenantId: tenant.id, membershipId: adminMembership.id, role: "ADMIN", scopeType: "TENANT" },
  });

  await createUser({
    email: "senior@vidaplena.org",
    name: "Pr. Daniel Souza",
    role: "SENIOR_PASTOR",
    personId: seniorPerson.id,
  });
  const areaPastorM = await createUser({
    email: "pastor@vidaplena.org",
    name: "Pra. Marta Ribeiro",
    role: "AREA_PASTOR",
    scopeType: "AREA",
    personId: areaPastorPerson.id,
  });
  const coordM = await createUser({
    email: "coordenador@vidaplena.org",
    name: "Carlos Mendes",
    role: "COORDINATOR",
    scopeType: "SUPERVISION",
    personId: coordPerson.id,
  });
  const sup1M = await createUser({
    email: "supervisor@vidaplena.org",
    name: "Juliana Castro",
    role: "SUPERVISOR",
    scopeType: "SUPERVISION",
    personId: sup1Person.id,
  });
  const sup2M = await createUser({
    email: "supervisor2@vidaplena.org",
    name: "Rafael Lima",
    role: "SUPERVISOR",
    scopeType: "SUPERVISION",
    personId: sup2Person.id,
  });

  // 4 líderes de GC (pessoas + logins). O primeiro é o "lider@" das credenciais.
  const leaderNames = [
    "Ana Beatriz Gomes",
    "Pedro Henrique Alves",
    "Larissa Fernandes",
    "Tiago Oliveira",
  ];
  const leaders = [];
  for (let i = 0; i < 4; i++) {
    const lp = await createPerson({
      fullName: leaderNames[i],
      status: "MEMBER",
      campusId: i < 2 ? sede.id : zonaSul.id,
      sex: i % 2 === 0 ? "FEMALE" : "MALE",
      cpf: nextCpf(),
      email: i === 0 ? "lider@vidaplena.org" : `lider${i + 1}@vidaplena.org`,
      baptized: true,
      td: true,
      birthYear: 1990 + i,
    });
    await createUser({
      email: i === 0 ? "lider@vidaplena.org" : `lider${i + 1}@vidaplena.org`,
      name: leaderNames[i],
      role: "GC_LEADER",
      scopeType: "GC",
      personId: lp.id,
    });
    leaders.push(lp);
  }

  // ── GCs ────────────────────────────────────────────────────────────────
  console.log("Criando GCs…");
  const gcDefs = [
    { name: "GC Graça", campus: sede.id, leader: 0, sup: sup1M, weekday: 2, time: "20:00" },
    { name: "GC Esperança", campus: sede.id, leader: 1, sup: sup1M, weekday: 3, time: "20:00" },
    { name: "GC Aliança", campus: zonaSul.id, leader: 2, sup: sup2M, weekday: 4, time: "19:30" },
    { name: "GC Restauração", campus: zonaSul.id, leader: 3, sup: sup2M, weekday: 5, time: "20:00" },
  ];
  // LeadershipUnit (backfill aditivo): unidades de supervisão/coordenação
  // reusadas pelos GCs; a unidade de liderança é criada por GC no loop.
  // Os campos legados (leaderId/supervisorId/...) seguem preenchidos.
  async function createUnit(
    name: string,
    type: LeadershipUnitType,
    members: { personId: string; role: LeadershipMemberRole }[],
  ) {
    const u = await prisma.leadershipUnit.create({ data: { tenantId: tenant.id, name, type } });
    for (const m of members) {
      await prisma.leadershipUnitMember.create({
        data: { tenantId: tenant.id, leadershipUnitId: u.id, personId: m.personId, role: m.role },
      });
    }
    return u;
  }
  const coordUnit = await createUnit(coordPerson.fullName, "INDIVIDUAL", [{ personId: coordPerson.id, role: "PRIMARY" }]);
  const sup1Unit = await createUnit(sup1Person.fullName, "INDIVIDUAL", [{ personId: sup1Person.id, role: "PRIMARY" }]);
  const sup2Unit = await createUnit(sup2Person.fullName, "INDIVIDUAL", [{ personId: sup2Person.id, role: "PRIMARY" }]);

  const gcs = [];
  for (const def of gcDefs) {
    const leaderPerson = leaders[def.leader];
    const leadUnit = await createUnit(leaderPerson.fullName, "INDIVIDUAL", [{ personId: leaderPerson.id, role: "PRIMARY" }]);
    const gc = await prisma.growthGroup.create({
      data: {
        tenantId: tenant.id,
        campusId: def.campus,
        name: def.name,
        // campos legados (compatibilidade da demo)
        leaderId: leaders[def.leader].id,
        supervisorId: def.sup.id,
        coordinatorId: coordM.id,
        areaPastorId: areaPastorM.id,
        // novas unidades de liderança
        leadershipUnitId: leadUnit.id,
        supervisionUnitId: def.sup === sup1M ? sup1Unit.id : sup2Unit.id,
        coordinationUnitId: coordUnit.id,
        areaPastorUnitId: null, // export real não traz pastor de área
        weekday: def.weekday,
        time: def.time,
        location: "Casa do líder",
        active: true,
      },
    });
    // líder também é membro do próprio GC
    await prisma.growthGroupMembership.create({
      data: { tenantId: tenant.id, gcId: gc.id, personId: leaders[def.leader].id },
    });
    await prisma.person.update({
      where: { id: leaders[def.leader].id },
      data: { primaryGcId: gc.id },
    });
    gcs.push(gc);
  }

  // Link de convite para o primeiro GC (para demonstrar /cadastro/gc/[token])
  await prisma.growthGroupInviteLink.create({
    data: { tenantId: tenant.id, gcId: gcs[0].id, token: "gc-graca-demo" },
  });

  // ── Demais pessoas (até completar 30) ──────────────────────────────────
  console.log("Criando membros, frequentadores e visitantes…");
  // Já temos: senior, areaPastor, coord, sup1, sup2 (5) + 4 líderes = 9 pessoas.
  // Faltam 21 para chegar a 30.
  const firstNames = [
    "Mariana", "João", "Beatriz", "Lucas", "Camila", "Gabriel", "Fernanda",
    "Mateus", "Patrícia", "Rodrigo", "Aline", "Bruno", "Sofia", "Felipe",
    "Carla", "Diego", "Helena", "Vitor", "Isabela", "André", "Renata",
  ];
  const lastNames = [
    "Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira", "Almeida",
    "Nunes", "Carvalho", "Rocha", "Dias", "Teixeira", "Moreira", "Barbosa",
  ];

  const membro: { personId: string } = { personId: "" };
  for (let i = 0; i < firstNames.length; i++) {
    const name = `${firstNames[i]} ${lastNames[i % lastNames.length]}`;
    // distribuição de status: alguns membros, frequentadores, visitantes
    let status: EclesiasticalStatus;
    let gcIndex: number | null;
    let cpf: string | null = null;
    if (i < 12) {
      status = "MEMBER";
      gcIndex = i % 4;
      cpf = nextCpf();
    } else if (i < 17) {
      status = "REGULAR_ATTENDER";
      gcIndex = i % 4;
    } else {
      status = "VISITOR";
      gcIndex = null; // visitantes sem GC
    }

    const campusId = gcIndex != null ? gcDefs[gcIndex].campus : sede.id;
    const p = await createPerson({
      fullName: name,
      status,
      campusId,
      sex: i % 2 === 0 ? "FEMALE" : "MALE",
      cpf,
      phone: `1199999${String(1000 + i).slice(-4)}`,
      baptized: status === "MEMBER",
      td: status === "MEMBER" && i % 2 === 0,
      birthYear: 1992 + (i % 20),
    });

    if (gcIndex != null) {
      await prisma.growthGroupMembership.create({
        data: { tenantId: tenant.id, gcId: gcs[gcIndex].id, personId: p.id },
      });
      await prisma.person.update({ where: { id: p.id }, data: { primaryGcId: gcs[gcIndex].id } });
    }

    // guarda o primeiro membro do GC Graça para o login "membro@"
    if (i === 0) membro.personId = p.id;
  }

  // Login de membro comum, vinculado a uma pessoa do GC Graça
  await createUser({
    email: "membro@vidaplena.org",
    name: firstNames[0] + " " + lastNames[0],
    role: "MEMBER",
    personId: membro.personId,
  });

  // ── Família (exemplo) ──────────────────────────────────────────────────
  console.log("Criando uma família de exemplo…");
  const casalA = await createPerson({
    fullName: "Marcos Vieira", status: "MEMBER", campusId: sede.id, sex: "MALE",
    cpf: nextCpf(), baptized: true, td: true, birthYear: 1983,
  });
  const casalB = await createPerson({
    fullName: "Sandra Vieira", status: "MEMBER", campusId: sede.id, sex: "FEMALE",
    cpf: nextCpf(), baptized: true, birthYear: 1985,
  });
  const filho = await createPerson({
    fullName: "Lucas Vieira", status: "REGULAR_ATTENDER", campusId: sede.id, sex: "MALE",
    birthYear: 2012,
  });
  // vincula casal ao GC Graça
  for (const pid of [casalA.id, casalB.id]) {
    await prisma.growthGroupMembership.create({ data: { tenantId: tenant.id, gcId: gcs[0].id, personId: pid } });
    await prisma.person.update({ where: { id: pid }, data: { primaryGcId: gcs[0].id } });
  }
  const household = await prisma.household.create({
    data: { tenantId: tenant.id, name: "Família Vieira" },
  });
  await prisma.householdMember.createMany({
    data: [
      { tenantId: tenant.id, householdId: household.id, personId: casalA.id, relationship: "SPOUSE" },
      { tenantId: tenant.id, householdId: household.id, personId: casalB.id, relationship: "SPOUSE" },
      { tenantId: tenant.id, householdId: household.id, personId: filho.id, relationship: "CHILD" },
    ],
  });

  // Uma observação pastoral de exemplo (confidencial)
  await prisma.pastoralNote.create({
    data: {
      tenantId: tenant.id,
      personId: casalA.id,
      body: "Família passando por dificuldade financeira; acompanhar com discrição.",
      authorUserId: null,
    },
  });

  // ── Encontros + presenças ──────────────────────────────────────────────
  console.log("Criando encontros e presenças…");
  const today = new Date("2026-06-20");
  for (const gc of gcs) {
    const members = await prisma.growthGroupMembership.findMany({
      where: { tenantId: tenant.id, gcId: gc.id, leftAt: null },
    });
    for (let w = 0; w < 3; w++) {
      const date = new Date(today);
      date.setDate(date.getDate() - w * 7);
      const meeting = await prisma.growthGroupMeeting.create({
        data: {
          tenantId: tenant.id,
          gcId: gc.id,
          date,
          happened: true,
          notes: w === 0 ? "Bom encontro, boa participação." : null,
        },
      });
      // presença variada (determinística)
      for (let mi = 0; mi < members.length; mi++) {
        const status: AttendanceStatus =
          (mi + w) % 4 === 0 ? "ABSENT" : (mi + w) % 5 === 0 ? "JUSTIFIED" : "PRESENT";
        await prisma.growthGroupAttendance.create({
          data: { tenantId: tenant.id, meetingId: meeting.id, personId: members[mi].personId, status },
        });
      }
      // 1 visitante no encontro mais recente
      if (w === 0) {
        await prisma.growthGroupAttendance.create({
          data: { tenantId: tenant.id, meetingId: meeting.id, visitorName: "Visitante convidado", status: "VISITOR" },
        });
      }
    }
  }

  // ── Eventos ────────────────────────────────────────────────────────────
  console.log("Criando eventos…");
  const ev1 = await prisma.event.create({
    data: {
      tenantId: tenant.id, campusId: sede.id, title: "Conferência de Famílias 2026",
      description: "Um dia inteiro com ensino e comunhão para toda a família.",
      location: "Auditório Sede", startsAt: new Date("2026-07-12T09:00:00"),
      endsAt: new Date("2026-07-12T17:00:00"), status: "PUBLISHED", visibility: "PUBLIC",
    },
  });
  const ev2 = await prisma.event.create({
    data: {
      tenantId: tenant.id, campusId: zonaSul.id, title: "Encontro de Líderes",
      description: "Treinamento e alinhamento da liderança de GCs.",
      location: "Campus Zona Sul", startsAt: new Date("2026-06-28T19:00:00"),
      status: "PUBLISHED", visibility: "MEMBERS",
    },
  });
  await prisma.event.create({
    data: {
      tenantId: tenant.id, title: "Retiro de Jovens (rascunho)",
      description: "Em planejamento.", startsAt: new Date("2026-09-05T18:00:00"),
      status: "DRAFT", visibility: "INTERNAL",
    },
  });

  // Algumas inscrições
  const someMembers = await prisma.person.findMany({
    where: { tenantId: tenant.id, status: "MEMBER" }, take: 6,
  });
  for (const m of someMembers.slice(0, 5)) {
    await prisma.eventRegistration.create({
      data: { tenantId: tenant.id, eventId: ev1.id, personId: m.id, status: "CONFIRMED" },
    });
    await prisma.timelineEntry.create({
      data: { tenantId: tenant.id, personId: m.id, type: "EVENT_REGISTRATION", title: `Inscrição em ${ev1.title}` },
    });
  }
  for (const l of leaders) {
    await prisma.eventRegistration.create({
      data: { tenantId: tenant.id, eventId: ev2.id, personId: l.id, status: "CONFIRMED" },
    });
  }

  const totalPeople = await prisma.person.count({ where: { tenantId: tenant.id } });
  console.log(`✓ Seed concluído. Pessoas: ${totalPeople}, GCs: ${gcs.length}.`);
  console.log(`  Senha de todos os logins de demo: ${DEMO_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
