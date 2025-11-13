export const PACKAGING_FILTER_VALUES = [
  "small-pack",
  "bucket",
  "package",
  "bulk",
] as const;

export type PackagingFilterValue =
  (typeof PACKAGING_FILTER_VALUES)[number];
