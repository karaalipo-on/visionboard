import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const Icon = ({ children, ...props }: IconProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

export const SparkleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3l1.6 4.5L18 9.2l-4.4 1.7L12 15.5l-1.6-4.6L6 9.2l4.4-1.7L12 3z" />
    <path d="M19 14l.8 2.1L22 17l-2.2.9L19 20l-.8-2.1L16 17l2.2-.9L19 14z" />
    <path d="M5 15l.7 1.8 1.8.7-1.8.7L5 20l-.7-1.8-1.8-.7 1.8-.7L5 15z" />
  </Icon>
);

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Icon>
);

export const BoardIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M8 9h8" />
    <path d="M8 13h5" />
    <path d="M8 17h7" />
  </Icon>
);

export const ImageIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="5" width="17" height="14" rx="3" />
    <path d="M8 11a1.7 1.7 0 100-3.4A1.7 1.7 0 008 11z" />
    <path d="M20 16l-4.5-4.5L9 18" />
  </Icon>
);

export const UploadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 16V4" />
    <path d="M7.5 8.5L12 4l4.5 4.5" />
    <path d="M5 16v2.2A1.8 1.8 0 006.8 20h10.4a1.8 1.8 0 001.8-1.8V16" />
  </Icon>
);

export const QuoteIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 7H6.8C5.2 7 4 8.2 4 9.8V17h5v-5H7.2v-1.8c0-.8.4-1.2 1.2-1.2H9V7z" />
    <path d="M20 7h-2.2C16.2 7 15 8.2 15 9.8V17h5v-5h-1.8v-1.8c0-.8.4-1.2 1.2-1.2h.6V7z" />
  </Icon>
);

export const LinkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10 13.5l4-4" />
    <path d="M8.5 10.5L7 12a4 4 0 105.7 5.7l1.5-1.5" />
    <path d="M15.5 13.5L17 12a4 4 0 00-5.7-5.7L9.8 7.8" />
  </Icon>
);

export const TrashIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 7h14" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M8 7l.7-2h6.6l.7 2" />
    <path d="M7 7l.8 13h8.4L17 7" />
  </Icon>
);

export const DownloadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 4v10" />
    <path d="M8 10l4 4 4-4" />
    <path d="M5 19h14" />
  </Icon>
);

export const ImportIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 20V10" />
    <path d="M8 14l4-4 4 4" />
    <path d="M5 5h14" />
  </Icon>
);

export const LockIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="5" y="10" width="14" height="10" rx="3" />
    <path d="M8 10V8a4 4 0 018 0v2" />
  </Icon>
);

export const XIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </Icon>
);

export const PaletteIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 4a8 8 0 000 16h1.2a1.8 1.8 0 001.2-3.1 1.8 1.8 0 011.2-3.1H18a6 6 0 00-6-9.8z" />
    <path d="M7.8 11.2h.01" />
    <path d="M10.3 8.4h.01" />
    <path d="M14 8.5h.01" />
  </Icon>
);
