import lucienLogo from '../assets/images/lucien-logo.png';

interface Props { size?: number; 'aria-hidden'?: boolean | 'true' | 'false'; }

export default function LucienIcon({ size = 18 }: Props) {
  return (
    <img
      src={lucienLogo}
      alt=""
      aria-hidden="true"
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  );
}
