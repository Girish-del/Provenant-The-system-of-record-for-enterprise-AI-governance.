export type CrosswalkRelationship = 'EQUIVALENT' | 'RELATED' | 'PARTIAL';

export interface FrameworkSummaryDto {
  id: string;
  key: string;
  name: string;
  version: string;
  description: string | null;
  controlCount: number;
}

export interface ControlDto {
  id: string;
  code: string;
  title: string;
  description: string | null;
  category: string | null;
}

export interface FrameworkDetailDto extends FrameworkSummaryDto {
  controls: ControlDto[];
}

export interface RelatedControlRef {
  id: string;
  code: string;
  title: string;
  framework: string;
}

export interface RelatedControlDto {
  relationship: CrosswalkRelationship;
  control: RelatedControlRef;
}

export interface CrosswalkResultDto {
  control: RelatedControlRef;
  related: RelatedControlDto[];
}
