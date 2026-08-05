import logoSrc from "../assets/images/logo.png";

interface LogoProps {
  height?: number;
  className?: string;
  alt?: string;
}

export const Logo = ({ height = 32, className, alt = "Recoverpro" }: LogoProps) => (
  <img
    src={logoSrc}
    alt={alt}
    height={height}
    className={className}
    fetchPriority="high"
    style={{ height, width: "auto", display: "block" }}
  />
);
