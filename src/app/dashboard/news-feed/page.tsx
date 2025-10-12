// src/app/dashboard/news-feed/page.tsx - UPDATED VERSION
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { ArrowLeft } from "lucide-react";
import TokenSidebar from "@/components/dashboard/TokenSidebar";
import NewsChatPage from "@/components/NewsChatPage";
import { useNews } from "@/hooks/useNews";
import { useNewsFeedContext } from "@/app/dashboard/layout";

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
          width="22"
          height="22"
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
          width="22"
          height="22"
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
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: "#6b7280" }}
        />
      );
    }
  };

  return (
    <div className="rounded-[24px] border border-[#2C2C2C] p-4 hover:border-[#F7B410] transition-all duration-300 cursor-pointer group">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-6 h-full"
      >
        {image && (
          <div className="flex-shrink-0 w-[140px] rounded-[20px] overflow-hidden relative self-stretch">
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

        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-white text-[18px] font-saothsi leading-[1.4] line-clamp-2 group-hover:text-[#F7B410] transition-colors flex-1">
              {title}
            </h3>
          </div>

          <p className="text-[#F9EFD1] text-[13px] leading-[1.5] line-clamp-2 mt-2">
            {description}
          </p>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="text-[#fff] text-[12px] font-medium">
                By {author}
              </span>
              <span className="text-[#fff] text-[12px]">
                {formatDate(date)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {tickers.length > 0 && (
                <span className="text-[#999999] text-[11px]">
                  {tickers.slice(0, 3).join(", ")}
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

export default function NewsFeed() {
  const [showAIChat, setShowAIChat] = useState(false);
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

  // Use context from layout
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

  // Connect context handlers
  useEffect(() => {
    newsFeedContext.setSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    newsFeedContext.setOnSearch(() => search);
    newsFeedContext.setOnClearSearch(() => clearSearch);
    newsFeedContext.setOnAIClick(() => () => setShowAIChat(true));
  }, [search, clearSearch]);

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

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return "#2ECC71";
      case "negative":
        return "#E74C3C";
      default:
        return "#6b7280";
    }
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

        @keyframes slideInFromLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutToLeft {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(-100%);
            opacity: 0;
          }
        }

        .slide-in {
          animation: slideInFromLeft 0.3s ease-out forwards;
        }

        .slide-out {
          animation: slideOutToLeft 0.3s ease-out forwards;
        }
      `}</style>

      <div className="h-full bg-[#000000] rounded-[12px] lg:rounded-[14px] p-1.5 sm:p-2 lg:p-2.5 flex flex-col overflow-hidden relative">
        {/* Desktop Layout */}
        <div className="hidden xl:flex gap-3 flex-1 min-h-0 relative">
          <div className="flex-[0_0_60%] flex flex-col gap-3 min-w-0 max-h-full overflow-hidden">
            {/* Left side - News Feed */}
            <div className="w-full flex-1 h-full flex flex-col relative">
              <div className="flex-1 bg-black rounded-[14px] border border-[#2C2C2C] overflow-hidden flex flex-col">
                {/* Search query display */}
                {searchQuery && (
                  <div className="px-4 pt-4">
                    <p className="text-[#6b7280] text-[14px]">
                      Searching for:{" "}
                      <strong className="text-white">{searchQuery}</strong>
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-[10px]">
                    <p className="text-red-400 text-[14px]">{error}</p>
                  </div>
                )}

                {/* News Feed */}
                <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
                  {news.length === 0 && !loading && (
                    <div className="text-center py-10">
                      <p className="text-[#666666] text-[14px]">
                        {searchQuery
                          ? "No news found for your search"
                          : "No news available"}
                      </p>
                    </div>
                  )}

                  {news.map((article, index) => (
                    <div
                      key={article.news_url}
                      ref={
                        index === news.length - 1 ? lastNewsElementRef : null
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

                  {loading && (
                    <div className="text-center py-5">
                      <div className="inline-block w-6 h-6 border-2 border-[#F7B410] border-t-transparent rounded-full animate-spin" />
                      <p className="text-[#666666] text-[14px] mt-2">
                        Loading more news...
                      </p>
                    </div>
                  )}

                  {!hasMore && news.length > 0 && (
                    <div className="text-center py-5">
                      <p className="text-[#666666] text-[14px]">
                        No more news to load
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full flex-1 h-full flex">
            <TokenSidebar />
          </div>

          {/* AI Chat Overlay - Slides from left */}
          {showAIChat && (
            <div className="absolute inset-0 z-50 slide-in">
              <div className="h-full bg-[#000000] rounded-[14px] border border-[#2C2C2C] overflow-hidden flex flex-col">
                {/* Header with Back Button */}
                <div className="flex-shrink-0 bg-black border-b border-[#2C2C2C] p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAIChat(false)}
                      className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
                    >
                      <ArrowLeft size={20} className="text-[#E2AF19]" />
                    </button>
                    <div>
                      <h2 className="text-white text-xl font-mayeka font-bold">
                        News Chat
                      </h2>
                      <p className="text-[#999999] text-sm font-satoshi">
                        Ask about crypto news and insights
                      </p>
                    </div>
                  </div>
                </div>

                {/* News Chat Component */}
                <div className="flex-1 overflow-hidden">
                  <NewsChatPage />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Layout */}
        <div className="xl:hidden flex flex-col h-full">
          {/* News Feed - Mobile */}
          <div className="flex-1 bg-black rounded-[14px] border border-[#2C2C2C] overflow-hidden flex flex-col">
            {/* Search query display */}
            {searchQuery && (
              <div className="px-4 pt-4">
                <p className="text-[#6b7280] text-[14px]">
                  Searching for:{" "}
                  <strong className="text-white">{searchQuery}</strong>
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-[10px]">
                <p className="text-red-400 text-[14px]">{error}</p>
              </div>
            )}

            {/* News Feed */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
              {news.length === 0 && !loading && (
                <div className="text-center py-10">
                  <p className="text-[#666666] text-[14px]">
                    {searchQuery
                      ? "No news found for your search"
                      : "No news available"}
                  </p>
                </div>
              )}

              {news.map((article, index) => (
                <div
                  key={article.news_url}
                  ref={index === news.length - 1 ? lastNewsElementRef : null}
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

              {loading && (
                <div className="text-center py-5">
                  <div className="inline-block w-6 h-6 border-2 border-[#F7B410] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[#666666] text-[14px] mt-2">
                    Loading more news...
                  </p>
                </div>
              )}

              {!hasMore && news.length > 0 && (
                <div className="text-center py-5">
                  <p className="text-[#666666] text-[14px]">
                    No more news to load
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AI Chat Overlay - Mobile */}
          {showAIChat && (
            <div className="absolute inset-0 z-50 slide-in">
              <div className="h-full bg-[#000000] rounded-[14px] border border-[#2C2C2C] overflow-hidden flex flex-col">
                {/* Header with Back Button */}
                <div className="flex-shrink-0 bg-black border-b border-[#2C2C2C] p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAIChat(false)}
                      className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
                    >
                      <ArrowLeft size={20} className="text-[#E2AF19]" />
                    </button>
                    <div>
                      <h2 className="text-white text-xl font-mayeka font-bold">
                        News Chat
                      </h2>
                      <p className="text-[#999999] text-sm font-satoshi">
                        Ask about crypto news and insights
                      </p>
                    </div>
                  </div>
                </div>

                {/* News Chat Component */}
                <div className="flex-1 overflow-hidden">
                  <NewsChatPage />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
