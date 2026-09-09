import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 };

export const SearchIcon = (props: IconProps) => <svg {...base} {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
export const StarIcon = ({ filled, ...props }: IconProps & { filled?: boolean }) => <svg {...base} {...props} fill={filled ? "currentColor" : "none"}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>;
export const GridIcon = (props: IconProps) => <svg {...base} {...props}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
export const ChartIcon = (props: IconProps) => <svg {...base} {...props}><path d="M4 19V5M4 19h16" /><path d="m7 15 4-5 3 3 5-7" /></svg>;
export const BellIcon = (props: IconProps) => <svg {...base} {...props}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8ZM10 21h4" /></svg>;
export const ArrowIcon = (props: IconProps) => <svg {...base} {...props}><path d="m7 17 10-10M8 7h9v9" /></svg>;
export const MenuIcon = (props: IconProps) => <svg {...base} {...props}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;