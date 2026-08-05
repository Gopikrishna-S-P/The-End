import type { ElementType, ComponentPropsWithoutRef } from 'react';

type HoverCardProps<T extends ElementType = 'div'> = {
  as?: T;
  flat?: boolean;
  padded?: boolean;
} & ComponentPropsWithoutRef<T>;

export function HoverCard<T extends ElementType = 'div'>({
  as,
  flat,
  padded,
  className = '',
  children,
  ...rest
}: HoverCardProps<T>) {
  const Tag = (as ?? 'div') as ElementType;
  const cls = [
    'ds-card',
    'is-hoverable',
    flat    ? 'is-flat'    : '',
    padded  ? 'is-pad'     : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}
