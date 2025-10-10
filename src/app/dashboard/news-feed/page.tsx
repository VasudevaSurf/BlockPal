// src/app/dashboard/news-feed/page.tsx
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import TokenSidebar from "@/components/dashboard/TokenSidebar";
import NewsChatPage from "@/components/NewsChatPage";
import { useNews } from "@/hooks/useNews";

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
              <div className="w-4 h-4 rounded-full bg-[#F7B410] flex items-center justify-center text-[10px] font-semibold text-black">
                {author.charAt(0)}
              </div>
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
                  🏷️ {tickers.slice(0, 3).join(", ")}
                </span>
              )}
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getSentimentColor(sentiment) }}
              />
            </div>
          </div>
        </div>
      </a>
    </div>
  );
};

export default function NewsFeed() {
  const [searchInput, setSearchInput] = useState("");
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      search(searchInput.trim());
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    clearSearch();
  };

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

      <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[14px] p-1.5 sm:p-2 lg:p-2.5 flex flex-col overflow-hidden relative">
        {/* Desktop Layout */}
        <div className="hidden xl:flex gap-3 flex-1 min-h-0 relative">
          <div className="flex-[0_0_60%] flex flex-col gap-3 min-w-0 max-h-full overflow-hidden">
            {/* Left side - News Feed */}
            <div className="w-full flex-1 h-full flex flex-col relative">
              <div className="flex-1 bg-black rounded-[14px] border border-[#2C2C2C] overflow-hidden flex flex-col">
                {/* Search Bar */}
                <div className="sticky top-0 z-10 bg-black p-4 pb-0">
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search crypto news..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full border border-[#2C2C2C] rounded-[10px] px-4 py-3 pl-10 text-white text-[14px] placeholder:text-[#666666] focus:outline-none focus:border-[#F7B410] transition-colors"
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
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-3 border border-[#2C2C2C] rounded-[10px] text-white text-[14px] font-medium bg-[#F7B410] hover:bg-[#E2A310] transition-colors"
                    >
                      Search
                    </button>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="px-4 py-3 border border-[#2C2C2C] rounded-[10px] text-[#999999] text-[14px] font-medium hover:border-[#F7B410] hover:text-[#F7B410] transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </form>

                  {searchQuery && (
                    <p className="text-[#6b7280] text-[14px] mt-2">
                      Searching for:{" "}
                      <strong className="text-white">{searchQuery}</strong>
                    </p>
                  )}
                </div>

                {/* Trending Section */}
                {!searchQuery && trending.length > 0 && (
                  <div className="px-4 py-3 border-b border-[#2C2C2C]">
                    <h2 className="text-white text-[16px] font-semibold mb-3">
                      🔥 Trending Now
                    </h2>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                      {trending.map((headline, index) => (
                        <div
                          key={headline.headline_id || index}
                          className="min-w-[300px] p-3 bg-[#1A1A1A] rounded-[12px] border border-[#2C2C2C] hover:border-[#F7B410] transition-colors cursor-pointer"
                        >
                          <h3 className="text-white text-[13px] font-medium leading-tight mb-2">
                            {headline.headline}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-[#666666]">
                              {formatDate(headline.date)}
                            </span>
                            <span
                              className="font-medium"
                              style={{
                                color: getSentimentColor(headline.sentiment),
                              }}
                            >
                              • {headline.sentiment}
                            </span>
                            {headline.tickers.length > 0 && (
                              <span className="text-[#999999]">
                                🏷️ {headline.tickers.slice(0, 2).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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

                {/* Floating AI Chat Button - Bottom Right */}
                <button
                  onClick={() => setShowAIChat(true)}
                  className="absolute bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-[#E2AF19] to-[#D4A853] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 z-20 group"
                >
                  <MessageCircle
                    size={24}
                    className="text-black group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                </button>
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
              <div className="h-full bg-[#0F0F0F] rounded-[14px] border border-[#2C2C2C] overflow-hidden flex flex-col">
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
