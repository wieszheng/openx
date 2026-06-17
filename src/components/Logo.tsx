export const Logo = ({ className = "h-8 w-8" }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(45 50 50)" strokeWidth="7" />
      <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(-45 50 50)" strokeWidth="7" />
    </svg>
  );
};
