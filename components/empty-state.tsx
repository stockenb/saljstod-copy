export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-20 text-neutral-500">
      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">{title}</h3>
      {description && <p className="mt-2 text-sm">{description}</p>}
    </div>
  );
}
