import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  FileText,
  Send,
  Bell,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Globe,
  MessageCircle,
  Twitter,
  BarChart3,
  RefreshCw,
  Calendar,
  Activity,
  MoreHorizontal,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Move,
  X,
} from "lucide-react";

// Enhanced Interactive Chart Component
interface PricePoint {
  timestamp: number;
  price: number;
  date: string;
  time: string;
}

interface ChartData {
  prices: PricePoint[];
  timeframe: number;
}

interface EnhancedChartProps {
  chartData: ChartData | null;
  tokenSymbol: string;
  currentPrice?: number;
  priceChange24h?: number;
  isLoading?: boolean;
  className?: string;
}

const EnhancedInteractiveChart: React.FC<EnhancedChartProps> = ({
  chartData,
  tokenSymbol,
  currentPrice,
  priceChange24h = 0,
  isLoading = false,
  className = "",
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  // Dynamic responsive sizing
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.max(300, rect.width - 32);
      const height = isFullscreen
        ? 600
        : Math.min(500, Math.max(250, width * 0.5));
      setDimensions({ width, height });
    }
  }, [isFullscreen]);

  useEffect(() => {
    updateDimensions();
    const handleResize = () => updateDimensions();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateDimensions]);

  // Responsive padding based on screen size
  const padding = useMemo(() => {
    const isMobile = dimensions.width < 500;
    return {
      top: 30,
      right: isMobile ? 60 : 80,
      bottom: isMobile ? 50 : 60,
      left: isMobile ? 60 : 80,
    };
  }, [dimensions.width]);

  const innerWidth = dimensions.width - padding.left - padding.right;
  const innerHeight = dimensions.height - padding.top - padding.bottom;

  // Enhanced price calculation with better scaling
  const priceData = useMemo(() => {
    if (!chartData?.prices || chartData.prices.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 0,
        priceRange: 0,
        prices: [],
        scaledPoints: [],
      };
    }

    const prices = chartData.prices;
    const priceValues = prices.map((p) => p.price);
    const rawMin = Math.min(...priceValues);
    const rawMax = Math.max(...priceValues);
    const rawRange = rawMax - rawMin || 1;

    // Add 8% padding for better visualization
    const paddingPercent = 0.08;
    const minPrice = rawMin - rawRange * paddingPercent;
    const maxPrice = rawMax + rawRange * paddingPercent;
    const priceRange = maxPrice - minPrice;

    // Generate high-precision scaled points
    const scaledPoints = prices.map((point, index) => {
      const xProgress = prices.length > 1 ? index / (prices.length - 1) : 0;
      const x = xProgress * innerWidth;
      const yProgress = (point.price - minPrice) / priceRange;
      const y = innerHeight - yProgress * innerHeight;

      return {
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        ...point,
      };
    });

    return {
      minPrice,
      maxPrice,
      priceRange,
      prices,
      scaledPoints,
    };
  }, [chartData, innerWidth, innerHeight]);

  // Smooth curve generation using Catmull-Rom splines
  const pathData = useMemo(() => {
    if (priceData.scaledPoints.length === 0) return "";

    const points = priceData.scaledPoints;

    if (points.length === 1) {
      return `M ${points[0].x + padding.left} ${points[0].y + padding.top}`;
    }

    if (points.length === 2) {
      return `M ${points[0].x + padding.left} ${points[0].y + padding.top} L ${
        points[1].x + padding.left
      } ${points[1].y + padding.top}`;
    }

    // Create smooth curves
    let path = `M ${points[0].x + padding.left} ${points[0].y + padding.top}`;

    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const previous = points[i - 1];

      if (i === 1) {
        const next = points[i + 1];
        const cp1x = previous.x + (current.x - previous.x) * 0.3;
        const cp1y = previous.y + (current.y - previous.y) * 0.3;
        const cp2x =
          current.x -
          (next
            ? (next.x - previous.x) * 0.15
            : (current.x - previous.x) * 0.3);
        const cp2y =
          current.y -
          (next
            ? (next.y - previous.y) * 0.15
            : (current.y - previous.y) * 0.3);

        path += ` C ${cp1x + padding.left} ${cp1y + padding.top}, ${
          cp2x + padding.left
        } ${cp2y + padding.top}, ${current.x + padding.left} ${
          current.y + padding.top
        }`;
      } else if (i === points.length - 1) {
        const cp1x = previous.x + (current.x - previous.x) * 0.3;
        const cp1y = previous.y + (current.y - previous.y) * 0.3;
        const cp2x = current.x - (current.x - previous.x) * 0.3;
        const cp2y = current.y - (current.y - previous.y) * 0.3;

        path += ` C ${cp1x + padding.left} ${cp1y + padding.top}, ${
          cp2x + padding.left
        } ${cp2y + padding.top}, ${current.x + padding.left} ${
          current.y + padding.top
        }`;
      } else {
        const next = points[i + 1];
        const prev2 = points[i - 2];

        const cp1x = previous.x + (current.x - (prev2?.x || previous.x)) * 0.15;
        const cp1y = previous.y + (current.y - (prev2?.y || previous.y)) * 0.15;
        const cp2x = current.x - (next.x - previous.x) * 0.15;
        const cp2y = current.y - (next.y - previous.y) * 0.15;

        path += ` C ${cp1x + padding.left} ${cp1y + padding.top}, ${
          cp2x + padding.left
        } ${cp2y + padding.top}, ${current.x + padding.left} ${
          current.y + padding.top
        }`;
      }
    }

    return path;
  }, [priceData.scaledPoints, padding]);

  // Enhanced area path with smooth curves
  const areaPath = useMemo(() => {
    if (priceData.scaledPoints.length === 0) return "";

    const firstPoint = priceData.scaledPoints[0];
    const lastPoint = priceData.scaledPoints[priceData.scaledPoints.length - 1];

    return `${pathData} L ${lastPoint.x + padding.left} ${
      innerHeight + padding.top
    } L ${firstPoint.x + padding.left} ${innerHeight + padding.top} Z`;
  }, [pathData, priceData.scaledPoints, padding, innerHeight]);

  // Enhanced mouse/touch tracking with interpolation
  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current || priceData.scaledPoints.length === 0) return;

      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = dimensions.width / rect.width;
      const scaleY = dimensions.height / rect.height;

      const svgX = (clientX - rect.left) * scaleX;
      const svgY = (clientY - rect.top) * scaleY;

      setCursorPosition({ x: svgX, y: svgY });

      const adjustedX = svgX - padding.left;

      if (
        adjustedX >= 0 &&
        adjustedX <= innerWidth &&
        svgY >= padding.top &&
        svgY <= padding.top + innerHeight
      ) {
        setIsVisible(true);

        const progress = adjustedX / innerWidth;
        const exactIndex = progress * (priceData.scaledPoints.length - 1);
        const lowerIndex = Math.floor(exactIndex);
        const upperIndex = Math.ceil(exactIndex);

        if (
          lowerIndex === upperIndex ||
          upperIndex >= priceData.scaledPoints.length
        ) {
          setHoveredPoint(priceData.scaledPoints[lowerIndex]);
        } else {
          const lowerPoint = priceData.scaledPoints[lowerIndex];
          const upperPoint = priceData.scaledPoints[upperIndex];
          const fraction = exactIndex - lowerIndex;

          const interpolatedPrice =
            lowerPoint.price + (upperPoint.price - lowerPoint.price) * fraction;
          const interpolatedTime =
            lowerPoint.timestamp +
            (upperPoint.timestamp - lowerPoint.timestamp) * fraction;

          const interpolatedY =
            innerHeight -
            ((interpolatedPrice - priceData.minPrice) / priceData.priceRange) *
              innerHeight;

          setHoveredPoint({
            ...lowerPoint,
            price: interpolatedPrice,
            timestamp: interpolatedTime,
            x: adjustedX,
            y: interpolatedY,
          });
        }
      } else {
        setIsVisible(false);
        setHoveredPoint(null);
      }
    },
    [svgRef, priceData, dimensions, padding, innerWidth, innerHeight]
  );

  // Mouse and touch events
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    handlePointerMove(event.clientX, event.clientY);

    if (isDragging) {
      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      setPanOffset((prev) => ({
        x: Math.max(-150, Math.min(150, prev.x + deltaX * 0.5)),
        y: Math.max(-150, Math.min(150, prev.y + deltaY * 0.5)),
      }));
      setDragStart({ x: event.clientX, y: event.clientY });
    }
  };

  const handleTouchMove = (event: React.TouchEvent<SVGSVGElement>) => {
    event.preventDefault();
    const touch = event.touches[0];
    if (touch) {
      handlePointerMove(touch.clientX, touch.clientY);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
    setHoveredPoint(null);
  };

  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Enhanced formatting functions
  const formatCurrency = (value: number) => {
    if (value < 0.000001) return `$${value.toExponential(2)}`;
    if (value < 0.01) return `$${value.toFixed(8)}`;
    if (value < 1) return `$${value.toFixed(6)}`;
    if (value < 100) return `$${value.toFixed(4)}`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const isMobile = dimensions.width < 500;

    if (isMobile) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Enhanced grid generation
  const gridData = useMemo(() => {
    const isMobile = dimensions.width < 500;
    const horizontalLines = [];
    const verticalLines = [];

    const priceSteps = isMobile ? 5 : 7;
    for (let i = 0; i <= priceSteps; i++) {
      const y = padding.top + (i / priceSteps) * innerHeight;
      const price =
        priceData.maxPrice - (i / priceSteps) * priceData.priceRange;

      horizontalLines.push({
        y: Math.round(y),
        price,
        label: formatCurrency(price),
      });
    }

    const timeSteps = isMobile ? 4 : 6;
    const stepSize = Math.max(
      1,
      Math.floor(priceData.prices.length / timeSteps)
    );

    for (let i = 0; i <= timeSteps; i++) {
      const pointIndex = Math.min(i * stepSize, priceData.prices.length - 1);
      const point = priceData.prices[pointIndex];

      if (point) {
        const x =
          padding.left +
          (pointIndex / (priceData.prices.length - 1)) * innerWidth;
        verticalLines.push({
          x: Math.round(x),
          timestamp: point.timestamp,
          label: formatDate(point.timestamp),
        });
      }
    }

    return { horizontalLines, verticalLines };
  }, [priceData, dimensions, padding, innerWidth, innerHeight]);

  // Control functions
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev / 1.2, 0.5));
  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className={`relative h-[300px] flex items-center justify-center ${className}`}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  if (!chartData || !priceData.prices.length) {
    return (
      <div
        ref={containerRef}
        className={`relative h-[300px] flex items-center justify-center ${className}`}
      >
        <p className="text-gray-400 font-medium">No chart data available</p>
      </div>
    );
  }

  const isPositive = priceChange24h >= 0;
  const lineColor = isPositive ? "#10B981" : "#EF4444";
  const gradientId = `enhanced-gradient-${tokenSymbol}`;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="text-3xl font-bold text-white">
            {hoveredPoint
              ? formatCurrency(hoveredPoint.price)
              : currentPrice
              ? formatCurrency(currentPrice)
              : formatCurrency(
                  priceData.prices[priceData.prices.length - 1]?.price || 0
                )}
          </div>
          <div
            className={`flex items-center text-lg font-medium ${
              isPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            {isPositive ? (
              <TrendingUp size={20} className="mr-2" />
            ) : (
              <TrendingDown size={20} className="mr-2" />
            )}
            {priceChange24h >= 0 ? "+" : ""}
            {priceChange24h.toFixed(2)}%
          </div>
          {hoveredPoint && (
            <div className="bg-black border border-[#2C2C2C] rounded-lg px-4 py-2 shadow-lg">
              <div className="text-gray-300 text-sm">
                {formatDate(hoveredPoint.timestamp)}
              </div>
            </div>
          )}
        </div>

        {/* Chart Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomIn}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-all duration-200"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-all duration-200"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={resetView}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-all duration-200"
            title="Reset View"
          >
            <Move size={18} />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-all duration-200"
            title="Fullscreen"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      {/* Interactive Chart Container */}
      <div
        ref={containerRef}
        className={`relative w-full ${
          isFullscreen ? "fixed inset-0 z-50 bg-black p-8" : ""
        }`}
      >
        <div className="w-full bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] rounded-xl border border-[#2C2C2C] overflow-hidden shadow-2xl">
          <svg
            ref={svgRef}
            width="100%"
            height={dimensions.height}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="w-full cursor-crosshair select-none touch-none"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.2s ease-out",
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              if (touch) handlePointerMove(touch.clientX, touch.clientY);
            }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Enhanced Gradient Definitions */}
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.4" />
                <stop offset="30%" stopColor={lineColor} stopOpacity="0.2" />
                <stop offset="70%" stopColor={lineColor} stopOpacity="0.05" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
              </linearGradient>

              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="4"
                  floodColor="#000"
                  floodOpacity="0.3"
                />
              </filter>

              <pattern
                id={`enhanced-grid-${tokenSymbol}`}
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="#1A1A1A"
                  strokeWidth="1"
                  opacity="0.3"
                />
              </pattern>

              <linearGradient
                id="background-gradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#0F0F0F" />
                <stop offset="100%" stopColor="#0A0A0A" />
              </linearGradient>
            </defs>

            {/* Background with gradient */}
            <rect
              x="0"
              y="0"
              width={dimensions.width}
              height={dimensions.height}
              fill="url(#background-gradient)"
            />

            {/* Grid Background */}
            <rect
              x={padding.left}
              y={padding.top}
              width={innerWidth}
              height={innerHeight}
              fill={`url(#enhanced-grid-${tokenSymbol})`}
            />

            {/* Enhanced Grid Lines */}
            {gridData.horizontalLines.map((line, index) => (
              <g key={`h-${index}`}>
                <line
                  x1={padding.left}
                  y1={line.y}
                  x2={padding.left + innerWidth}
                  y2={line.y}
                  stroke="#2C2C2C"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <text
                  x={padding.left - 12}
                  y={line.y + 4}
                  fill="#888"
                  fontSize={dimensions.width < 500 ? "11" : "13"}
                  textAnchor="end"
                  className="font-medium"
                >
                  {line.label}
                </text>
              </g>
            ))}

            {gridData.verticalLines.map((line, index) => (
              <g key={`v-${index}`}>
                <line
                  x1={line.x}
                  y1={padding.top}
                  x2={line.x}
                  y2={padding.top + innerHeight}
                  stroke="#2C2C2C"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <text
                  x={line.x}
                  y={dimensions.height - 12}
                  fill="#888"
                  fontSize={dimensions.width < 500 ? "10" : "12"}
                  textAnchor="middle"
                  className="font-medium"
                >
                  {line.label}
                </text>
              </g>
            ))}

            {/* Enhanced Price Area Fill */}
            <path
              d={areaPath}
              fill={`url(#${gradientId})`}
              filter="url(#shadow)"
            />

            {/* Main Price Line with Glow */}
            <path
              d={pathData}
              fill="none"
              stroke={lineColor}
              strokeWidth={dimensions.width < 500 ? "3" : "4"}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              style={{
                transition: "stroke-width 0.2s ease",
              }}
            />

            {/* Enhanced Data Points */}
            {priceData.scaledPoints.map((point, index) => {
              const shouldShow =
                dimensions.width < 500
                  ? index % Math.ceil(priceData.scaledPoints.length / 12) ===
                      0 || hoveredPoint === point
                  : index % Math.ceil(priceData.scaledPoints.length / 20) ===
                      0 || hoveredPoint === point;

              if (!shouldShow) return null;

              const isHovered = hoveredPoint === point;

              return (
                <g key={index}>
                  <circle
                    cx={point.x + padding.left}
                    cy={point.y + padding.top}
                    r={isHovered ? 8 : 4}
                    fill={lineColor}
                    stroke="#000"
                    strokeWidth="2"
                    opacity={isHovered ? 1 : 0.8}
                    className="transition-all duration-200"
                    filter={isHovered ? "url(#glow)" : undefined}
                  />
                  {isHovered && (
                    <circle
                      cx={point.x + padding.left}
                      cy={point.y + padding.top}
                      r="12"
                      fill="none"
                      stroke={lineColor}
                      strokeWidth="2"
                      opacity="0.5"
                      className="animate-pulse"
                    />
                  )}
                </g>
              );
            })}

            {/* Enhanced Crosshair */}
            {isVisible && hoveredPoint && (
              <g opacity="0.9">
                <line
                  x1={padding.left}
                  y1={hoveredPoint.y + padding.top}
                  x2={padding.left + innerWidth}
                  y2={hoveredPoint.y + padding.top}
                  stroke="#E2AF19"
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                  opacity="0.8"
                />
                <line
                  x1={hoveredPoint.x + padding.left}
                  y1={padding.top}
                  x2={hoveredPoint.x + padding.left}
                  y2={padding.top + innerHeight}
                  stroke="#E2AF19"
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                  opacity="0.8"
                />
                <circle
                  cx={hoveredPoint.x + padding.left}
                  cy={hoveredPoint.y + padding.top}
                  r="6"
                  fill="#E2AF19"
                  stroke="#000"
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              </g>
            )}

            {/* Chart Border */}
            <rect
              x={padding.left}
              y={padding.top}
              width={innerWidth}
              height={innerHeight}
              fill="none"
              stroke="#444"
              strokeWidth="2"
              rx="8"
              opacity="0.8"
            />
          </svg>
        </div>

        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 bg-black border border-[#2C2C2C] p-3 rounded-lg text-white hover:bg-[#2C2C2C] transition-colors z-10"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Enhanced Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#2C2C2C] rounded-xl p-4 text-center">
          <div className="text-green-400 text-xs font-medium mb-2">
            24H HIGH
          </div>
          <div className="text-white font-bold text-lg">
            {formatCurrency(priceData.maxPrice)}
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#2C2C2C] rounded-xl p-4 text-center">
          <div className="text-red-400 text-xs font-medium mb-2">24H LOW</div>
          <div className="text-white font-bold text-lg">
            {formatCurrency(priceData.minPrice)}
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#2C2C2C] rounded-xl p-4 text-center">
          <div className="text-blue-400 text-xs font-medium mb-2">RANGE</div>
          <div className="text-white font-bold text-lg">
            {formatCurrency(priceData.maxPrice - priceData.minPrice)}
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#2C2C2C] rounded-xl p-4 text-center">
          <div className="text-yellow-400 text-xs font-medium mb-2">
            DATA POINTS
          </div>
          <div className="text-white font-bold text-lg">
            {priceData.prices.length.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Modal Component
interface SimpleTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenInfo: {
    name: string;
    symbol: string;
    contractAddress: string;
    decimals: number;
    balance: string;
    priceData?: any;
  };
  walletAddress: string;
}

const SimpleTransferModal: React.FC<SimpleTransferModalProps> = ({
  isOpen,
  onClose,
  tokenInfo,
  walletAddress,
}) => {
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate transaction
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setLoading(false);
    onClose();
    setAmount("");
    setRecipient("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F0F0F] border border-[#2C2C2C] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            Send {tokenInfo.symbol}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full bg-black border border-[#2C2C2C] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#E2AF19] outline-none"
              placeholder="0x..."
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-black border border-[#2C2C2C] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#E2AF19] outline-none"
              placeholder="0.00"
              step="any"
              required
            />
            <div className="flex justify-between text-sm text-gray-400 mt-1">
              <span>
                Balance: {parseFloat(tokenInfo.balance).toFixed(6)}{" "}
                {tokenInfo.symbol}
              </span>
              <button
                type="button"
                onClick={() => setAmount(tokenInfo.balance)}
                className="text-[#E2AF19] hover:opacity-80"
              >
                Max
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#2C2C2C] text-white py-3 rounded-lg hover:bg-[#3C3C3C] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount || !recipient}
              className="flex-1 bg-[#E2AF19] text-black py-3 rounded-lg hover:bg-[#D4A853] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Transaction History Component
interface TransactionHistoryProps {
  walletAddress?: string;
  tokenFilter?: string;
  transactionTypeFilter?: string;
  limit?: number;
  showFilter?: boolean;
  compact?: boolean;
  className?: string;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  walletAddress,
  tokenFilter,
  transactionTypeFilter,
  limit = 10,
  showFilter = true,
  compact = false,
  className = "",
}) => {
  const [transactions] = useState([
    {
      id: "1",
      type: "send",
      amount: "0.5",
      symbol: "ETH",
      to: "0x742d35Cc6ABf4f8aa26c34F3c88e3F5f8e1F56B2",
      timestamp: Date.now() - 1000000,
      status: "confirmed",
      hash: "0x123...abc",
    },
    {
      id: "2",
      type: "receive",
      amount: "1000",
      symbol: "USDC",
      from: "0x742d35Cc6ABf4f8aa26c34F3c88e3F5f8e1F56B2",
      timestamp: Date.now() - 2000000,
      status: "confirmed",
      hash: "0x456...def",
    },
  ]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`${className}`}>
      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <Activity size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-400">No transactions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg p-4 hover:bg-[#1A1A1A] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.type === "send" ? "bg-red-500" : "bg-green-500"
                    }`}
                  >
                    {tx.type === "send" ? (
                      <Send size={16} className="text-white" />
                    ) : (
                      <TrendingDown
                        size={16}
                        className="text-white rotate-180"
                      />
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {tx.type === "send" ? "Sent" : "Received"} {tx.amount}{" "}
                      {tx.symbol}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {tx.type === "send" ? "To" : "From"}:{" "}
                      {(tx.to || tx.from)?.slice(0, 8)}...
                      {(tx.to || tx.from)?.slice(-6)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-sm">
                    {formatTime(tx.timestamp)}
                  </div>
                  <div className="text-green-400 text-sm">{tx.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Skeleton Loading Component
const SkeletonTokenOverview = () => {
  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-6 animate-pulse">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gray-700 rounded-full mr-4"></div>
        <div>
          <div className="h-6 bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-16"></div>
        </div>
      </div>
      <div className="h-64 bg-gray-700 rounded-lg mb-6"></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-20 bg-gray-700 rounded-lg"></div>
        <div className="h-20 bg-gray-700 rounded-lg"></div>
      </div>
    </div>
  );
};

// Main Token Overview Page Component
interface TokenInfo {
  name: string;
  symbol: string;
  contractAddress: string;
  decimals: number;
  balance: string;
  priceData: {
    id: string;
    current_price: number;
    price_change_percentage_24h: number;
    market_cap: number;
    total_volume: number;
    description?: string;
    image?: string;
    homepage?: string;
    whitepaper?: string;
    blockchain_site?: string;
    telegram_channel?: string;
    twitter_screen_name?: string;
    subreddit_url?: string;
    official_forum_url?: string;
  } | null;
}

export default function TokenOverviewPage() {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState(7);
  const [copied, setCopied] = useState<string>("");
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Mock data and params (replace with your actual routing logic)
  const contractAddress = "0x123...abc";
  const walletAddress = "0x742d35Cc6ABf4f8aa26c34F3c88e3F5f8e1F56B2";

  // Generate sample data
  const generateSampleData = (days: number) => {
    const now = Date.now();
    const interval = (days * 24 * 60 * 60 * 1000) / 100;
    const basePrice = 2000 + Math.random() * 1000;

    const prices = [];

    for (let i = 0; i < 100; i++) {
      const timestamp = now - (99 - i) * interval;
      const volatility = 0.02;
      const trend = Math.sin(i * 0.1) * 0.001;
      const randomWalk = (Math.random() - 0.5) * volatility;

      const priceChange = i === 0 ? 0 : trend + randomWalk;
      const price =
        i === 0 ? basePrice : prices[i - 1].price * (1 + priceChange);

      const date = new Date(timestamp);
      prices.push({
        timestamp,
        price,
        date: date.toISOString().split("T")[0],
        time: date.toTimeString().split(" ")[0],
      });
    }

    return { prices, timeframe: days };
  };

  useEffect(() => {
    // Simulate loading token info
    const loadTokenInfo = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setTokenInfo({
        name: "Ethereum",
        symbol: "ETH",
        contractAddress: "native",
        decimals: 18,
        balance: "2.45678",
        priceData: {
          id: "ethereum",
          current_price: 2400.5,
          price_change_percentage_24h: 3.45,
          market_cap: 288000000000,
          total_volume: 15000000000,
          description:
            "Ethereum is a global, open-source platform for decentralized applications.",
          image:
            "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
          homepage: "https://ethereum.org",
          whitepaper: "https://ethereum.org/whitepaper",
          blockchain_site: "https://etherscan.io",
          telegram_channel: "ethereum",
          twitter_screen_name: "ethereum",
        },
      });

      setChartData(generateSampleData(7));
      setLoading(false);
    };

    loadTokenInfo();
  }, []);

  const fetchChartData = async (days: number) => {
    setChartLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setChartData(generateSampleData(days));
    setChartLoading(false);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getTokenIcon = (symbol: string) => {
    const colors: Record<string, string> = {
      ETH: "bg-blue-500",
      SOL: "bg-purple-500",
      BTC: "bg-orange-500",
      USDT: "bg-green-500",
      USDC: "bg-blue-600",
    };
    return colors[symbol] || "bg-gray-500";
  };

  const getTokenLetter = (symbol: string) => {
    const letters: Record<string, string> = {
      ETH: "Ξ",
      SOL: "◎",
      BTC: "₿",
      USDT: "₮",
      USDC: "$",
    };
    return letters[symbol] || symbol.charAt(0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const formatLargeNumber = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const goBack = () => {
    console.log("Going back...");
  };

  if (loading) {
    return <SkeletonTokenOverview />;
  }

  if (!tokenInfo) {
    return (
      <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Token not found</h2>
          <button onClick={goBack} className="text-[#E2AF19] hover:opacity-80">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const tokenBalance = parseFloat(tokenInfo.balance);
  const tokenValue = tokenBalance * (tokenInfo.priceData?.current_price || 0);

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Mobile Layout */}
      <div className="flex flex-col xl:hidden gap-4 flex-1 min-h-0 overflow-y-auto">
        {/* Token Header */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <div className="flex items-center mb-4">
            <button
              onClick={goBack}
              className="mr-3 p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            {tokenInfo.priceData?.image ? (
              <img
                src={tokenInfo.priceData.image}
                alt={tokenInfo.symbol}
                className="w-10 h-10 rounded-full mr-3"
              />
            ) : (
              <div
                className={`w-10 h-10 ${getTokenIcon(
                  tokenInfo.symbol
                )} rounded-full mr-3 flex items-center justify-center`}
              >
                <span className="text-white text-lg font-bold">
                  {getTokenLetter(tokenInfo.symbol)}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">{tokenInfo.name}</h2>
              <p className="text-gray-400 text-sm">{tokenInfo.symbol}</p>
            </div>
          </div>

          {/* Basic Token Info */}
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Token Name:</span>
              <span className="text-white">{tokenInfo.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Token Symbol:</span>
              <span className="text-white">{tokenInfo.symbol}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Contract Address:</span>
              <div className="flex items-center">
                <span className="text-white text-sm mr-2">
                  {tokenInfo.contractAddress === "native"
                    ? "Native Token"
                    : `${tokenInfo.contractAddress.slice(
                        0,
                        8
                      )}...${tokenInfo.contractAddress.slice(-6)}`}
                </span>
                {tokenInfo.contractAddress !== "native" && (
                  <button
                    onClick={() =>
                      copyToClipboard(tokenInfo.contractAddress, "contract")
                    }
                    className="hover:text-white transition-colors"
                  >
                    <Copy size={14} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Your Holdings:</span>
              <span className="text-white">
                {tokenBalance.toFixed(6)} {tokenInfo.symbol}
              </span>
            </div>
          </div>

          {/* Price Information */}
          {tokenInfo.priceData && (
            <div className="mb-4">
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {formatCurrency(tokenInfo.priceData.current_price)}
              </div>
              <div className="flex items-center">
                {tokenInfo.priceData.price_change_percentage_24h >= 0 ? (
                  <TrendingUp size={16} className="text-green-400 mr-1" />
                ) : (
                  <TrendingDown size={16} className="text-red-400 mr-1" />
                )}
                <span
                  className={`text-sm ${
                    tokenInfo.priceData.price_change_percentage_24h >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {formatPercentage(
                    tokenInfo.priceData.price_change_percentage_24h
                  )}{" "}
                  (24h)
                </span>
              </div>
              <div className="text-gray-400 text-sm mt-1">
                Market Cap: {formatLargeNumber(tokenInfo.priceData.market_cap)}
              </div>
              <div className="text-gray-400 text-sm">
                24h Volume:{" "}
                {formatLargeNumber(tokenInfo.priceData.total_volume)}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Interactive Chart - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              📈 Interactive Chart
            </h3>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {[1, 7, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => {
                      setSelectedTimeframe(days);
                      fetchChartData(days);
                    }}
                    className={`px-2 py-1 rounded-md text-xs transition-colors ${
                      selectedTimeframe === days
                        ? "bg-[#E2AF19] text-black font-medium"
                        : "bg-[#2C2C2C] text-gray-400 hover:text-white"
                    }`}
                  >
                    {days === 1 ? "24h" : `${days}d`}
                  </button>
                ))}
              </div>
              <button
                onClick={() => fetchChartData(selectedTimeframe)}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={chartLoading}
              >
                <RefreshCw
                  size={14}
                  className={chartLoading ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          <EnhancedInteractiveChart
            chartData={chartData}
            tokenSymbol={tokenInfo.symbol}
            currentPrice={tokenInfo.priceData?.current_price}
            priceChange24h={tokenInfo.priceData?.price_change_percentage_24h}
            isLoading={chartLoading}
          />
        </div>

        {/* Portfolio Section - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {tokenInfo.priceData?.image ? (
                <img
                  src={tokenInfo.priceData.image}
                  alt={tokenInfo.symbol}
                  className="w-8 h-8 rounded-full mr-3"
                />
              ) : (
                <div
                  className={`w-8 h-8 ${getTokenIcon(
                    tokenInfo.symbol
                  )} rounded-full mr-3 flex items-center justify-center`}
                >
                  <span className="text-white text-sm font-bold">
                    {getTokenLetter(tokenInfo.symbol)}
                  </span>
                </div>
              )}
              <span className="text-white font-semibold">Portfolio</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">
                {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
              </span>
              <button
                onClick={() => copyToClipboard(walletAddress!, "wallet")}
                className="hover:text-white transition-colors"
              >
                <Copy size={14} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold text-white mb-1">
                {formatCurrency(tokenValue)}
              </div>
              <div
                className={`text-sm ${
                  tokenInfo.priceData?.price_change_percentage_24h >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {tokenInfo.priceData
                  ? formatPercentage(
                      tokenInfo.priceData.price_change_percentage_24h
                    )
                  : "N/A"}
                <span className="text-gray-400 ml-1">
                  ({tokenBalance.toFixed(6)} {tokenInfo.symbol})
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setTransferModalOpen(true)}
              className="flex-1 bg-[#E2AF19] text-black font-semibold py-3 rounded-xl hover:bg-[#D4A853] transition-colors"
            >
              Send {tokenInfo.symbol}
            </button>
            <button className="bg-[#4B3A08] text-[#E2AF19] p-3 rounded-xl hover:bg-[#5A4509] transition-colors">
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Transaction History - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              <Activity size={20} className="inline mr-2" />
              {tokenInfo.symbol} Transaction History
            </h3>
            <button className="text-gray-400 hover:text-white transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <TransactionHistory
              walletAddress={walletAddress}
              tokenFilter={tokenInfo.symbol}
              limit={20}
              showFilter={false}
              compact={true}
            />
          </div>
        </div>

        {/* About Token - Mobile */}
        {tokenInfo.priceData?.description && (
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-white mb-4">
              📝 About {tokenInfo.name}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {tokenInfo.priceData.description.length > 300
                ? `${tokenInfo.priceData.description.substring(0, 300)}...`
                : tokenInfo.priceData.description}
            </p>
          </div>
        )}

        {/* Official Links Section - Mobile */}
        {tokenInfo.priceData && (
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-white mb-4">
              🔗 Official Links
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {tokenInfo.priceData.homepage && (
                <a
                  href={tokenInfo.priceData.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-[#0F0F0F] text-white px-3 py-3 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors text-sm"
                >
                  <Globe size={16} className="mr-2" />
                  Website
                </a>
              )}
              {tokenInfo.priceData.twitter_screen_name && (
                <a
                  href={`https://twitter.com/${tokenInfo.priceData.twitter_screen_name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-[#0F0F0F] text-white px-3 py-3 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors text-sm"
                >
                  <Twitter size={16} className="mr-2" />
                  Twitter
                </a>
              )}
              {tokenInfo.priceData.telegram_channel && (
                <a
                  href={`https://t.me/${tokenInfo.priceData.telegram_channel}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-[#0F0F0F] text-white px-3 py-3 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors text-sm"
                >
                  <MessageCircle size={16} className="mr-2" />
                  Telegram
                </a>
              )}
              {tokenInfo.priceData.blockchain_site && (
                <a
                  href={tokenInfo.priceData.blockchain_site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-[#0F0F0F] text-white px-3 py-3 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors text-sm"
                >
                  <ExternalLink size={16} className="mr-2" />
                  Explorer
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:flex gap-6 flex-1 min-h-0">
        {/* Left Column - Main Info */}
        <div className="flex-1 flex flex-col gap-6 min-w-0 max-h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Token Header and Chart - Desktop */}
            <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-shrink-0">
              {/* Back Button and Token Info */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex flex-col">
                  <div className="flex items-center mb-4">
                    <button
                      onClick={goBack}
                      className="mr-4 p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
                    >
                      <ArrowLeft size={20} className="text-white" />
                    </button>
                    {tokenInfo.priceData?.image ? (
                      <img
                        src={tokenInfo.priceData.image}
                        alt={tokenInfo.symbol}
                        className="w-12 h-12 rounded-full mr-4"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 ${getTokenIcon(
                          tokenInfo.symbol
                        )} rounded-full mr-4 flex items-center justify-center`}
                      >
                        <span className="text-white text-xl font-bold">
                          {getTokenLetter(tokenInfo.symbol)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {tokenInfo.name}
                      </h2>
                      <p className="text-gray-400">{tokenInfo.symbol}</p>
                    </div>
                  </div>

                  {/* Price Information */}
                  {tokenInfo.priceData && (
                    <div className="flex items-center space-x-6">
                      <div className="text-4xl font-bold text-white">
                        {formatCurrency(tokenInfo.priceData.current_price)}
                      </div>
                      <div
                        className={`text-lg flex items-center ${
                          tokenInfo.priceData.price_change_percentage_24h >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {tokenInfo.priceData.price_change_percentage_24h >= 0
                          ? "▲"
                          : "▼"}{" "}
                        {formatPercentage(
                          tokenInfo.priceData.price_change_percentage_24h
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Contract Address */}
                <div className="text-right">
                  <div className="text-white text-sm mb-1">
                    Contract Address
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">
                      {tokenInfo.contractAddress === "native"
                        ? "Native Token"
                        : `${tokenInfo.contractAddress.slice(
                            0,
                            10
                          )}...${tokenInfo.contractAddress.slice(-8)}`}
                    </span>
                    {tokenInfo.contractAddress !== "native" && (
                      <button
                        onClick={() =>
                          copyToClipboard(tokenInfo.contractAddress, "contract")
                        }
                        className="hover:text-white transition-colors"
                      >
                        <Copy size={16} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Interactive Chart - Desktop */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    📈 Interactive Price Chart
                  </h3>
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-2">
                      {[1, 7, 30, 90].map((days) => (
                        <button
                          key={days}
                          onClick={() => {
                            setSelectedTimeframe(days);
                            fetchChartData(days);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            selectedTimeframe === days
                              ? "bg-[#E2AF19] text-black font-medium"
                              : "bg-[#2C2C2C] text-gray-400 hover:text-white"
                          }`}
                        >
                          {days === 1 ? "24h" : `${days}d`}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => fetchChartData(selectedTimeframe)}
                      className="text-gray-400 hover:text-white transition-colors"
                      disabled={chartLoading}
                    >
                      <RefreshCw
                        size={16}
                        className={chartLoading ? "animate-spin" : ""}
                      />
                    </button>
                  </div>
                </div>

                {/* Enhanced Interactive Chart Component */}
                <EnhancedInteractiveChart
                  chartData={chartData}
                  tokenSymbol={tokenInfo.symbol}
                  currentPrice={tokenInfo.priceData?.current_price}
                  priceChange24h={
                    tokenInfo.priceData?.price_change_percentage_24h
                  }
                  isLoading={chartLoading}
                />
              </div>
            </div>

            {/* About Token and Links - Desktop */}
            <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-shrink-0">
              {/* Official Links at Top */}
              {tokenInfo.priceData && (
                <div className="flex items-center space-x-4 mb-6">
                  {tokenInfo.priceData.homepage && (
                    <a
                      href={tokenInfo.priceData.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-4 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors flex items-center"
                    >
                      <Globe size={16} className="mr-2" />
                      Website
                    </a>
                  )}
                  {tokenInfo.priceData.whitepaper && (
                    <a
                      href={tokenInfo.priceData.whitepaper}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-4 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors flex items-center"
                    >
                      <FileText size={16} className="mr-2" />
                      Whitepaper
                    </a>
                  )}
                  {tokenInfo.priceData.twitter_screen_name && (
                    <a
                      href={`https://twitter.com/${tokenInfo.priceData.twitter_screen_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-4 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors flex items-center"
                    >
                      <Twitter size={16} className="mr-2" />
                      Twitter
                    </a>
                  )}
                  {tokenInfo.priceData.telegram_channel && (
                    <a
                      href={`https://t.me/${tokenInfo.priceData.telegram_channel}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-4 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors flex items-center"
                    >
                      <MessageCircle size={16} className="mr-2" />
                      Telegram
                    </a>
                  )}
                  {tokenInfo.priceData.blockchain_site && (
                    <a
                      href={tokenInfo.priceData.blockchain_site}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-4 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors flex items-center"
                    >
                      <ExternalLink size={16} className="mr-2" />
                      Explorer
                    </a>
                  )}
                </div>
              )}

              {/* About Section */}
              <h3 className="text-lg font-semibold text-white mb-4">
                📝 About {tokenInfo.name}
              </h3>
              {tokenInfo.priceData?.description ? (
                <p className="text-gray-400 text-sm leading-relaxed">
                  {tokenInfo.priceData.description}
                </p>
              ) : (
                <p className="text-gray-400 text-sm leading-relaxed">
                  {tokenInfo.symbol === "ETH" ? (
                    <>
                      Ethereum is a global, open-source platform for
                      decentralized applications. In other words, the vision is
                      to create a world computer that anyone can build
                      applications in a decentralized manner; while all states
                      and data are distributed and publicly accessible.
                    </>
                  ) : (
                    <>
                      {tokenInfo.name} is a cryptocurrency token that provides
                      various utilities and features within its ecosystem. It
                      enables users to participate in the network's governance,
                      facilitate transactions, and access various decentralized
                      applications and services.
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Portfolio and Transactions */}
        <div className="w-[400px] flex-shrink-0 h-full">
          <div className="bg-black rounded-[20px] border border-[#2C2C2C] h-full flex flex-col p-6">
            {/* Portfolio Header */}
            <div className="flex items-center mb-6">
              <div className="flex items-center">
                {tokenInfo.priceData?.image ? (
                  <img
                    src={tokenInfo.priceData.image}
                    alt={tokenInfo.symbol}
                    className="w-8 h-8 rounded-full mr-3"
                  />
                ) : (
                  <div
                    className={`w-8 h-8 ${getTokenIcon(
                      tokenInfo.symbol
                    )} rounded-full mr-3 flex items-center justify-center`}
                  >
                    <span className="text-white text-sm font-bold">
                      {getTokenLetter(tokenInfo.symbol)}
                    </span>
                  </div>
                )}
                <span className="text-white font-semibold">Portfolio</span>
              </div>
            </div>

            {/* Portfolio Value */}
            <div className="bg-[#000000] rounded-[16px] border border-[#2C2C2C] p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-white text-sm">
                  {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                </div>
                <button
                  onClick={() => copyToClipboard(walletAddress!, "wallet")}
                  className="hover:text-white transition-colors"
                >
                  <Copy size={16} className="text-gray-400" />
                </button>
              </div>

              <div className="mb-4">
                <div className="text-3xl font-bold text-white mb-1">
                  {formatCurrency(tokenValue)}
                </div>
                <div
                  className={`text-sm ${
                    tokenInfo.priceData?.price_change_percentage_24h >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {tokenInfo.priceData
                    ? formatPercentage(
                        tokenInfo.priceData.price_change_percentage_24h
                      )
                    : "N/A"}
                  <span className="text-gray-400 ml-1">
                    ({tokenBalance.toFixed(6)} {tokenInfo.symbol})
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setTransferModalOpen(true)}
                  className="flex-1 bg-[#E2AF19] text-black font-semibold py-3 rounded-xl hover:bg-[#D4A853] transition-colors"
                >
                  Send {tokenInfo.symbol}
                </button>
                <button className="bg-[#4B3A08] text-[#E2AF19] p-3 rounded-xl hover:bg-[#5A4509] transition-colors">
                  <Send size={16} />
                </button>
              </div>
            </div>

            {/* Transaction History - Desktop */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-lg font-semibold text-white">
                  <Activity size={20} className="inline mr-2" />
                  {tokenInfo.symbol} Transactions
                </h3>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                <TransactionHistory
                  walletAddress={walletAddress}
                  tokenFilter={tokenInfo.symbol}
                  limit={50}
                  showFilter={false}
                  compact={true}
                  className="flex-1 min-h-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SimpleTransfer Modal */}
      {tokenInfo && (
        <SimpleTransferModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          tokenInfo={{
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            contractAddress: tokenInfo.contractAddress,
            decimals: tokenInfo.decimals,
            balance: tokenInfo.balance,
            priceData: tokenInfo.priceData || undefined,
          }}
          walletAddress={walletAddress || ""}
        />
      )}

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
