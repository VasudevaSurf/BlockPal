// src/components/ChartUI.tsx - MOBILE OPTIMIZED: Fixed responsive layout
"use client";

import React, { useEffect, useRef, useState } from "react";

interface ChartUIProps {
  poolAddress?: string;
  network?: string;
}

interface HoverData {
  time: any;
  open: number;
  high: number;
  low: number;
  close: number;
}

const ChartUI: React.FC<ChartUIProps> = ({
  poolAddress = "0xe250096fd01810Ba7A19C41070EC5f161E3F0F4D",
  network = "eth",
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const chartDataRef = useRef<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [currentPrice, setCurrentPrice] = useState("0.00");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverData, setHoverData] = useState<HoverData | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [tokenInfo, setTokenInfo] = useState({
    name: "Loading...",
    symbol: "Loading...",
    logo: null as string | null,
  });

  // Timeframe configuration
  const timeframes = [
    {
      label: "1m",
      value: "1m",
      timeframe: "minute",
      aggregate: "1",
      limit: "300",
    },
    {
      label: "5m",
      value: "5m",
      timeframe: "minute",
      aggregate: "5",
      limit: "288",
    },
    {
      label: "15m",
      value: "15m",
      timeframe: "minute",
      aggregate: "15",
      limit: "672",
    },
    {
      label: "1H",
      value: "1h",
      timeframe: "hour",
      aggregate: "1",
      limit: "720",
    },
    {
      label: "4H",
      value: "4h",
      timeframe: "hour",
      aggregate: "4",
      limit: "720",
    },
    {
      label: "1D",
      value: "1d",
      timeframe: "day",
      aggregate: "1",
      limit: "365",
    },
  ];

  // Map chainId to CoinGecko network identifier
  const getNetworkId = (chainId: string): string => {
    const networkMap: { [key: string]: string } = {
      "1": "eth",
      "8453": "base",
      "137": "polygon-pos",
      "43114": "avax",
      "42161": "arbitrum-one",
      "56": "bsc",
      eth: "eth",
      base: "base",
      polygon: "polygon-pos",
      avalanche: "avax",
      arbitrum: "arbitrum-one",
      bsc: "bsc",
    };

    return networkMap[chainId] || chainId;
  };

  useEffect(() => {
    setIsClient(true);

    // Detect mobile on mount and window resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch OHLCV data from CoinGecko
  const fetchChartData = async (timeframe: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const tfConfig = timeframes.find((tf) => tf.value === timeframe);
      if (!tfConfig) return [];

      const networkId = getNetworkId(network);

      const params = new URLSearchParams({
        aggregate: tfConfig.aggregate,
        limit: tfConfig.limit,
        currency: "usd",
        token: "base",
      });

      const url = `https://api.coingecko.com/api/v3/onchain/networks/${networkId}/pools/${poolAddress}/ohlcv/${tfConfig.timeframe}?${params}`;

      console.log("📊 Fetching chart data:", {
        network: network,
        networkId: networkId,
        poolAddress: poolAddress,
        timeframe: tfConfig.timeframe,
      });

      const response = await fetch(url, {
        headers: {
          "x-cg-demo-api-key": "CG-oTmQJV3kLe92KcQ2753cxy6j",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", response.status, errorText);

        let errorMessage = `API Error: ${response.status}`;
        if (response.status === 404) {
          errorMessage =
            "Pool not found. This pool may not be available on CoinGecko or the pool address/network might be incorrect.";
        } else if (response.status === 429) {
          errorMessage = "Rate limit exceeded. Please try again later.";
        }

        setError(errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Extract base token info from meta
      if (data.meta && data.meta.base) {
        setTokenInfo({
          name: data.meta.base.name,
          symbol: data.meta.base.symbol,
          logo: null,
        });
      }

      // Transform OHLCV data
      if (
        !data.data?.attributes?.ohlcv_list ||
        data.data.attributes.ohlcv_list.length === 0
      ) {
        console.warn("⚠️ No OHLCV data in response");
        setError("No chart data available for this pool");
        return [];
      }

      const chartData = data.data.attributes.ohlcv_list
        .map((item: any[]) => ({
          time: item[0],
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5]),
        }))
        .filter(
          (item: any, index: number, self: any[]) =>
            index === self.findIndex((t) => t.time === item.time)
        )
        .sort((a: any, b: any) => a.time - b.time);

      console.log("📈 Transformed chart data:", chartData.length, "points");

      // Update current price
      if (chartData.length > 0) {
        const latestPrice = chartData[chartData.length - 1].close;
        setCurrentPrice(
          latestPrice.toLocaleString("en-US", {
            minimumFractionDigits: 5,
            maximumFractionDigits: 5,
          })
        );
      }

      return chartData;
    } catch (error) {
      console.error("❌ Error fetching chart data:", error);
      if (error instanceof Error) {
        setError(error.message);
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize chart
  useEffect(() => {
    if (!isClient || !chartContainerRef.current) return;

    let isMounted = true;

    const initChart = async () => {
      try {
        console.log("🚀 Initializing chart with:", { poolAddress, network });

        // Dynamically import lightweight-charts
        const LightweightCharts = await import("lightweight-charts");

        if (!isMounted || !chartContainerRef.current) return;

        const chart = LightweightCharts.createChart(chartContainerRef.current, {
          layout: {
            background: { color: "#191a1a" },
            textColor: "#9B9B9B",
          },
          grid: {
            vertLines: {
              color: "rgba(242, 242, 242, 0.03)",
              visible: true,
            },
            horzLines: {
              color: "rgba(242, 242, 242, 0.06)",
              visible: true,
            },
          },
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: "rgba(242, 242, 242, 0.1)",
            fixLeftEdge: true,
            fixRightEdge: true,
          },
          rightPriceScale: {
            borderColor: "rgba(242, 242, 242, 0.1)",
            autoScale: true,
            scaleMargins: {
              top: 0.1,
              bottom: 0.1,
            },
            borderVisible: true,
          },
          crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
            vertLine: {
              color: "rgba(242, 242, 242, 0.5)",
              width: 1,
              style: 0,
              labelBackgroundColor: "#2a2a2a",
              labelVisible: true,
            },
            horzLine: {
              color: "rgba(242, 242, 242, 0.5)",
              width: 1,
              style: 0,
              labelBackgroundColor: "#2a2a2a",
              labelVisible: true,
            },
          },
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: false,
          },
          handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
          },
        });

        console.log("✅ Chart created, adding candlestick series...");

        // Add candlestick series
        let candlestickSeries;
        try {
          if (typeof chart.addCandlestickSeries === "function") {
            candlestickSeries = chart.addCandlestickSeries({
              upColor: "#00D9B3",
              downColor: "#FF5252",
              borderUpColor: "#00D9B3",
              borderDownColor: "#FF5252",
              wickUpColor: "#00D9B3",
              wickDownColor: "#FF5252",
              priceFormat: {
                type: "price",
                precision: 5,
                minMove: 0.00001,
              },
            });
          } else {
            throw new Error("addCandlestickSeries method not available");
          }
        } catch (seriesError) {
          console.error("❌ Error adding series:", seriesError);
          throw seriesError;
        }

        console.log("✅ Candlestick series added");

        if (!isMounted) {
          chart.remove();
          return;
        }

        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;

        // Subscribe to crosshair move - shows H/L values on hover
        chart.subscribeCrosshairMove((param: any) => {
          if (!isMounted) return;

          if (param.time && chartDataRef.current.length > 0) {
            try {
              // Find the data point that matches this timestamp
              const dataPoint = chartDataRef.current.find(
                (item: any) => item.time === param.time
              );

              if (dataPoint) {
                setHoverData({
                  time: param.time,
                  open: dataPoint.open,
                  high: dataPoint.high,
                  low: dataPoint.low,
                  close: dataPoint.close,
                });
              } else {
                setHoverData(null);
              }
            } catch (error) {
              console.error("❌ Error in crosshair handler:", error);
              setHoverData(null);
            }
          } else {
            // Clear hover data when not hovering
            setHoverData(null);
          }
        });

        // Load initial data
        const data = await fetchChartData(selectedTimeframe);
        if (isMounted && data.length > 0) {
          console.log("📊 Setting initial chart data:", data.length, "points");
          chartDataRef.current = data;
          candlestickSeries.setData(data);
          chart.timeScale().fitContent();
          console.log("✅ Chart data set successfully");
        }

        // Handle resize with ResizeObserver
        if (chartContainerRef.current) {
          resizeObserverRef.current = new ResizeObserver((entries) => {
            if (!isMounted || !chartRef.current || !chartContainerRef.current)
              return;

            const { width, height } = entries[0].contentRect;

            if (width > 0 && height > 0) {
              chartRef.current.applyOptions({
                width: width,
                height: height,
              });

              setTimeout(() => {
                if (chartRef.current && isMounted) {
                  chartRef.current.timeScale().fitContent();
                }
              }, 0);
            }
          });

          resizeObserverRef.current.observe(chartContainerRef.current);
        }

        return () => {
          isMounted = false;
          if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
          }
          chart.remove();
        };
      } catch (error) {
        console.error("❌ Error initializing chart:", error);
      }
    };

    initChart();

    return () => {
      isMounted = false;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [isClient, poolAddress, network]);

  // Update chart when timeframe changes
  useEffect(() => {
    if (candlestickSeriesRef.current && chartRef.current && isClient) {
      console.log("🔄 Timeframe changed to:", selectedTimeframe);
      fetchChartData(selectedTimeframe).then((data) => {
        if (data.length > 0 && candlestickSeriesRef.current) {
          console.log("📊 Updating chart data:", data.length, "points");
          chartDataRef.current = data;
          candlestickSeriesRef.current.setData(data);
          chartRef.current.timeScale().fitContent();
          console.log("✅ Chart updated");
        }
      });
    }
  }, [selectedTimeframe, isClient]);

  if (!isClient) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9B9B9B",
        }}
      >
        Loading...
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 5,
      maximumFractionDigits: 5,
    });
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#191a1a",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "8px" : "12px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: isMobile ? "8px" : "12px",
      }}
    >
      {/* Header - Mobile: Stack vertically, Desktop: Side by side */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          gap: isMobile ? "8px" : "0",
          padding: "0",
        }}
      >
        {/* H/L Display - Full width on mobile when hovering */}
        {hoverData && (
          <div
            style={{
              display: "flex",
              gap: isMobile ? "12px" : "20px",
              padding: isMobile ? "6px 10px" : "8px 12px",
              fontSize: isMobile ? "11px" : "12px",
              color: "#9B9B9B",
              backgroundColor: "rgba(25, 26, 26, 0.95)",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              justifyContent: isMobile ? "center" : "flex-start",
              order: isMobile ? 2 : 1,
            }}
          >
            <div>
              <span style={{ color: "#666" }}>H: </span>
              <span style={{ color: "#00D9B3", fontWeight: "500" }}>
                ${formatNumber(hoverData.high)}
              </span>
            </div>
            <div>
              <span style={{ color: "#666" }}>L: </span>
              <span style={{ color: "#FF5252", fontWeight: "500" }}>
                ${formatNumber(hoverData.low)}
              </span>
            </div>
          </div>
        )}

        {/* Spacer - only on desktop when not hovering */}
        {!isMobile && !hoverData && <div style={{ flex: 1 }}></div>}

        {/* Timeframe Selector - Scrollable on mobile */}
        <div
          style={{
            display: "flex",
            gap: isMobile ? "4px" : "6px",
            backgroundColor: "#191a1a",
            padding: isMobile ? "2px" : "3px",
            borderRadius: "6px",
            overflowX: isMobile ? "auto" : "visible",
            overflowY: "hidden",
            order: isMobile ? 1 : 2,
            // Hide scrollbar but keep functionality
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          className="timeframe-scroll"
        >
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setSelectedTimeframe(tf.value)}
              disabled={isLoading}
              style={{
                padding: isMobile ? "5px 10px" : "6px 12px",
                backgroundColor:
                  selectedTimeframe === tf.value ? "#2a2a2a" : "transparent",
                color: selectedTimeframe === tf.value ? "#ffffff" : "#9B9B9B",
                border:
                  selectedTimeframe === tf.value
                    ? "1px solid rgba(255, 255, 255, 0.1)"
                    : "1px solid transparent",
                borderRadius: "4px",
                fontSize: isMobile ? "10px" : "11px",
                fontWeight: "500",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                outline: "none",
                opacity: isLoading ? 0.5 : 1,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (selectedTimeframe !== tf.value && !isLoading) {
                  (e.target as HTMLButtonElement).style.backgroundColor =
                    "#1a1a1a";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTimeframe !== tf.value) {
                  (e.target as HTMLButtonElement).style.backgroundColor =
                    "transparent";
                }
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div
        style={{
          flex: 1,
          backgroundColor: "#191a1a",
          borderRadius: "8px",
          overflow: "hidden",
          position: "relative",
          minHeight: 0,
        }}
      >
        <div
          ref={chartContainerRef}
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {/* Error Display */}
          {error && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "#FF5252",
                fontSize: isMobile ? "11px" : "12px",
                zIndex: 10,
                textAlign: "center",
                padding: isMobile ? "15px" : "20px",
                backgroundColor: "rgba(25, 26, 26, 0.95)",
                borderRadius: "8px",
                border: "1px solid rgba(255, 82, 82, 0.3)",
                maxWidth: "80%",
              }}
            >
              <div
                style={{
                  marginBottom: "8px",
                  fontSize: isMobile ? "13px" : "14px",
                  fontWeight: "600",
                }}
              >
                ⚠️ Unable to load chart
              </div>
              <div>{error}</div>
            </div>
          )}

          {/* Loading Display */}
          {isLoading && !error && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "#9B9B9B",
                fontSize: isMobile ? "11px" : "12px",
                zIndex: 10,
              }}
            >
              Loading chart data...
            </div>
          )}
        </div>

        {/* TradingView Branding */}
        <div
          style={{
            position: "absolute",
            bottom: "6px",
            left: "6px",
            fontSize: isMobile ? "9px" : "10px",
            color: "#666",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <svg
            width={isMobile ? "12" : "14"}
            height={isMobile ? "12" : "14"}
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M8 0L0 2.5V6C0 10 3 14 8 16C13 14 16 10 16 6V2.5L8 0Z" />
          </svg>
          TV
        </div>
      </div>

      {/* CSS for hiding scrollbar */}
      <style jsx>{`
        .timeframe-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ChartUI;
