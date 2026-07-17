import BrandedLoader from './BrandedLoader';
import './Skeleton.css';

export interface SkeletonProps {
  variant?: 'text' | 'title' | 'circle' | 'rect' | 'pill';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = 'rect', width, height, className,
}: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width  !== undefined) style.width  = typeof width  === 'number' ? `${width}px`  : width;
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;
  return (
    <span
      className={`app-skel app-skel-${variant}${className ? ' ' + className : ''}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export default function PageSkeleton() {
  return <BrandedLoader variant="fullbleed" label="Loading" />;
}
