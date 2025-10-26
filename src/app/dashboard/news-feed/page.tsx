// src/app/dashboard/news-feed/page.tsx - UPDATED: Navigate to separate News Chat page
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNews } from "@/hooks/useNews";
import { useNewsFeedContext } from "@/app/dashboard/layout";
import { useNewsFeedLoading } from "@/contexts/NewsFeedLoadingContext";
import BlockPalLoader from "@/components/ui/BlockPalLoader";

interface NewsCardProps {
  title: string;
  description: string;
  author: string;
  date: string;
  image: string | null;
  sentiment: string;
  tickers: string[];
  url: string;
}

const NewsCard = ({
  title,
  description,
  author,
  date,
  image,
  sentiment,
  tickers,
  url,
}: NewsCardProps) => {
  const formatDate = (dateString: string) => {
    const now = new Date();
    const articleDate = new Date(dateString);
    const diff = now.getTime() - articleDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    const sentimentLower = sentiment?.toLowerCase();

    if (sentimentLower === "positive") {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 md:w-[22px] md:h-[22px]"
          viewBox="0 0 30 30"
          fill="none"
        >
          <path
            d="M9.91666 18.9273C9.68707 18.9273 9.45749 18.8427 9.27624 18.6615C8.92582 18.3111 8.92582 17.7311 9.27624 17.3807L13.1429 13.514C13.3362 13.3207 13.59 13.224 13.8679 13.2482C14.1337 13.2723 14.3754 13.4173 14.5325 13.6469L15.8496 15.6286L20.1392 11.339C20.4896 10.9886 21.0696 10.9886 21.42 11.339C21.7704 11.6894 21.7704 12.2694 21.42 12.6198L16.345 17.6948C16.1517 17.8882 15.8979 17.9848 15.62 17.9607C15.3542 17.9365 15.1125 17.7915 14.9554 17.5619L13.6383 15.5802L10.5571 18.6615C10.3758 18.8427 10.1462 18.9273 9.91666 18.9273Z"
            fill="#2ECC71"
          />
          <path
            d="M20.7917 15.3014C20.2962 15.3014 19.8854 14.8906 19.8854 14.3952V12.8848H18.375C17.8796 12.8848 17.4688 12.4739 17.4688 11.9785C17.4688 11.4831 17.8796 11.0723 18.375 11.0723H20.7917C21.2871 11.0723 21.6979 11.4831 21.6979 11.9785V14.3952C21.6979 14.8906 21.2871 15.3014 20.7917 15.3014Z"
            fill="#2ECC71"
          />
          <path
            d="M18.9791 27.9889H11.7291C5.1679 27.9889 2.36456 25.1856 2.36456 18.6243V11.3743C2.36456 4.8131 5.1679 2.00977 11.7291 2.00977H18.9791C25.5404 2.00977 28.3437 4.8131 28.3437 11.3743V18.6243C28.3437 25.1856 25.5404 27.9889 18.9791 27.9889ZM11.7291 3.82227C6.15873 3.82227 4.17706 5.80393 4.17706 11.3743V18.6243C4.17706 24.1948 6.15873 26.1764 11.7291 26.1764H18.9791C24.5496 26.1764 26.5312 24.1948 26.5312 18.6243V11.3743C26.5312 5.80393 24.5496 3.82227 18.9791 3.82227H11.7291Z"
            fill="#2ECC71"
          />
        </svg>
      );
    } else if (sentimentLower === "negative") {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 md:w-[22px] md:h-[22px]"
          viewBox="0 0 30 30"
          fill="none"
        >
          <path
            d="M63.0833 18.9273C62.8537 18.9273 62.6241 18.8427 62.4429 18.6615L58.1533 14.3719L56.8362 16.3536C56.6912 16.5832 56.4375 16.7282 56.1716 16.7523C55.8937 16.7765 55.6279 16.6798 55.4466 16.4865L51.58 12.6198C51.2295 12.2694 51.2295 11.6894 51.58 11.339C51.9304 10.9886 52.5104 10.9886 52.8608 11.339L55.942 14.4202L57.2591 12.4386C57.4041 12.2211 57.6458 12.0761 57.9237 12.0398C58.2016 12.0157 58.4675 12.1123 58.6487 12.3057L63.7237 17.3807C64.0741 17.7311 64.0741 18.3111 63.7237 18.6615C63.5425 18.8427 63.3129 18.9273 63.0833 18.9273Z"
            fill="#E74C3C"
            transform="translate(-42, 0)"
          />
          <path
            d="M63.0834 18.9264H60.6667C60.1713 18.9264 59.7605 18.5156 59.7605 18.0202C59.7605 17.5248 60.1713 17.1139 60.6667 17.1139H62.1772V15.6035C62.1772 15.1081 62.588 14.6973 63.0834 14.6973C63.5788 14.6973 63.9897 15.1081 63.9897 15.6035V18.0202C63.9897 18.5156 63.5788 18.9264 63.0834 18.9264Z"
            fill="#E74C3C"
            transform="translate(-42, 0)"
          />
          <path
            d="M61.2708 27.9889H54.0208C47.4596 27.9889 44.6562 25.1856 44.6562 18.6243V11.3743C44.6562 4.8131 47.4596 2.00977 54.0208 2.00977H61.2708C67.8321 2.00977 70.6354 4.8131 70.6354 11.3743V18.6243C70.6354 25.1856 67.8321 27.9889 61.2708 27.9889ZM54.0208 3.82227C48.4504 3.82227 46.4687 5.80393 46.4687 11.3743V18.6243C46.4687 24.1948 48.4504 26.1764 54.0208 26.1764H61.2708C66.8412 26.1764 68.8229 24.1948 68.8229 18.6243V11.3743C68.8229 5.80393 66.8412 3.82227 61.2708 3.82227H54.0208Z"
            fill="#E74C3C"
            transform="translate(-42, 0)"
          />
        </svg>
      );
    } else {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 md:w-[22px] md:h-[22px]"
          viewBox="0 0 30 30"
          fill="none"
        >
          <path
            d="M10.5 15H19.5C20.0523 15 20.5 14.5523 20.5 14C20.5 13.4477 20.0523 13 19.5 13H10.5C9.94772 13 9.5 13.4477 9.5 14C9.5 14.5523 9.94772 15 10.5 15Z"
            fill="#95A5A6"
          />
          <path
            d="M10.5 17H19.5C20.0523 17 20.5 16.5523 20.5 16C20.5 15.4477 20.0523 15 19.5 15H10.5C9.94772 15 9.5 15.4477 9.5 16C9.5 16.5523 9.94772 17 10.5 17Z"
            fill="#95A5A6"
          />
          <path
            d="M18.9791 27.9889H11.7291C5.1679 27.9889 2.36456 25.1856 2.36456 18.6243V11.3743C2.36456 4.8131 5.1679 2.00977 11.7291 2.00977H18.9791C25.5404 2.00977 28.3437 4.8131 28.3437 11.3743V18.6243C28.3437 25.1856 25.5404 27.9889 18.9791 27.9889ZM11.7291 3.82227C6.15873 3.82227 4.17706 5.80393 4.17706 11.3743V18.6243C4.17706 24.1948 6.15873 26.1764 11.7291 26.1764H18.9791C24.5496 26.1764 26.5312 24.1948 26.5312 18.6243V11.3743C26.5312 5.80393 24.5496 3.82227 18.9791 3.82227H11.7291Z"
            fill="#95A5A6"
          />
        </svg>
      );
    }
  };

  return (
    <div className="rounded-[16px] md:rounded-[24px] border border-[#2C2C2C] p-3 md:p-4 hover:border-[#F7B410] transition-all duration-300 cursor-pointer group h-auto md:h-[180px]">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col md:flex-row gap-3 md:gap-6 h-full"
      >
        {image && (
          <div className="flex-shrink-0 w-full h-[160px] md:w-[140px] md:h-full rounded-[12px] md:rounded-[20px] overflow-hidden relative">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col justify-between min-w-0 h-full">
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-white text-[16px] md:text-[18px] font-saothsi leading-[1.4] line-clamp-2 md:line-clamp-2 group-hover:text-[#F7B410] transition-colors">
              {title}
            </h3>

            <p className="text-[#F9EFD1] text-[12px] md:text-[13px] leading-[1.5] line-clamp-2 md:line-clamp-3 mt-1.5 md:mt-2">
              {description}
            </p>
          </div>

          <div className="flex items-center justify-between flex-shrink-0 pt-2 md:pt-2">
            <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
              <span className="text-[#fff] text-[9px] md:text-[10px] font-medium truncate">
                By {author}
              </span>
              <span className="text-[#F9EFD1] text-[9px] md:text-[10px] flex-shrink-0">
                {formatDate(date)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0 ml-2">
              {tickers.length > 0 && (
                <span className="text-[#999999] text-[10px] md:text-[11px] truncate max-w-[60px] md:max-w-[100px]">
                  {tickers.slice(0, 2).join(", ")}
                </span>
              )}
              {getSentimentIcon(sentiment)}
            </div>
          </div>
        </div>
      </a>
    </div>
  );
};

function NewsFeedContent() {
  const router = useRouter();

  const getCachedNews = useCallback(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = sessionStorage.getItem("newsFeedCache");
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        const cacheAge = now - (data.timestamp || 0);
        if (cacheAge < 5 * 60 * 1000 && data.news) {
          console.log("✅ Loading cached news:", data.news.length);
          return data.news;
        }
      }
    } catch (e) {
      console.error("Error loading cached news:", e);
    }
    return [];
  }, []);

  const [displayNews, setDisplayNews] = useState(() => getCachedNews());
  const [localNewsSearch, setLocalNewsSearch] = useState("");

  const {
    news,
    trending,
    loading,
    error,
    hasMore,
    fetchMore,
    search,
    clearSearch,
    searchQuery,
  } = useNews();

  const { setDataReady } = useNewsFeedLoading();
  const hasReportedDataRef = useRef(false);

  const newsFeedContext = useNewsFeedContext();

  const observerRef = useRef<IntersectionObserver>();
  const lastNewsElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchMore();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, fetchMore]
  );

  useEffect(() => {
    if (news.length > 0) {
      console.log("📰 Fresh news received, updating display:", news.length);
      setDisplayNews(news);
    } else if (!loading && displayNews.length === 0) {
      const cached = getCachedNews();
      if (cached.length > 0) {
        console.log("📰 Using cached news as fallback:", cached.length);
        setDisplayNews(cached);
      }
    }
  }, [news, loading, displayNews.length, getCachedNews]);

  useEffect(() => {
    if (displayNews.length > 0) {
      try {
        sessionStorage.setItem(
          "newsFeedCache",
          JSON.stringify({
            news: displayNews,
            timestamp: Date.now(),
          })
        );
        console.log("✅ Cache updated via displayNews");
      } catch (e) {
        console.error("Error caching news:", e);
      }
    }
  }, [displayNews]);

  useEffect(() => {
    const hasCachedData = displayNews.length > 0;

    if (!hasReportedDataRef.current) {
      if (hasCachedData) {
        console.log(
          "✅ NewsFeed: Using cached data, marking ready immediately"
        );
        setDataReady();
        hasReportedDataRef.current = true;
      } else if (news.length > 0 || (!loading && news.length === 0) || error) {
        console.log("✅ NewsFeed: Fresh data loaded, marking ready", {
          newsCount: news.length,
          loading,
          error: !!error,
        });
        setDataReady();
        hasReportedDataRef.current = true;
      }
    }
  }, [displayNews.length, news.length, loading, error, setDataReady]);

  useEffect(() => {
    if (displayNews.length > 0 && !hasReportedDataRef.current) {
      console.log("✅ NewsFeed: Cache exists on mount, marking ready");
      setDataReady();
      hasReportedDataRef.current = true;
    }
  }, []);

  useEffect(() => {
    newsFeedContext.setSearchQuery(searchQuery);
    setLocalNewsSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    newsFeedContext.setOnSearch(() => search);
    newsFeedContext.setOnClearSearch(() => clearSearch);
    // Navigate to separate News Chat page
    newsFeedContext.setOnAIClick(() => () => {
      router.push("/dashboard/news-chat");
    });
  }, [search, clearSearch, router]);

  const handleNewsSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localNewsSearch.trim()) {
      search(localNewsSearch.trim());
    }
  };

  const handleClearSearch = () => {
    setLocalNewsSearch("");
    clearSearch();
  };

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="h-full bg-[#000000] rounded-[10px] md:rounded-[12px] lg:rounded-[14px] p-1 sm:p-1.5 md:p-2 lg:p-2.5 flex flex-col overflow-hidden relative pb-0 lg:pb-auto">
        {/* Mobile Search Bar */}
        <form
          onSubmit={handleNewsSearchSubmit}
          className="lg:hidden mb-3 flex gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search crypto news..."
              value={localNewsSearch}
              onChange={(e) => setLocalNewsSearch(e.target.value)}
              className="w-full border border-[#2C2C2C] rounded-[10px] px-4 py-3 pl-10 pr-10 text-white text-[14px] placeholder:text-[#666666] focus:outline-none focus:border-[#F7B410] transition-colors bg-black"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#2C2C2C] rounded-full transition-colors"
                title="Clear search"
              >
                <X size={16} className="text-[#666666] hover:text-[#F7B410]" />
              </button>
            )}
          </div>

          {/* AI Button - Navigate to News Chat page */}
          <button
            type="button"
            onClick={() => router.push("/dashboard/news-chat")}
            className="px-4 py-3 border border-[#2C2C2C] rounded-[10px] text-white text-[14px] font-medium bg-[#F7B410] hover:from-[#D4A853] hover:to-[#E2AF19] transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 29 29"
              fill="none"
            >
              <path
                d="M8.04157 4.81315C7.3544 4.81295 6.67954 4.99549 6.08616 5.34206C5.49279 5.68862 5.00224 6.18674 4.66481 6.78536C4.32738 7.38398 4.15521 8.06156 4.16594 8.74865C4.17667 9.43573 4.36991 10.1076 4.72587 10.6954C3.84177 10.8662 3.04473 11.3395 2.47159 12.034C1.89844 12.7285 1.58496 13.6009 1.58496 14.5013C1.58496 15.4017 1.89844 16.2741 2.47159 16.9686C3.04473 17.6631 3.84177 18.1364 4.72587 18.3072M8.04157 4.81315C8.04157 3.95672 8.38179 3.13537 8.98737 2.52979C9.59296 1.9242 10.4143 1.58398 11.2707 1.58398C12.1272 1.58398 12.9485 1.9242 13.5541 2.52979C14.1597 3.13537 14.4999 3.95672 14.4999 4.81315M8.04157 4.81315C8.04157 5.86973 8.5492 6.80748 9.33324 7.39648M4.72587 18.3072C4.37024 18.895 4.17726 19.5667 4.16671 20.2536C4.15615 20.9405 4.32838 21.6178 4.66577 22.2163C5.00316 22.8147 5.49358 23.3126 6.08677 23.6591C6.67996 24.0056 7.3546 24.1882 8.04157 24.1882C8.04157 25.0446 8.38179 25.8659 8.98737 26.4715C9.59296 27.0771 10.4143 27.4173 11.2707 27.4173C12.1272 27.4173 12.9485 27.0771 13.5541 26.4715C14.1597 25.8659 14.4999 25.0446 14.4999 24.1882M4.72587 18.3072C5.18942 17.5398 5.90473 16.9569 6.74991 16.6577M14.4999 4.81315V24.1882M14.4999 4.81315C14.4999 3.95672 14.8401 3.13537 15.4457 2.52979C16.0513 1.9242 16.8726 1.58398 17.7291 1.58398C18.5855 1.58398 19.4069 1.9242 20.0124 2.52979C20.618 3.13537 20.9582 3.95672 20.9582 4.81315C21.6452 4.81309 22.3199 4.99567 22.913 5.34216C23.5062 5.68866 23.9966 6.18663 24.334 6.78505C24.6714 7.38346 24.8437 8.06082 24.8331 8.74771C24.8226 9.43461 24.6296 10.1063 24.2739 10.6941M14.4999 24.1882C14.4999 25.0446 14.8401 25.8659 15.4457 26.4715C16.0513 27.0771 16.8726 27.4173 17.7291 27.4173C18.5855 27.4173 19.4069 27.0771 20.0124 26.4715C20.618 25.8659 20.9582 25.0446 20.9582 24.1882M20.9582 24.1882C21.6454 24.1883 22.3203 24.0058 22.9136 23.6592C23.507 23.3127 23.9976 22.8146 24.335 22.2159C24.6724 21.6173 24.8446 20.9397 24.8339 20.2527C24.8231 19.5656 24.6299 18.8937 24.2739 18.3059C25.158 18.1351 25.9551 17.6618 26.5282 16.9673C27.1014 16.2728 27.4149 15.4005 27.4149 14.5C27.4149 13.5996 27.1014 12.7272 26.5282 12.0327C25.9551 11.3382 25.158 10.8649 24.2739 10.6941M20.9582 24.1882C20.9582 23.1316 20.4506 22.1938 19.6666 21.6048M24.2739 10.6941C23.8104 11.4615 23.0951 12.0445 22.2499 12.3436"
                stroke="black"
                strokeWidth="1.9375"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>

        <div className="flex gap-2 md:gap-3 flex-1 min-h-0 relative">
          <div className="flex-1 w-full flex flex-col gap-2 md:gap-3 min-w-0 max-h-full overflow-hidden">
            <div className="w-full flex-1 h-full flex flex-col relative">
              <div className="flex-1 bg-black rounded-[10px] md:rounded-[14px] overflow-hidden flex flex-col">
                {searchQuery && (
                  <div className="px-3 md:px-4 pt-3 md:pt-4">
                    <p className="text-[#6b7280] text-[12px] md:text-[14px]">
                      Searching for:{" "}
                      <strong className="text-white">{searchQuery}</strong>
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mx-3 md:mx-4 mt-3 md:mt-4 p-2.5 md:p-3 bg-red-500/10 border border-red-500/20 rounded-[8px] md:rounded-[10px]">
                    <p className="text-red-400 text-[12px] md:text-[14px]">
                      {error}
                    </p>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto scrollbar-hide p-1.5 md:p-2 space-y-2 md:space-y-3">
                  {displayNews.length === 0 && !loading && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-[#666666] text-[12px] md:text-[14px]">
                        {searchQuery
                          ? "No news found for your search"
                          : "No news available"}
                      </p>
                    </div>
                  )}

                  {displayNews.map((article, index) => (
                    <div
                      key={article.news_url}
                      ref={
                        index === displayNews.length - 1
                          ? lastNewsElementRef
                          : null
                      }
                    >
                      <NewsCard
                        title={article.title}
                        description={article.text}
                        author={article.source_name}
                        date={article.date}
                        image={article.image_url}
                        sentiment={article.sentiment}
                        tickers={article.tickers}
                        url={article.news_url}
                      />
                    </div>
                  ))}

                  {!hasMore && displayNews.length > 0 && (
                    <div className="text-center py-4 md:py-5">
                      <p className="text-[#666666] text-[12px] md:text-[14px]">
                        No more news to load
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function NewsFeed() {
  const { isLoading } = useNewsFeedLoading();

  return (
    <>
      {isLoading && <BlockPalLoader loadingText="Loading MarketPulse" />}

      <div
        className={`h-full transition-opacity duration-300 ${
          isLoading ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <NewsFeedContent />
      </div>
    </>
  );
}
