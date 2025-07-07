import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  TrendingUp,
  TrendingDown,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Move,
  X,
  RefreshCw,
} from "lucide-react";

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
      const width = Math.max(300, rect.width - 32); // Account for padding
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
        x: Math.round(x * 100) / 100, // Higher precision
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

    // Create smooth curves using Catmull-Rom splines
    let path = `M ${points[0].x + padding.left} ${points[0].y + padding.top}`;

    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const previous = points[i - 1];

      if (i === 1) {
        // First curve segment
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
        // Last curve segment
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
        // Middle curve segments
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

      // Accurate point detection with interpolation
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
          // Smooth interpolation between points
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

  // Mouse events
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

  // Touch events for mobile
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

    // Horizontal grid lines (price levels)
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

    // Vertical grid lines (time)
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
                {/* Horizontal line */}
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
                {/* Vertical line */}
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
                {/* Intersection point */}
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

// Demo Component
const ChartDemo = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState(7);
  const [isLoading, setIsLoading] = useState(false);

  // Generate realistic sample data
  const generateSampleData = (days: number) => {
    const now = Date.now();
    const interval = (days * 24 * 60 * 60 * 1000) / 100; // 100 data points
    const basePrice = 45000 + Math.random() * 10000;

    const prices = [];

    for (let i = 0; i < 100; i++) {
      const timestamp = now - (99 - i) * interval;
      const volatility = 0.02; // 2% volatility
      const trend = Math.sin(i * 0.1) * 0.001; // Small trend component
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

  const [chartData, setChartData] = useState(() => generateSampleData(7));

  const handleTimeframeChange = (days: number) => {
    setIsLoading(true);
    setSelectedTimeframe(days);

    // Simulate API call delay
    setTimeout(() => {
      setChartData(generateSampleData(days));
      setIsLoading(false);
    }, 500);
  };

  const currentPrice =
    chartData.prices[chartData.prices.length - 1]?.price || 50000;
  const previousPrice =
    chartData.prices[chartData.prices.length - 2]?.price || currentPrice;
  const priceChange24h = ((currentPrice - previousPrice) / previousPrice) * 100;

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-[#0F0F0F] rounded-2xl border border-[#2C2C2C] p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">₿</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Bitcoin</h1>
                <p className="text-gray-400">BTC</p>
              </div>
            </div>

            {/* Timeframe Selector */}
            <div className="flex space-x-2">
              {[1, 7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => handleTimeframeChange(days)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedTimeframe === days
                      ? "bg-[#E2AF19] text-black"
                      : "bg-[#2C2C2C] text-gray-400 hover:text-white hover:bg-[#3C3C3C]"
                  }`}
                >
                  {days === 1 ? "24h" : `${days}d`}
                </button>
              ))}
              <button
                onClick={() => handleTimeframeChange(selectedTimeframe)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                disabled={isLoading}
              >
                <RefreshCw
                  size={16}
                  className={isLoading ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          {/* Enhanced Chart */}
          <EnhancedInteractiveChart
            chartData={chartData}
            tokenSymbol="BTC"
            currentPrice={currentPrice}
            priceChange24h={priceChange24h}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default ChartDemo;
