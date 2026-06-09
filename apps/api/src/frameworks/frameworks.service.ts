import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@aegis/db';
import type {
  FrameworkSummaryDto,
  FrameworkDetailDto,
  CrosswalkResultDto,
  RelatedControlDto,
} from '@aegis/contracts';

/**
 * Read access to the global content library (frameworks, controls, crosswalks).
 * These tables are not org-scoped, so queries use the plain client (no forOrg);
 * the app role has SELECT but not write (enforced in rls.sql).
 */
@Injectable()
export class FrameworksService {
  async listFrameworks(): Promise<FrameworkSummaryDto[]> {
    const frameworks = await prisma.framework.findMany({
      orderBy: { key: 'asc' },
      include: { _count: { select: { controls: true } } },
    });
    return frameworks.map((f) => ({
      id: f.id,
      key: f.key,
      name: f.name,
      version: f.version,
      description: f.description,
      controlCount: f._count.controls,
    }));
  }

  async getFramework(key: string): Promise<FrameworkDetailDto> {
    const framework = await prisma.framework.findUnique({
      where: { key },
      include: { controls: { orderBy: { code: 'asc' } }, _count: { select: { controls: true } } },
    });
    if (!framework) {
      throw new NotFoundException('framework not found');
    }
    return {
      id: framework.id,
      key: framework.key,
      name: framework.name,
      version: framework.version,
      description: framework.description,
      controlCount: framework._count.controls,
      controls: framework.controls.map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        description: c.description,
        category: c.category,
      })),
    };
  }

  async crosswalksForControl(controlId: string): Promise<CrosswalkResultDto> {
    const control = await prisma.control.findUnique({
      where: { id: controlId },
      include: { framework: true },
    });
    if (!control) {
      throw new NotFoundException('control not found');
    }
    const links = await prisma.controlCrosswalk.findMany({
      where: { OR: [{ fromControlId: controlId }, { toControlId: controlId }] },
      include: {
        fromControl: { include: { framework: true } },
        toControl: { include: { framework: true } },
      },
    });
    const related: RelatedControlDto[] = links.map((link) => {
      const other = link.fromControlId === controlId ? link.toControl : link.fromControl;
      return {
        relationship: link.relationship,
        control: {
          id: other.id,
          code: other.code,
          title: other.title,
          framework: other.framework.key,
        },
      };
    });
    return {
      control: {
        id: control.id,
        code: control.code,
        title: control.title,
        framework: control.framework.key,
      },
      related,
    };
  }
}
