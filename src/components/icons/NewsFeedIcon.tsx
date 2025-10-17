interface NewsFeedIconProps {
  size?: number;
  className?: string;
  filled?: boolean;
}

export default function NewsFeedIcon({
  size = 24,
  className = "",
  filled = false,
}: NewsFeedIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"
        stroke={filled ? "black" : "#757575"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 7H17"
        stroke={filled ? "black" : "#757575"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 11H17"
        stroke={filled ? "black" : "#757575"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 15H13"
        stroke={filled ? "black" : "#757575"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
